import { sha256Lower } from "./hash";
import type { CustomerPayload, UtmPayload } from "./types";

export interface PabblyBumpItem {
  id: string;
  title: string;
  price: number;
}

/** Max number of flat bump_N_* slots emitted in the OTO purchase payload. */
const MAX_BUMP_SLOTS = 4;

/**
 * Meta's `_fbc` cookie is formatted `fb.{subdomainIndex}.{creationTime}.{fbclid}`.
 * The raw fbclid is everything after the third dot. Returns "" when fbc is
 * absent or malformed. The fbclid itself can legitimately contain dots, so we
 * rejoin the tail rather than taking a single segment.
 */
function deriveFbclidFromFbc(fbc: string): string {
  if (!fbc) return "";
  const parts = fbc.split(".");
  if (parts.length < 4 || parts[0] !== "fb") return "";
  return parts.slice(3).join(".");
}

/**
 * Fire-and-forget POST to the Pabbly Connect webhook for a FREE registration.
 * Failures are logged but never surfaced to the user — the /thank-you redirect
 * is not gated on this.
 *
 * The webinar is free, so there is no payment: the lead-form submission itself
 * is the conversion. `leadId` is a UUID minted on the browser (also used as the
 * Meta CAPI event_id) so every downstream system keys off the same unique id.
 */
export async function firePabblyWebhook(args: {
  customer: CustomerPayload;
  utm: UtmPayload;
  /** Unique per-submission id (UUID). Also the Meta CAPI event_id. */
  leadId: string;
  currency: string;
  timezone: string;
  /** Which server path fired this row. Currently always /api/register. */
  source: "register";
  /** Meta standard event fired for this lead (e.g. "CompleteRegistration"). */
  standardEvent: string;
  /** Meta custom event fired for this lead (e.g. "FreeWebinarRegistration"). */
  customEvent: string;
  /** True iff a CAPI fire was attempted for this lead (false when gated off). */
  capiAttempted: boolean;
  /** Result code from fireMetaCapiRegistration. "skipped" when gated. */
  capiOutcome: "ok" | "err" | "timeout" | "skipped";
  /** Human-readable reason CAPI didn't reach Meta. Empty when outcome === "ok". */
  capiSkipReason: string;
  // ---- CAPI downstream-feedback enrichment ----
  /** Raw `_fbc` cookie value, or "" when absent. */
  fbc: string;
  /** Raw `_fbp` cookie value, or "" when absent. */
  fbp: string;
  /** Client IP captured from x-forwarded-for. */
  clientIpAddress: string;
  /** Client User-Agent captured at submit time. */
  clientUserAgent: string;
  /** Canonical conversion page URL. */
  eventSourceUrl: string;
  /** True for non-production hosts (localhost / preview); drives is_test. */
  isTest: boolean;
}): Promise<void> {
  const url = process.env.PABBLY_WEBHOOK_URL;
  console.log(
    `[pabbly] fire start leadId=${args.leadId} email=${args.customer.email} hasUrl=${Boolean(url)}`,
  );
  if (!url) {
    console.warn("[pabbly] PABBLY_WEBHOOK_URL not set — skipping webhook fire");
    return;
  }

  const now = new Date();
  const dateFormatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: args.timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const timeFormatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: args.timezone,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const fullName = [args.customer.firstName, args.customer.lastName]
    .filter(Boolean)
    .join(" ");

  const payload = {
    first_name: args.customer.firstName,
    last_name: args.customer.lastName,
    full_name: fullName,
    email: args.customer.email,
    phone: args.customer.phone,
    city: args.customer.city,
    country_code: args.customer.countryCode,
    // Unique per-submission id. Replaces the old payment_id. Emitted under
    // multiple aliases so downstream automations can key off whichever they
    // already reference.
    lead_id: args.leadId,
    registration_event_id: args.leadId,
    currency: args.currency,
    amount: "0",
    registration_date: dateFormatter.format(now),
    registration_time: timeFormatter.format(now),
    registration_timestamp: now.toISOString(),
    created_at: now.toISOString(),
    utm_source: args.utm.utm_source ?? "",
    utm_medium: args.utm.utm_medium ?? "",
    utm_campaign: args.utm.utm_campaign ?? "",
    utm_content: args.utm.utm_content ?? "",
    utm_term: args.utm.utm_term ?? "",
    // ---- CAPI downstream-feedback enrichment ----
    // Identity fields (fbc/fbp/ip/ua/external_id) give downstream CRM-fired
    // events high EMQ. external_id uses the same sha256(lowercase(email)) as
    // the server CAPI so the events match. fbclid is parsed out of _fbc.
    fbc: args.fbc,
    fbp: args.fbp,
    fbclid: deriveFbclidFromFbc(args.fbc),
    client_ip_address: args.clientIpAddress,
    client_user_agent: args.clientUserAgent,
    external_id: args.customer.email ? sha256Lower(args.customer.email) : "",
    event_source_url: args.eventSourceUrl,
    is_test: args.isTest ? "true" : "false",
    // Meta event names fired for this lead.
    standard_event: args.standardEvent,
    custom_event: args.customEvent,
    // ---- Diagnostic columns ----
    source: args.source,
    capi_attempted: args.capiAttempted ? "true" : "false",
    capi_outcome: args.capiOutcome,
    capi_skip_reason: args.capiSkipReason,
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
        `[pabbly] webhook returned ${res.status} for lead ${args.leadId}: ${text}`,
      );
    } else {
      console.log(
        `[pabbly] webhook OK ${res.status} for lead ${args.leadId}`,
      );
    }
  } catch (err) {
    console.warn(
      `[pabbly] webhook failed for lead ${args.leadId}:`,
      err instanceof Error ? err.message : err,
    );
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Fire-and-forget POST to Pabbly for a PAID OTO purchase. Separate from the
 * free-registration payload above: this one carries payment_id / order_id /
 * amount / selected-bump breakdown. `source: "oto"` lets the sheet tell OTO
 * purchases apart from free registrations.
 */
export async function firePabblyPurchase(args: {
  customer: CustomerPayload;
  utm: UtmPayload;
  paymentId: string;
  orderId: string;
  /** Grand total paid (bumps only — the OTO has no base), major units. */
  amount: number;
  bumpsTotal: number;
  /** Human-readable list of selected bumps, e.g. "Title A (₹199); Title B (₹199)". */
  bumps: string;
  bumpItems: PabblyBumpItem[];
  currency: string;
  timezone: string;
  source: "oto";
  capiAttempted: boolean;
  capiOutcome: "ok" | "err" | "timeout" | "skipped";
  capiSkipReason: string;
  fbc: string;
  fbp: string;
  clientIpAddress: string;
  clientUserAgent: string;
  eventSourceUrl: string;
  isTest: boolean;
}): Promise<void> {
  // Separate webhook from the free-registration one — the addons/OTO purchase
  // has its own Pabbly workflow (PABBLY_OTO_WEBHOOK_URL).
  const url = process.env.PABBLY_OTO_WEBHOOK_URL;
  console.log(
    `[pabbly] oto purchase fire start orderId=${args.orderId} amount=${args.amount} bumpItems=${args.bumpItems.length} hasUrl=${Boolean(url)}`,
  );
  if (!url) {
    console.warn(
      "[pabbly] PABBLY_OTO_WEBHOOK_URL not set — skipping OTO webhook fire",
    );
    return;
  }

  const now = new Date();
  const dateFormatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: args.timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const timeFormatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: args.timezone,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const fullName = [args.customer.firstName, args.customer.lastName]
    .filter(Boolean)
    .join(" ");

  const bumpIds = args.bumpItems.map((b) => b.id).join(",");
  const bumpTitles = args.bumpItems.map((b) => b.title).join("|");
  const bumpPrices = args.bumpItems.map((b) => String(b.price)).join("|");
  const bumpsJson = JSON.stringify(args.bumpItems);

  const flatSlots: Record<string, string> = {};
  for (let i = 0; i < MAX_BUMP_SLOTS; i += 1) {
    const item = args.bumpItems[i];
    const slot = i + 1;
    flatSlots[`bump_${slot}_id`] = item?.id ?? "";
    flatSlots[`bump_${slot}_title`] = item?.title ?? "";
    flatSlots[`bump_${slot}_price`] = item ? String(item.price) : "";
  }

  const payload = {
    first_name: args.customer.firstName,
    last_name: args.customer.lastName,
    full_name: fullName,
    email: args.customer.email,
    phone: args.customer.phone,
    city: args.customer.city,
    country_code: args.customer.countryCode,
    payment_id: args.paymentId,
    order_id: args.orderId,
    lead_id: args.paymentId,
    amount: String(args.amount),
    base_price: "0",
    bumps_total: String(args.bumpsTotal),
    bumps: args.bumps,
    bumps_count: String(args.bumpItems.length),
    bump_ids: bumpIds,
    bump_titles: bumpTitles,
    bump_prices: bumpPrices,
    bumps_json: bumpsJson,
    ...flatSlots,
    currency: args.currency,
    payment_date: dateFormatter.format(now),
    payment_time: timeFormatter.format(now),
    payment_timestamp: now.toISOString(),
    created_at: now.toISOString(),
    utm_source: args.utm.utm_source ?? "",
    utm_medium: args.utm.utm_medium ?? "",
    utm_campaign: args.utm.utm_campaign ?? "",
    utm_content: args.utm.utm_content ?? "",
    utm_term: args.utm.utm_term ?? "",
    fbc: args.fbc,
    fbp: args.fbp,
    fbclid: deriveFbclidFromFbc(args.fbc),
    client_ip_address: args.clientIpAddress,
    client_user_agent: args.clientUserAgent,
    external_id: args.customer.email ? sha256Lower(args.customer.email) : "",
    event_source_url: args.eventSourceUrl,
    is_test: args.isTest ? "true" : "false",
    purchase_event_id: args.paymentId,
    source: args.source,
    capi_attempted: args.capiAttempted ? "true" : "false",
    capi_outcome: args.capiOutcome,
    capi_skip_reason: args.capiSkipReason,
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
        `[pabbly] oto webhook returned ${res.status} for order ${args.orderId}: ${text}`,
      );
    } else {
      console.log(
        `[pabbly] oto webhook OK ${res.status} for order ${args.orderId}`,
      );
    }
  } catch (err) {
    console.warn(
      `[pabbly] oto webhook failed for order ${args.orderId}:`,
      err instanceof Error ? err.message : err,
    );
  } finally {
    clearTimeout(timeoutId);
  }
}
