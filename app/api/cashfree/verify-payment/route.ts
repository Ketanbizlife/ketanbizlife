import { NextResponse } from "next/server";
import {
  getCashfreeOrderPayments,
  getCashfreeOrderStatus,
} from "@/lib/cashfree";
import type {
  ApiErrorResponse,
  VerifyPaymentRequest,
  VerifyPaymentResponse,
} from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Cashfree's payment lifecycle has two state machines that update at
 * different speeds:
 *   payment.payment_status: PENDING → SUCCESS         (1–2s after pay)
 *   order.order_status:     ACTIVE  → PAID            (2–5s after pay)
 *
 * We query BOTH endpoints in parallel each attempt, accept either signal as
 * "paid", and retry with a 1s backoff up to 5 attempts (~5s wall time).
 */
const POLL_MAX_ATTEMPTS = 5;
const POLL_DELAY_MS = 1000;

async function pollForPaidStatus(orderId: string): Promise<{
  isPaid: boolean;
  orderStatus: string;
  paymentId?: string;
  attempts: number;
}> {
  let lastOrderStatus = "UNKNOWN";

  for (let i = 0; i < POLL_MAX_ATTEMPTS; i++) {
    const attempts = i + 1;
    let orderStatus: string | null = null;
    let payments: Awaited<ReturnType<typeof getCashfreeOrderPayments>> = [];

    try {
      const [orderRes, paymentsRes] = await Promise.all([
        getCashfreeOrderStatus(orderId),
        getCashfreeOrderPayments(orderId),
      ]);
      orderStatus = orderRes.orderStatus;
      payments = paymentsRes;
      lastOrderStatus = orderStatus;
    } catch (err) {
      console.warn(
        `[verify-payment] poll attempt ${attempts} for ${orderId} failed:`,
        err instanceof Error ? err.message : err,
      );
    }

    const successPayment = payments.find((p) => p.payment_status === "SUCCESS");
    if (orderStatus === "PAID" || successPayment) {
      return {
        isPaid: true,
        orderStatus: orderStatus ?? lastOrderStatus,
        paymentId: successPayment?.cf_payment_id,
        attempts,
      };
    }

    if (i < POLL_MAX_ATTEMPTS - 1) {
      await new Promise((resolve) => setTimeout(resolve, POLL_DELAY_MS));
    }
  }

  return { isPaid: false, orderStatus: lastOrderStatus, attempts: POLL_MAX_ATTEMPTS };
}

/**
 * Authoritative "is it paid yet?" probe for the browser. Pabbly + Meta CAPI
 * are owned by the Cashfree webhook (mobile UPI users rarely return to the
 * browser), so this route only confirms payment before routing to thank-you.
 */
export async function POST(
  request: Request,
): Promise<NextResponse<VerifyPaymentResponse | ApiErrorResponse>> {
  let body: VerifyPaymentRequest;
  try {
    body = (await request.json()) as VerifyPaymentRequest;
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const { orderId, customer } = body;

  if (!orderId || !customer || !customer.email || !customer.phone) {
    return NextResponse.json(
      { success: false, error: "Missing required fields" },
      { status: 400 },
    );
  }

  const paid = await pollForPaidStatus(orderId);
  console.log(
    `[verify-payment] orderId=${orderId} attempts=${paid.attempts} isPaid=${paid.isPaid} finalOrderStatus=${paid.orderStatus} paymentId=${paid.paymentId ?? "<none>"}`,
  );

  if (!paid.isPaid) {
    if (paid.orderStatus === "UNKNOWN") {
      return NextResponse.json(
        { success: false, error: "Could not verify payment with Cashfree" },
        { status: 502 },
      );
    }
    return NextResponse.json(
      {
        success: false,
        error: "Payment not completed",
        code: `ORDER_STATUS_${paid.orderStatus}`,
      },
      { status: 400 },
    );
  }

  const paymentId = paid.paymentId ?? orderId;
  return NextResponse.json({ success: true, paymentId });
}
