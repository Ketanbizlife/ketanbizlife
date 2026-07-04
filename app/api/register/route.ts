import { NextResponse } from "next/server";
import { fireMetaCapiRegistration } from "@/lib/capi";
import { firePabblyWebhook } from "@/lib/pabbly";
import { isProductionHost } from "@/lib/env";
import { extractClientIp } from "@/lib/http";
import { clientConfig } from "@/client.config";
import type {
  ApiErrorResponse,
  RegisterRequest,
  RegisterResponse,
} from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Free-webinar registration endpoint. There is NO payment: the lead-form
 * submission is the conversion. On a valid submit we:
 *   1. Fire the Meta Conversions API (standard + custom events) — gated to the
 *      production brand domain so localhost / preview URLs never pollute
 *      attribution. event_id = leadId pairs with the browser pixel events.
 *   2. Fire the Pabbly webhook UNCONDITIONALLY (source of truth for the CRM
 *      sheet + WhatsApp/email delivery), enriched with identity + UTM + the
 *      CAPI diagnostic columns.
 *
 * The browser awaits this response before routing to /thank-you, so both
 * side-effects have fired by the time the user lands there.
 */
export async function POST(
  request: Request,
): Promise<NextResponse<RegisterResponse | ApiErrorResponse>> {
  let body: RegisterRequest;
  try {
    body = (await request.json()) as RegisterRequest;
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const { leadId, customer, utm, fbc, fbp, fbclid, userAgent, eventSourceUrl } =
    body;

  if (!leadId || typeof leadId !== "string") {
    return NextResponse.json(
      { success: false, error: "Missing leadId" },
      { status: 400 },
    );
  }

  if (
    !customer ||
    !customer.firstName?.trim() ||
    !customer.lastName?.trim() ||
    !customer.email?.trim() ||
    !EMAIL_RE.test(customer.email) ||
    !customer.phone?.trim() ||
    !customer.city?.trim()
  ) {
    return NextResponse.json(
      { success: false, error: "Missing or invalid customer details" },
      { status: 400 },
    );
  }

  const normalizedCustomer = {
    firstName: customer.firstName.trim(),
    lastName: customer.lastName.trim(),
    email: customer.email.trim().toLowerCase(),
    phone: customer.phone.trim(),
    countryCode: customer.countryCode?.trim() || "IN",
    city: customer.city.trim(),
  };

  const utmSafe = utm && typeof utm === "object" ? utm : {};
  const clientIp = extractClientIp(request);
  const clientUserAgent =
    (userAgent ?? request.headers.get("user-agent") ?? "").slice(0, 512);

  // fbc recovery for Meta in-app browsers (Instagram/FB webview). The pixel
  // often can't write the `_fbc` cookie there, so the browser sends fbc="".
  // The landing URL still carries `?fbclid=…` (persisted by UtmTracker), and
  // Meta matches a server-rebuilt `fb.1.{ms}.{fbclid}` identically to a
  // pixel-written one — recovering attribution for paid mobile-ad traffic.
  const resolvedFbc =
    fbc && fbc.length > 0
      ? fbc
      : fbclid && fbclid.length > 0
        ? `fb.1.${Date.now()}.${fbclid}`
        : "";
  const resolvedEventSourceUrl =
    eventSourceUrl && eventSourceUrl.startsWith("http")
      ? eventSourceUrl
      : `https://${clientConfig.brand.domain}/${clientConfig.funnel.slug}`;

  // ---- CAPI gating ----
  // Fire only on the production brand domain so test runs (localhost / preview
  // URLs) never pollute pixel attribution. Pabbly fires regardless.
  const onProdHost = isProductionHost(request);
  const capiAllowed = clientConfig.capi.enabled && onProdHost;

  let capiAttempted = false;
  let capiOutcome: "ok" | "err" | "timeout" | "skipped" = "skipped";
  let capiSkipReason = "";

  if (!capiAllowed) {
    capiSkipReason = !clientConfig.capi.enabled
      ? "capi_disabled"
      : "not_production_host";
    console.log(
      `[register] CAPI skipped — leadId=${leadId} reason=${capiSkipReason}`,
    );
  } else {
    capiAttempted = true;
    capiOutcome = await fireMetaCapiRegistration({
      customer: normalizedCustomer,
      standardEvent: clientConfig.capi.standardEvent,
      customEvent: clientConfig.capi.customEvent,
      leadId,
      eventSourceUrl: resolvedEventSourceUrl,
      kind: clientConfig.capi.kind,
      clientIp,
      clientUserAgent,
      fbc: resolvedFbc,
      fbp,
    });
  }

  await firePabblyWebhook({
    customer: normalizedCustomer,
    utm: utmSafe,
    leadId,
    currency: clientConfig.pricing.currency,
    timezone: clientConfig.event.timezone,
    source: "register",
    standardEvent: clientConfig.capi.standardEvent,
    customEvent: clientConfig.capi.customEvent,
    capiAttempted,
    capiOutcome,
    capiSkipReason,
    fbc: resolvedFbc,
    fbp: fbp ?? "",
    clientIpAddress: clientIp,
    clientUserAgent,
    eventSourceUrl: resolvedEventSourceUrl,
    isTest: !onProdHost,
  });

  return NextResponse.json({ success: true, leadId });
}
