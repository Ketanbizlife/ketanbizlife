/**
 * Shared types for API routes and client-side payment flow.
 */

export interface CustomerPayload {
  firstName: string;
  lastName: string;
  email: string;
  /** Full phone with country code prefix, e.g. "+919876543210" */
  phone: string;
  /** ISO 3166-1 alpha-2 country code, e.g. "IN" */
  countryCode: string;
  city: string;
}

export interface UtmPayload {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  /** Raw Facebook click ID from `?fbclid=…` on the landing URL. Persisted
   *  alongside UTMs so we can reconstruct `_fbc` server-side when the Meta
   *  Pixel fails to set the cookie (typical for in-app browser users). */
  fbclid?: string;
}

/**
 * Free registration submit. There is no payment — the lead form itself is the
 * conversion. `leadId` is a UUID minted on the browser so the browser pixel
 * event and the server CAPI event share an event_id (Meta dedup pair).
 */
export interface RegisterRequest {
  /** UUID minted client-side; used as CAPI event_id + Pabbly lead_id. */
  leadId: string;
  customer: CustomerPayload;
  utm: UtmPayload;
  /** Facebook click-id cookie (forwarded for the server CAPI fire) */
  fbc?: string;
  /** Facebook browser-id cookie (forwarded for the server CAPI fire) */
  fbp?: string;
  /** Raw fbclid from the landing URL (persisted via UTM). The register route
   *  reconstructs `_fbc` from it when the pixel didn't set the cookie — the
   *  common case for Instagram/Facebook in-app browsers. */
  fbclid?: string;
  /** navigator.userAgent at submit time (forwarded for the server CAPI fire) */
  userAgent?: string;
  /** window.location.href at submit time (Meta CAPI event_source_url) */
  eventSourceUrl?: string;
}

export interface RegisterResponse {
  success: boolean;
  leadId?: string;
  message?: string;
}

// ---------------------------------------------------------------------------
// OTO (one-time-offer) paid checkout — Cashfree. The main webinar is free;
// these types power ONLY the standalone /free/oto → /free/checkout upsell,
// where the selected add-on "bumps" are paid. Base price is 0 (add-ons only).
// ---------------------------------------------------------------------------

export type CashfreeMode = "sandbox" | "production";

export interface CreateOrderRequest {
  amount: number;
  currency: string;
  customer: CustomerPayload;
  /** IDs of selected OTO bumps (server resolves to titles/prices) */
  selectedBumpIds: string[];
  utm: UtmPayload;
  /** Facebook click-id cookie (snapshotted into order_tags for the webhook-side CAPI fire) */
  fbc?: string;
  /** Facebook browser-id cookie (snapshotted into order_tags for the webhook-side CAPI fire) */
  fbp?: string;
  /** Raw fbclid recovered from the landing URL via UTM persistence. Used by
   *  create-order to reconstruct `_fbc` when the Meta Pixel didn't set the
   *  cookie (the common case for Instagram/Facebook in-app browsers). */
  fbclid?: string;
  /** navigator.userAgent at submit time (snapshotted into order_tags for the webhook-side CAPI fire) */
  userAgent?: string;
  /** window.location.href at submit time (snapshotted into order_tags for the webhook-side CAPI fire) */
  eventSourceUrl?: string;
}

export interface CreateOrderResponse {
  orderId: string;
  paymentSessionId: string;
  amount: number;
  currency: string;
  mode: CashfreeMode;
}

export interface VerifyPaymentRequest {
  orderId: string;
  customer: CustomerPayload;
  utm: UtmPayload;
  /** IDs of selected OTO bumps (server resolves to titles/prices) */
  selectedBumpIds: string[];
  grandTotal: number;
  fbc?: string;
  fbp?: string;
  eventSourceUrl?: string;
}

export interface VerifyPaymentResponse {
  success: boolean;
  paymentId?: string;
  message?: string;
}

export interface ApiErrorResponse {
  success: false;
  error: string;
  code?: string;
}
