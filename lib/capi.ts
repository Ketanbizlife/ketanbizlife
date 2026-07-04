import { randomUUID } from "node:crypto";
import {
  normalizeCityForCapi,
  normalizeCountryForCapi,
  normalizePhoneForCapi,
  sha256Lower,
} from "./hash";
import type { CustomerPayload } from "./types";

const META_GRAPH_VERSION = "v25.0";

/**
 * Fire-and-forget POST to Meta Conversions API for a FREE webinar
 * registration. Sends the conversion as TWO events in a single HTTP call:
 *
 *  - args.standardEvent (e.g. "CompleteRegistration") — Meta standard event
 *    used by the optimization algorithm + AEM iOS auto-priority.
 *  - args.customEvent (e.g. "FreeWebinarRegistration") — internal
 *    source-of-truth label our media buyer team optimizes reports against.
 *
 * Both events share event_id (= leadId), event_source_url, user_data, and
 * custom_data. The matching event_id lets Meta dedupe against the browser
 * pixel events of the same id (48h window) and also dedupe an accidental
 * double-fire server-side.
 *
 * user_data carries six hashed PII fields (em, ph, fn, ln, ct, country) plus
 * external_id and four RAW server-context fields (fbc, fbp,
 * client_ip_address, client_user_agent). This combo is what pushes EMQ to
 * 9.5+/10 and keeps cost-per-result down.
 *
 * Callers gate this to the production brand domain (see lib/env.ts
 * isProductionHost) so localhost / preview URLs never pollute attribution.
 *
 * Spec ref: https://developers.facebook.com/docs/marketing-api/conversions-api
 */
export async function fireMetaCapiRegistration(args: {
  customer: CustomerPayload;
  /** Meta standard event token, e.g. "CompleteRegistration". */
  standardEvent: string;
  /** Internal custom event name, e.g. "FreeWebinarRegistration". */
  customEvent: string;
  /** UUID minted on the browser — shared event_id for the Meta dedup pair. */
  leadId: string;
  /** Page URL where the conversion originated. */
  eventSourceUrl: string;
  /** Optional category — sent as custom_data.kind when non-empty. */
  kind?: string;
  clientIp: string;
  clientUserAgent: string;
  fbc?: string;
  fbp?: string;
}): Promise<"ok" | "err" | "timeout" | "skipped"> {
  const pixelId = process.env.META_PIXEL_ID;
  const accessToken = process.env.META_CAPI_ACCESS_TOKEN;
  console.log(
    `[capi] fire start events=${args.standardEvent},${args.customEvent} leadId=${args.leadId} url=${args.eventSourceUrl} hasCreds=${Boolean(pixelId && accessToken)}`,
  );
  if (!pixelId || !accessToken) {
    console.warn(
      "[capi] META_PIXEL_ID or META_CAPI_ACCESS_TOKEN not set — skipping CAPI fire",
    );
    return "skipped";
  }

  const url = `https://graph.facebook.com/${META_GRAPH_VERSION}/${pixelId}/events?access_token=${accessToken}`;

  // ---- user_data: hashed PII + external_id + raw server-context fields ----
  // Short Meta codes (em, ph, fn, ln, ct, country, external_id). All hashed
  // values are SHA-256, lowercase hex. Normalization rules live in lib/hash.ts
  // and match client-side MAM (lib/analytics.ts buildHashedMatching) exactly,
  // so hashes are byte-identical across browser and server. external_id =
  // sha256(normalized email) gives Meta a stable cross-channel join key.
  const emailHash = sha256Lower(args.customer.email);
  const userData: Record<string, unknown> = {
    em: [emailHash],
    ph: [sha256Lower(normalizePhoneForCapi(args.customer.phone))],
    fn: [sha256Lower(args.customer.firstName)],
    ln: [sha256Lower(args.customer.lastName)],
    external_id: [emailHash],
  };
  if (args.customer.city) {
    const normalizedCity = normalizeCityForCapi(args.customer.city);
    if (normalizedCity) userData.ct = [sha256Lower(normalizedCity)];
  }
  if (args.customer.countryCode) {
    const normalizedCountry = normalizeCountryForCapi(args.customer.countryCode);
    if (normalizedCountry) userData.country = [sha256Lower(normalizedCountry)];
  }
  // Server-context fields are sent RAW (Meta uses them as matching signals —
  // hashing them would break matching).
  if (args.fbc) userData.fbc = args.fbc;
  if (args.fbp) userData.fbp = args.fbp;
  if (args.clientUserAgent) userData.client_user_agent = args.clientUserAgent;
  if (args.clientIp) userData.client_ip_address = args.clientIp;

  // ---- custom_data: shared between both events (no monetary value — free) ----
  const customData: Record<string, unknown> = {};
  if (args.kind) customData.kind = args.kind;
  customData.lead_id = args.leadId;

  // ---- Shared event body ----
  const eventTime = Math.floor(Date.now() / 1000);
  const eventId = args.leadId || randomUUID();
  const sharedBody = {
    event_time: eventTime,
    event_id: eventId,
    event_source_url: args.eventSourceUrl,
    action_source: "website" as const,
    user_data: userData,
    ...(Object.keys(customData).length > 0 ? { custom_data: customData } : {}),
  };

  const payload = {
    data: [
      { event_name: args.standardEvent, ...sharedBody },
      { event_name: args.customEvent, ...sharedBody },
    ],
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "<no body>");
      console.warn(
        `[capi] Meta returned ${res.status} for lead ${args.leadId}: ${text}`,
      );
      return "err";
    }
    const respBody = await res.text().catch(() => "<no body>");
    console.log(
      `[capi] Meta CAPI OK ${res.status} for lead ${args.leadId} resp=${respBody.slice(0, 200)}`,
    );
    return "ok";
  } catch (err) {
    console.warn(
      `[capi] Meta CAPI fire failed for lead ${args.leadId}:`,
      err instanceof Error ? err.message : err,
    );
    if (err instanceof Error && err.name === "AbortError") return "timeout";
    return "err";
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Fire-and-forget Meta CAPI for a PAID OTO purchase. Sends two events sharing
 * event_id (= cf_payment_id): a standard "Purchase" (Meta optimization + iOS
 * auto-priority) and a custom event (internal reporting label). Carries the
 * monetary value + currency in custom_data. user_data mirrors the registration
 * fire (hashed PII + external_id + raw fbc/fbp/ip/ua) for 9.5+/10 EMQ.
 *
 * Gated by the caller to production Cashfree mode + amount > ₹1 (see the
 * Cashfree webhook route) so sandbox/test charges never pollute attribution.
 */
export async function fireMetaCapiPurchase(args: {
  customer: CustomerPayload;
  /** Meta standard event token, e.g. "Purchase". */
  standardEvent: string;
  /** Internal custom event name, e.g. "OTOPurchase". */
  customEvent: string;
  value: number;
  currency: string;
  /** cf_payment_id — shared event_id for the Meta dedup pair. */
  paymentId: string;
  eventSourceUrl: string;
  kind?: string;
  clientIp: string;
  clientUserAgent: string;
  fbc?: string;
  fbp?: string;
}): Promise<"ok" | "err" | "timeout" | "skipped"> {
  const pixelId = process.env.META_PIXEL_ID;
  const accessToken = process.env.META_CAPI_ACCESS_TOKEN;
  console.log(
    `[capi] purchase fire start events=${args.standardEvent},${args.customEvent} paymentId=${args.paymentId} value=${args.value} hasCreds=${Boolean(pixelId && accessToken)}`,
  );
  if (!pixelId || !accessToken) {
    console.warn(
      "[capi] META_PIXEL_ID or META_CAPI_ACCESS_TOKEN not set — skipping CAPI fire",
    );
    return "skipped";
  }

  const url = `https://graph.facebook.com/${META_GRAPH_VERSION}/${pixelId}/events?access_token=${accessToken}`;

  const emailHash = sha256Lower(args.customer.email);
  const userData: Record<string, unknown> = {
    em: [emailHash],
    ph: [sha256Lower(normalizePhoneForCapi(args.customer.phone))],
    fn: [sha256Lower(args.customer.firstName)],
    ln: [sha256Lower(args.customer.lastName)],
    external_id: [emailHash],
  };
  if (args.customer.city) {
    const normalizedCity = normalizeCityForCapi(args.customer.city);
    if (normalizedCity) userData.ct = [sha256Lower(normalizedCity)];
  }
  if (args.customer.countryCode) {
    const normalizedCountry = normalizeCountryForCapi(args.customer.countryCode);
    if (normalizedCountry) userData.country = [sha256Lower(normalizedCountry)];
  }
  if (args.fbc) userData.fbc = args.fbc;
  if (args.fbp) userData.fbp = args.fbp;
  if (args.clientUserAgent) userData.client_user_agent = args.clientUserAgent;
  if (args.clientIp) userData.client_ip_address = args.clientIp;

  const customData: Record<string, unknown> = {};
  if (args.currency) customData.currency = args.currency;
  if (args.value) customData.value = args.value;
  if (args.kind) customData.kind = args.kind;
  if (args.paymentId) customData.payment_id = args.paymentId;

  const eventTime = Math.floor(Date.now() / 1000);
  const eventId = args.paymentId || randomUUID();
  const sharedBody = {
    event_time: eventTime,
    event_id: eventId,
    event_source_url: args.eventSourceUrl,
    action_source: "website" as const,
    user_data: userData,
    ...(Object.keys(customData).length > 0 ? { custom_data: customData } : {}),
  };

  const payload = {
    data: [
      { event_name: args.standardEvent, ...sharedBody },
      { event_name: args.customEvent, ...sharedBody },
    ],
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "<no body>");
      console.warn(
        `[capi] Meta returned ${res.status} for purchase ${args.paymentId}: ${text}`,
      );
      return "err";
    }
    const respBody = await res.text().catch(() => "<no body>");
    console.log(
      `[capi] Meta CAPI purchase OK ${res.status} for ${args.paymentId} resp=${respBody.slice(0, 200)}`,
    );
    return "ok";
  } catch (err) {
    console.warn(
      `[capi] Meta CAPI purchase failed for ${args.paymentId}:`,
      err instanceof Error ? err.message : err,
    );
    if (err instanceof Error && err.name === "AbortError") return "timeout";
    return "err";
  } finally {
    clearTimeout(timeoutId);
  }
}
