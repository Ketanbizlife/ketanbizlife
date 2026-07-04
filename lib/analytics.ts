"use client";

import { clientConfig } from "@/client.config";

declare global {
  interface Window {
    fbq?: (command: string, ...args: unknown[]) => void;
  }
}

/**
 * Cookie name for the persistent Manual Advanced Matching values.
 * Read by the inline pixel script in app/layout.tsx BEFORE the first
 * PageView fires, so cold visitors who previously filled the form land
 * with full hashed identity attached to their PageView.
 *
 * 30-day TTL aligns with Meta's typical attribution windows. SameSite=Lax
 * is safe — we never read this cookie cross-site.
 */
const MAM_COOKIE_NAME = "kbl_mam";
const MAM_COOKIE_TTL_SECONDS = 30 * 24 * 60 * 60;

export interface AdvancedMatchingData {
  email?: string;
  /** Phone with or without country code/dial code; will be normalized to digits. */
  phone?: string;
  firstName?: string;
  lastName?: string;
  city?: string;
  /** 2-letter ISO 3166-1 alpha-2 country code (e.g. "IN"). */
  country?: string;
}

/**
 * SHA-256 → lowercase hex via the Web Crypto API. Available in all modern
 * browsers over HTTPS and on http://localhost. Pre-hashing client-side lets
 * us safely persist matching values to a first-party cookie without ever
 * storing raw PII. Meta's pixel JS detects 64-char hex strings as
 * already-hashed and uses them verbatim — no double-hashing happens.
 *
 * Falls back to the raw input only if SubtleCrypto isn't available (very
 * old browser); fbq still accepts the raw value and hashes it itself.
 */
async function sha256Hex(value: string): Promise<string> {
  if (typeof crypto === "undefined" || !crypto.subtle) return value;
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Normalize per Meta's spec, then SHA-256 each field, then derive
 * external_id from the email hash. Returns a matching object ready for
 * fbq init AND for persistence to the kbl_mam cookie.
 *
 * Normalization rules MUST mirror lib/hash.ts (server-side CAPI) so the
 * resulting hashes are byte-identical for the same user across browser
 * and server — Meta uses that match to confidently de-dupe and join.
 */
async function buildHashedMatching(
  data: AdvancedMatchingData,
): Promise<Record<string, string>> {
  const normalized: Record<string, string> = {};

  if (data.email) {
    const em = data.email.trim().toLowerCase();
    if (em) normalized.em = em;
  }
  if (data.phone) {
    const ph = data.phone.replace(/\D/g, "");
    if (ph) normalized.ph = ph;
  }
  if (data.firstName) {
    const fn = data.firstName.trim().toLowerCase();
    if (fn) normalized.fn = fn;
  }
  if (data.lastName) {
    const ln = data.lastName.trim().toLowerCase();
    if (ln) normalized.ln = ln;
  }
  if (data.city) {
    const ct = data.city.trim().toLowerCase().replace(/[^a-z]/g, "");
    if (ct) normalized.ct = ct;
  }
  if (data.country) {
    const country = data.country.trim().toLowerCase().slice(0, 2);
    if (country) normalized.country = country;
  }

  const keys = Object.keys(normalized);
  if (keys.length === 0) return {};

  const hashes = await Promise.all(keys.map((k) => sha256Hex(normalized[k]!)));
  const matching: Record<string, string> = {};
  keys.forEach((k, i) => {
    matching[k] = hashes[i]!;
  });

  // external_id: stable per-user identifier per Meta's spec
  // (developers.facebook.com → External ID). MUST be CONSISTENT across
  // browser MAM and server CAPI for the same user — same hash value
  // gives Meta a deterministic cross-channel join key, boosting EMQ
  // ~21% per their dataset suggestions panel.
  //
  // Using sha256(normalized_email) gives us:
  //   - Stability: same user → same external_id across sessions/devices
  //   - Consistency: server CAPI computes the identical value
  //   - Privacy: no plaintext PII stored anywhere
  if (matching.em) {
    matching.external_id = matching.em;
  }

  return matching;
}

function writeMamCookie(matching: Record<string, string>): void {
  if (typeof document === "undefined") return;
  if (Object.keys(matching).length === 0) return;
  const value = encodeURIComponent(JSON.stringify(matching));
  document.cookie =
    `${MAM_COOKIE_NAME}=${value}; Path=/; Max-Age=${MAM_COOKIE_TTL_SECONDS}; SameSite=Lax`;
}

/**
 * Read and parse the kbl_mam cookie. Returns null if the cookie is absent
 * or malformed (defensive — never throws).
 */
export function readMamCookie(): Record<string, string> | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(
    new RegExp(`(?:^|;\\s*)${MAM_COOKIE_NAME}=([^;]+)`),
  );
  if (!match || !match[1]) return null;
  try {
    const parsed = JSON.parse(decodeURIComponent(match[1])) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, string>;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Manual Advanced Matching (MAM) for the Meta Pixel.
 *
 * Pre-hashes buyer identity client-side via Web Crypto, calls
 * `fbq('init', PIXEL_ID, matchingObject)` with the hashed values, and
 * persists them to the kbl_mam cookie (30-day TTL). All subsequent
 * pixel events (PageView on this page, PageView on /thank-you after
 * router.push, and the trackPurchasePixel call) inherit the matching
 * signals — EMQ jumps from ~5/10 to 9+/10.
 *
 * AWAIT this call before firing trackPurchasePixel or navigating away,
 * so the fbq init queue is flushed before the next event ships. Web
 * Crypto hashing is microseconds — the await is imperceptible.
 *
 * Call from three places per the reference pattern:
 *   1. Form-fill useEffect (earliest moment we know identity; sets cookie)
 *   2. Payment success handler (refresh with latest values right before redirect)
 *   3. /thank-you mount via reapplyMamFromCookie() (safety net)
 *
 * Gating: this helper no-ops on localhost / vercel.app preview URLs
 * because window.fbq is only defined when our gated pixel init script
 * in app/layout.tsx has run (which only runs on the production brand
 * domain). No extra host check needed here.
 */
export async function setMetaAdvancedMatching(
  data: AdvancedMatchingData,
): Promise<void> {
  if (typeof window === "undefined") return;
  if (typeof window.fbq !== "function") return;

  const pixelId = clientConfig.analytics.metaPixelId;
  if (!pixelId) return;

  const matching = await buildHashedMatching(data);
  if (Object.keys(matching).length === 0) return;

  // Pass PRE-HASHED hex values (64-char) — Meta detects these as already
  // hashed and uses them verbatim. NEVER hash a second time on the
  // browser; would break matching.
  window.fbq("init", pixelId, matching);
  writeMamCookie(matching);
}

/**
 * Re-fire MAM from the persisted cookie. Used on /thank-you mount as a
 * safety net in case the inline pixel script in app/layout.tsx happened
 * to race the route change OR the form-fill MAM call didn't complete
 * before the redirect went out. fbq init is idempotent, so calling it
 * again with the same hashed matching is a no-op for Meta's side.
 */
export function reapplyMamFromCookie(): void {
  if (typeof window === "undefined") return;
  if (typeof window.fbq !== "function") return;

  const pixelId = clientConfig.analytics.metaPixelId;
  if (!pixelId) return;

  const matching = readMamCookie();
  if (!matching || Object.keys(matching).length === 0) return;

  window.fbq("init", pixelId, matching);
}

/**
 * Fire the Meta Pixel registration events from the browser, paired with the
 * server CAPI events of the same event_id (= leadId) for Meta's dedup window
 * (48h). Fires BOTH:
 *   - the standard event (e.g. "CompleteRegistration") via fbq('track')
 *   - the custom event (e.g. "FreeWebinarRegistration") via fbq('trackCustom')
 *
 * Per Meta dedup spec, browser eventID must equal server event_id and the
 * event_name must match exactly, within a 48-hour window.
 *
 * Call this AFTER awaiting setMetaAdvancedMatching so both events inherit the
 * hashed identity (em, ph, fn, ln, ct, country, external_id) for 9.5+/10 EMQ
 * on the browser side too.
 *
 * The webinar is free, so no monetary value is sent. fbq is only defined on
 * the production brand domain (gated init in app/layout.tsx), so this is a
 * no-op on localhost / preview URLs — mirroring the server CAPI host gate.
 */
export function trackRegistrationPixel(params: {
  /** Used as eventID — MUST equal the server event_id (leadId). */
  leadId: string;
  /** Meta standard event token, e.g. "CompleteRegistration". */
  standardEvent: string;
  /** Internal custom event name, e.g. "FreeWebinarRegistration". */
  customEvent: string;
  /** Display label in Events Manager. */
  contentName?: string;
}): void {
  if (typeof window === "undefined") return;
  if (typeof window.fbq !== "function") return;

  const contentName =
    params.contentName ?? `${clientConfig.brand.name} Free Webinar`;

  window.fbq(
    "track",
    params.standardEvent,
    { content_name: contentName },
    { eventID: params.leadId },
  );
  window.fbq(
    "trackCustom",
    params.customEvent,
    { content_name: contentName },
    { eventID: params.leadId },
  );
}

/**
 * Fire the Meta Pixel PAID purchase events from the browser for the OTO
 * checkout, paired with the server CAPI Purchase (same event_id =
 * cf_payment_id) for Meta's 48h dedup window. Fires the standard "Purchase"
 * via fbq('track') plus the custom event via fbq('trackCustom').
 *
 * Call AFTER awaiting setMetaAdvancedMatching and ONLY from the paid-success
 * path, mirroring the server CAPI mode + amount gates. fbq is only defined on
 * the production brand domain, so this no-ops on localhost / preview URLs.
 */
export function trackPurchasePixel(params: {
  /** Used as eventID — MUST equal the server event_id (cf_payment_id). */
  paymentId: string;
  /** Numeric, major units (rupees). Same value as CAPI. */
  value: number;
  /** Meta standard event token, e.g. "Purchase". */
  standardEvent: string;
  /** Internal custom event name, e.g. "OTOPurchase". */
  customEvent: string;
  currency?: string;
  contentName?: string;
}): void {
  if (typeof window === "undefined") return;
  if (typeof window.fbq !== "function") return;

  const currency = params.currency ?? clientConfig.brand.currency ?? "INR";
  const contentName =
    params.contentName ?? `${clientConfig.brand.name} Export Toolkit`;

  window.fbq(
    "track",
    params.standardEvent,
    { value: params.value, currency, content_name: contentName },
    { eventID: params.paymentId },
  );
  window.fbq(
    "trackCustom",
    params.customEvent,
    { value: params.value, currency, content_name: contentName },
    { eventID: params.paymentId },
  );
}
