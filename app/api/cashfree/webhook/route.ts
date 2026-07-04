import { NextResponse } from "next/server";
import {
  base64UrlDecode,
  getCashfreeMode,
  unpackBrowserContext,
  verifyCashfreeWebhookSignature,
} from "@/lib/cashfree";
import { firePabblyPurchase, type PabblyBumpItem } from "@/lib/pabbly";
import { fireMetaCapiPurchase } from "@/lib/capi";
import { tryClaimOrder } from "@/lib/dedup";
import { clientConfig } from "@/client.config";
import type { CustomerPayload, UtmPayload } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface CashfreeWebhookPayload {
  type?: string;
  data?: {
    order?: {
      order_id?: string;
      order_amount?: number;
      order_currency?: string;
      order_tags?: Record<string, string> | null;
    };
    payment?: {
      cf_payment_id?: string | number;
      payment_status?: string;
      payment_amount?: number;
      payment_currency?: string;
    };
    customer_details?: {
      customer_email?: string;
      customer_phone?: string;
      customer_name?: string;
    };
  };
}

/** order_tags were base64url-encoded at create-order (lib/cashfree sanitizeTags). */
function decodeTags(
  tags: Record<string, string> | null | undefined,
): Record<string, string> {
  if (!tags) return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(tags)) {
    try {
      out[k] = base64UrlDecode(v);
    } catch {
      out[k] = v;
    }
  }
  return out;
}

function rebuildCustomerFromTags(
  tags: Record<string, string>,
  fallback: { email?: string; phone?: string; name?: string } | undefined,
): CustomerPayload | null {
  const email = tags.em || fallback?.email || "";
  const phone = tags.ph || fallback?.phone || "";
  if (!email || !phone) return null;

  const [fallbackFirst = "", ...fallbackRest] = (fallback?.name ?? "").split(" ");
  return {
    firstName: tags.fn || fallbackFirst,
    lastName: tags.ln || fallbackRest.join(" "),
    email,
    phone,
    countryCode: tags.cc || "IN",
    city: tags.ci || "",
  };
}

function rebuildUtmFromTags(tags: Record<string, string>): UtmPayload {
  if (!tags.utm) return {};
  try {
    const parsed = JSON.parse(tags.utm) as UtmPayload;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function resolveBumps(idsCsv: string | undefined): {
  bumpsLine: string;
  bumpsTotal: number;
  bumpItems: PabblyBumpItem[];
} {
  const ids = (idsCsv ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const matched = ids
    .map((id) => clientConfig.checkout.bumps.find((b) => b.id === id))
    .filter((b): b is NonNullable<typeof b> => Boolean(b));

  return {
    bumpsLine:
      matched.length > 0
        ? matched.map((b) => `${b.title} (₹${b.price})`).join("; ")
        : "none",
    bumpsTotal: matched.reduce((sum, b) => sum + b.price, 0),
    bumpItems: matched.map((b) => ({ id: b.id, title: b.title, price: b.price })),
  };
}

export async function POST(request: Request): Promise<NextResponse> {
  const rawBody = await request.text();
  const timestamp = request.headers.get("x-webhook-timestamp") ?? "";
  const signature = request.headers.get("x-webhook-signature") ?? "";

  const valid = verifyCashfreeWebhookSignature({ rawBody, timestamp, signature });
  if (!valid) {
    console.warn("[cashfree-webhook] signature mismatch");
    return NextResponse.json(
      { success: false, error: "Invalid signature" },
      { status: 401 },
    );
  }

  let parsed: CashfreeWebhookPayload;
  try {
    parsed = JSON.parse(rawBody) as CashfreeWebhookPayload;
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const eventType = parsed.type ?? "";
  const paymentStatus = parsed.data?.payment?.payment_status ?? "";
  const isSuccess =
    eventType === "PAYMENT_SUCCESS_WEBHOOK" || paymentStatus === "SUCCESS";
  if (!isSuccess) {
    return NextResponse.json({ received: true, acted: false });
  }

  const orderId = parsed.data?.order?.order_id ?? "";
  if (!orderId) {
    return NextResponse.json({ received: true, acted: false });
  }

  // Dedup Pabbly against Cashfree double-delivery. CAPI dedupes server-side on
  // event_id (= cf_payment_id) so it's intentionally not gated here.
  if (!tryClaimOrder(orderId)) {
    return NextResponse.json({ received: true, acted: false, deduped: true });
  }

  const rawTags = parsed.data?.order?.order_tags ?? null;
  const tags = decodeTags(rawTags);
  const ctx = unpackBrowserContext(tags.ctx);
  const userAgentSnapshot = tags.ua ?? "";

  const fallback = {
    email: parsed.data?.customer_details?.customer_email,
    phone: parsed.data?.customer_details?.customer_phone,
    name: parsed.data?.customer_details?.customer_name,
  };
  const customer = rebuildCustomerFromTags(tags, fallback);
  if (!customer) {
    console.warn(
      `[cashfree-webhook] missing customer for order ${orderId} — skipping fires`,
    );
    return NextResponse.json({ received: true, acted: false });
  }

  const utm = rebuildUtmFromTags(tags);
  const { bumpsLine, bumpsTotal, bumpItems } = resolveBumps(tags.bumps);
  // OTO has no base price — the grand total is the sum of add-ons.
  const grandTotal =
    typeof parsed.data?.order?.order_amount === "number"
      ? parsed.data.order.order_amount
      : bumpsTotal;

  const cfPaymentRaw = parsed.data?.payment?.cf_payment_id;
  const paymentId = cfPaymentRaw ? String(cfPaymentRaw) : orderId;
  const currency =
    parsed.data?.order?.order_currency ?? clientConfig.pricing.currency;

  // ---- CAPI gating: production Cashfree mode + real charge (> ₹1). ----
  const cashfreeMode = getCashfreeMode();
  const isRealCharge = grandTotal > 1;
  const capiAllowed =
    clientConfig.capi.enabled && cashfreeMode === "production" && isRealCharge;

  const eventSourceUrl = `https://${clientConfig.brand.domain}/${clientConfig.funnel.slug}/checkout`;
  const isTest = !(cashfreeMode === "production" && isRealCharge);

  let capiAttempted = false;
  let capiOutcome: "ok" | "err" | "timeout" | "skipped" = "skipped";
  let capiSkipReason = "";

  if (!capiAllowed) {
    if (!clientConfig.capi.enabled) capiSkipReason = "capi_disabled";
    else if (cashfreeMode !== "production") capiSkipReason = "not_production_mode";
    else if (!isRealCharge) capiSkipReason = "amount_below_threshold";
    console.log(
      `[cashfree-webhook] CAPI skipped — order=${orderId} reason=${capiSkipReason} mode=${cashfreeMode} amount=${grandTotal}`,
    );
  } else {
    capiAttempted = true;
    capiOutcome = await fireMetaCapiPurchase({
      customer,
      standardEvent: clientConfig.capi.otoStandardEvent,
      customEvent: clientConfig.capi.otoCustomEvent,
      value: grandTotal,
      currency,
      paymentId,
      eventSourceUrl,
      kind: clientConfig.capi.kind,
      clientIp: ctx.ip ?? "",
      clientUserAgent: userAgentSnapshot,
      fbc: ctx.fbc,
      fbp: ctx.fbp,
    });
  }

  await firePabblyPurchase({
    customer,
    utm,
    paymentId,
    orderId,
    amount: grandTotal,
    bumpsTotal,
    bumps: bumpsLine,
    bumpItems,
    currency,
    timezone: clientConfig.event.timezone,
    source: "oto",
    capiAttempted,
    capiOutcome,
    capiSkipReason,
    fbc: ctx.fbc ?? "",
    fbp: ctx.fbp ?? "",
    clientIpAddress: ctx.ip ?? "",
    clientUserAgent: userAgentSnapshot,
    eventSourceUrl,
    isTest,
  });

  return NextResponse.json({ received: true, acted: true });
}
