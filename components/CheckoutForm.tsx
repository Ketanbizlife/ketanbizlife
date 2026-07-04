"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { parsePhoneNumberFromString } from "libphonenumber-js";
import { load, type Cashfree } from "@cashfreepayments/cashfree-js";
import type { ClientConfig } from "@/client.config";
import { setMetaAdvancedMatching, trackPurchasePixel } from "@/lib/analytics";
import { readCookie, readUtmFromStorage, utmToQueryString } from "@/lib/utm";
import { readLead } from "@/lib/lead";
import { COUNTRY_CODES } from "@/lib/countryCodes";
import type {
  CashfreeMode,
  CreateOrderResponse,
  VerifyPaymentResponse,
} from "@/lib/types";
import { Icon } from "./Icon";
import styles from "./CheckoutForm.module.css";

interface Props {
  config: ClientConfig;
  mode: CashfreeMode;
  /** Bump IDs selected on the OTO page and passed via the checkout URL. */
  initialBumpIds: string[];
}

interface FormState {
  firstName: string;
  lastName: string;
  email: string;
  countryCode: string;
  phone: string;
  city: string;
}

interface FieldErrors {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  city?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const initialState: FormState = {
  firstName: "",
  lastName: "",
  email: "",
  countryCode: "+91",
  phone: "",
  city: "",
};

function validate(state: FormState): FieldErrors {
  const errors: FieldErrors = {};

  if (!state.firstName.trim()) errors.firstName = "First name is required";
  if (!state.lastName.trim()) errors.lastName = "Last name is required";

  if (!state.email.trim()) {
    errors.email = "Email is required";
  } else if (!EMAIL_RE.test(state.email)) {
    errors.email = "Please enter a valid email";
  }

  const fullPhone = `${state.countryCode}${state.phone.trim()}`;
  if (!state.phone.trim()) {
    errors.phone = "Phone is required";
  } else {
    const parsed = parsePhoneNumberFromString(fullPhone);
    if (!parsed || !parsed.isValid()) {
      errors.phone = "Please enter a valid phone number";
    }
  }

  if (!state.city.trim()) errors.city = "City is required";

  return errors;
}

export function CheckoutForm({ config, mode, initialBumpIds }: Props) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement | null>(null);
  const [state, setState] = useState<FormState>(initialState);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);

  // Selection is locked in from the OTO page — the checkout is a confirm+pay
  // step. To change tools, the user goes back to /free/oto.
  const selectedItems = useMemo(() => {
    const ids = new Set(initialBumpIds);
    return config.checkout.bumps.filter((b) => ids.has(b.id));
  }, [config.checkout.bumps, initialBumpIds]);

  const selectedBumpIds = useMemo(
    () => selectedItems.map((b) => b.id),
    [selectedItems],
  );

  // OTO has no base price — the grand total is the sum of selected add-ons.
  const grandTotal = useMemo(
    () => selectedItems.reduce((sum, b) => sum + b.price, 0),
    [selectedItems],
  );

  const hasItems = selectedItems.length > 0;

  // Anchor / savings: the bundle's "value" is the sum of the 3 individual
  // tools, so we can show a struck-through original price + "you save".
  const individualSum = useMemo(
    () =>
      config.checkout.bumps
        .filter((b) => !b.isBundle)
        .reduce((s, b) => s + b.price, 0),
    [config.checkout.bumps],
  );
  const anchorTotal = useMemo(
    () =>
      selectedItems.reduce(
        (sum, b) => sum + (b.isBundle ? individualSum : b.price),
        0,
      ),
    [selectedItems, individualSum],
  );
  const savings = anchorTotal - grandTotal;

  // Prefill from the registrant's stored details (editable). Client-only mount
  // effect to avoid an SSR hydration mismatch.
  useEffect(() => {
    const lead = readLead();
    if (!lead) return;
    setState((prev) => ({
      firstName: lead.firstName || prev.firstName,
      lastName: lead.lastName || prev.lastName,
      email: lead.email || prev.email,
      countryCode: lead.dialCode || prev.countryCode,
      phone: lead.phone || prev.phone,
      city: lead.city || prev.city,
    }));
  }, []);

  // Lazy-load the Cashfree v3 SDK once on mount.
  const cashfreeRef = useRef<Cashfree | null>(null);
  const [sdkReady, setSdkReady] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    let cancelled = false;
    (async () => {
      try {
        const cashfree = await load({ mode });
        if (cancelled || !cashfree) return;
        cashfreeRef.current = cashfree;
        setSdkReady(true);
      } catch (err) {
        console.error("[checkout] Cashfree SDK load failed", err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [mode]);

  // Fire Meta Manual Advanced Matching once the form is valid (debounced).
  useEffect(() => {
    if (typeof window === "undefined") return;
    const fullPhone = `${state.countryCode}${state.phone.trim()}`;
    const filled =
      state.firstName.trim() &&
      state.lastName.trim() &&
      state.email.trim() &&
      state.phone.trim() &&
      state.city.trim();
    if (!filled) return;
    if (Object.keys(validate(state)).length > 0) return;

    const timer = window.setTimeout(() => {
      void setMetaAdvancedMatching({
        email: state.email,
        phone: fullPhone,
        firstName: state.firstName,
        lastName: state.lastName,
        city: state.city,
        country: "IN",
      });
    }, 500);
    return () => window.clearTimeout(timer);
  }, [state]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setState((prev) => ({ ...prev, [key]: value }));
  }

  function handleBlur(field: keyof FieldErrors) {
    const fieldErrors = validate(state);
    setErrors((prev) => ({ ...prev, [field]: fieldErrors[field] }));
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setGlobalError(null);

    if (!hasItems || grandTotal <= 0) {
      setGlobalError("Your order is empty. Go back and add at least one tool.");
      return;
    }

    const fieldErrors = validate(state);
    setErrors(fieldErrors);
    if (Object.keys(fieldErrors).length > 0) {
      const firstInvalid = Object.keys(fieldErrors)[0];
      const el = document.querySelector(`[data-field="${firstInvalid}"]`);
      if (el instanceof HTMLElement) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.querySelector("input")?.focus();
      }
      return;
    }

    if (!sdkReady || !cashfreeRef.current) {
      setGlobalError("Payment is loading — please wait a moment and try again.");
      return;
    }

    setSubmitting(true);

    const fullPhone = `${state.countryCode}${state.phone.trim()}`;
    const customer = {
      firstName: state.firstName.trim(),
      lastName: state.lastName.trim(),
      email: state.email.trim().toLowerCase(),
      phone: fullPhone,
      countryCode: "IN",
      city: state.city.trim(),
    };
    const utm = readUtmFromStorage(config.funnel.sessionStorageKey);
    const fbc = readCookie("_fbc");
    const fbp = readCookie("_fbp");
    // Meta in-app browsers (Instagram WebView, Facebook IAB) often fail to
    // persist the `_fbc` cookie the pixel tries to write, so we ALSO forward
    // the raw fbclid the URL gave us on landing (captured by UtmTracker).
    // The server reconstructs fbc from fbclid when the cookie is empty —
    // byte-identical to what the pixel would have produced.
    const fbclid = utm.fbclid;

    try {
      const orderRes = await fetch("/api/cashfree/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: grandTotal,
          currency: config.pricing.currency,
          customer,
          selectedBumpIds,
          utm,
          fbc,
          fbp,
          fbclid,
          userAgent:
            typeof navigator !== "undefined" ? navigator.userAgent : undefined,
          eventSourceUrl:
            typeof window !== "undefined" ? window.location.href : undefined,
        }),
      });

      if (!orderRes.ok) {
        throw new Error(`create-order failed: ${orderRes.status}`);
      }

      const order: CreateOrderResponse = await orderRes.json();

      const cashfree = cashfreeRef.current;
      if (!cashfree) throw new Error("Cashfree SDK unavailable");

      const result = await cashfree.checkout({
        paymentSessionId: order.paymentSessionId,
        redirectTarget: "_modal",
      });
      if (result?.error) {
        console.warn("[checkout] cashfree modal returned error", result.error);
      }

      const verifyRes = await fetch("/api/cashfree/verify-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        keepalive: true,
        body: JSON.stringify({
          orderId: order.orderId,
          customer,
          utm,
          selectedBumpIds,
          grandTotal,
        }),
      });

      if (!verifyRes.ok) {
        const data = (await verifyRes.json().catch(() => null)) as
          | { error?: string; code?: string }
          | null;
        if (data?.code?.startsWith("ORDER_STATUS_")) {
          setGlobalError(
            "Payment wasn't completed. Please try again — your card was not charged.",
          );
        } else {
          setGlobalError(
            data?.error ??
              "We couldn't confirm your payment. Please contact support with order ID " +
                order.orderId,
          );
        }
        setSubmitting(false);
        return;
      }

      const verified: VerifyPaymentResponse = await verifyRes.json();
      if (!verified.success) {
        setGlobalError(verified.message ?? "Payment verification failed");
        setSubmitting(false);
        return;
      }

      // Browser Meta events mirror the server CAPI gate: production mode +
      // amount > ₹1. fbq is only defined on the prod domain, so this also
      // no-ops on localhost / preview.
      const fireMetaBrowserEvents = order.mode === "production" && grandTotal > 1;
      if (fireMetaBrowserEvents) {
        await setMetaAdvancedMatching({
          email: customer.email,
          phone: customer.phone,
          firstName: customer.firstName,
          lastName: customer.lastName,
          city: customer.city,
          country: customer.countryCode,
        });
        // Browser-side `Purchase` (+ custom OTOPurchase) paired with the
        // server CAPI Purchase via matching eventID (= cf_payment_id). Meta
        // dedupes within 48h → counted once. MAM (above) fires first so this
        // event inherits hashed identity for high EMQ. These are the OTO's own
        // events (distinct from the old paid-funnel Purchase), so they don't
        // interfere with any old-funnel pixel/CAPI dataset test.
        if (verified.paymentId) {
          trackPurchasePixel({
            paymentId: verified.paymentId,
            value: grandTotal,
            standardEvent: config.capi.otoStandardEvent,
            customEvent: config.capi.otoCustomEvent,
            currency: config.brand.currency ?? "INR",
            contentName: `${config.brand.name} Export Toolkit`,
          });
        }
      }

      // Route to the dedicated OTO thank-you (/free/oto/thank-you), carrying the
      // purchased tool IDs (so it confirms exactly what they bought) + UTM.
      // utmToQueryString returns a leading "&", so it appends cleanly after bumps.
      const bumpsParam = `bumps=${encodeURIComponent(selectedBumpIds.join(","))}`;
      const query = `?${bumpsParam}${utmToQueryString(utm)}`;
      router.push(`/${config.funnel.slug}/oto/thank-you${query}`);
    } catch (err) {
      console.error("[checkout] order error", err);
      setGlobalError(
        "Could not start checkout. Please check your internet connection and try again.",
      );
      setSubmitting(false);
    }
  }

  return (
    <>
      <div className={styles.grid}>
        {/* ============= FORM COLUMN ============= */}
        <div className={styles.formCol}>
          <form
            ref={formRef}
            className={styles.form}
            onSubmit={handleSubmit}
            noValidate
          >
            <h3 className={styles.sectionLabel}>Your details</h3>
            <p className={styles.formHint}>
              Your tools are delivered to this email &amp; WhatsApp number right
              after payment.
            </p>

            <div className={styles.row}>
              <Field
                label="First name"
                value={state.firstName}
                error={errors.firstName}
                onChange={(v) => update("firstName", v)}
                onBlur={() => handleBlur("firstName")}
                autoComplete="given-name"
                fieldKey="firstName"
                required
              />
              <Field
                label="Last name"
                value={state.lastName}
                error={errors.lastName}
                onChange={(v) => update("lastName", v)}
                onBlur={() => handleBlur("lastName")}
                autoComplete="family-name"
                fieldKey="lastName"
                required
              />
            </div>

            <Field
              label="Email"
              type="email"
              value={state.email}
              error={errors.email}
              onChange={(v) => update("email", v)}
              onBlur={() => handleBlur("email")}
              autoComplete="email"
              inputMode="email"
              fieldKey="email"
              required
            />

            <div className={`${styles.row} ${styles.phoneRow}`}>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="countryCode">
                  Code
                </label>
                <select
                  id="countryCode"
                  className={styles.select}
                  value={state.countryCode}
                  onChange={(e) => update("countryCode", e.target.value)}
                >
                  {COUNTRY_CODES.map((c) => (
                    <option key={`${c.value}-${c.label}`} value={c.value}>
                      {c.flag} {c.value} {c.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className={styles.phoneField}>
                <Field
                  label="Phone (WhatsApp)"
                  type="tel"
                  value={state.phone}
                  error={errors.phone}
                  onChange={(v) => update("phone", v)}
                  onBlur={() => handleBlur("phone")}
                  autoComplete="tel"
                  inputMode="tel"
                  fieldKey="phone"
                  required
                />
              </div>
            </div>

            <Field
              label="City"
              value={state.city}
              error={errors.city}
              onChange={(v) => update("city", v)}
              onBlur={() => handleBlur("city")}
              autoComplete="address-level2"
              fieldKey="city"
              required
            />

            {globalError ? (
              <div role="alert" className={styles.alert}>
                {globalError}
              </div>
            ) : null}

            {/* Desktop pay button (mobile uses the sticky bar). */}
            <button
              type="submit"
              className={styles.payButton}
              disabled={submitting || !sdkReady || !hasItems}
            >
              {submitting ? (
                <span className={styles.spinner} aria-hidden="true" />
              ) : null}
              <span>{submitting ? "Opening payment…" : `Pay ₹${grandTotal} securely`}</span>
              {!submitting ? (
                <span className={styles.payArrow} aria-hidden="true">→</span>
              ) : null}
            </button>

            <p className={styles.disclaimer}>{config.oto.securityNote}</p>
          </form>
        </div>

        {/* ============= ORDER SUMMARY COLUMN ============= */}
        <aside className={styles.summaryCol} aria-label="Order summary">
          <div className={styles.orderCard}>
            <div className={styles.orderHead}>
              <h3 className={styles.sectionLabel}>Order summary</h3>
              <Link href={`/${config.funnel.slug}/oto`} className={styles.editLink}>
                Edit
              </Link>
            </div>

            {hasItems ? (
              <ul className={styles.orderList}>
                {selectedItems.map((b) => (
                  <li key={b.id} className={styles.orderItem}>
                    <span className={styles.orderThumb} aria-hidden="true">
                      {b.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={b.image}
                          alt=""
                          className={styles.orderThumbImg}
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).style.display = "none";
                          }}
                        />
                      ) : null}
                    </span>
                    <div className={styles.orderItemBody}>
                      <span className={styles.orderItemTitle}>{b.title}</span>
                      {b.otoTagline ? (
                        <span className={styles.orderItemDesc}>{b.otoTagline}</span>
                      ) : null}
                    </div>
                    <span className={styles.orderItemPrice}>₹{b.price}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className={styles.orderEmpty}>
                <p>No tools selected.</p>
                <Link
                  href={`/${config.funnel.slug}/oto`}
                  className={styles.orderEmptyLink}
                >
                  ← Back to choose your tools
                </Link>
              </div>
            )}

            {hasItems && savings > 0 ? (
              <div className={styles.savingsRow}>
                <span>Original value</span>
                <span className={styles.savingsRight}>
                  <s className={styles.savingsStrike}>₹{anchorTotal}</s>
                  <span className={styles.savingsTag}>You save ₹{savings}</span>
                </span>
              </div>
            ) : null}

            <div className={styles.orderTotalRow}>
              <span className={styles.orderTotalLabel}>Total today</span>
              <span className={styles.orderTotalAmount}>₹{grandTotal}</span>
            </div>

            <ul className={styles.trustRow}>
              <li className={styles.trustItem}>
                <span className={styles.trustIcon} aria-hidden="true">
                  <Icon name="lock" size={15} />
                </span>
                256-bit secure
              </li>
              <li className={styles.trustItem}>
                <span className={styles.trustIcon} aria-hidden="true">
                  <Icon name="check" size={15} />
                </span>
                Instant delivery
              </li>
              <li className={styles.trustItem}>
                <span className={styles.trustIcon} aria-hidden="true">
                  <Icon name="shield" size={15} />
                </span>
                Payment protected
              </li>
            </ul>

            <p className={styles.oneTimeNote}>
              One-time payment · No subscription · No hidden charges
            </p>
          </div>
        </aside>
      </div>

      {/* ============= STICKY BOTTOM CTA (mobile-first, always visible) ============= */}
      <div className={styles.stickyBar} role="region" aria-label="Checkout total">
        <div className={styles.stickyInner}>
          <div className={styles.stickyTotal}>
            <span className={styles.stickyTotalLabel}>Total today</span>
            <span className={styles.stickyTotalValue}>₹{grandTotal}</span>
            <span className={styles.stickyTotalNote}>
              {selectedItems.length} tool{selectedItems.length === 1 ? "" : "s"}
            </span>
          </div>

          <button
            type="button"
            className={styles.stickyButton}
            disabled={submitting || !sdkReady || !hasItems}
            onClick={() => formRef.current?.requestSubmit()}
          >
            {submitting ? <span className={styles.spinner} aria-hidden="true" /> : null}
            <span>{submitting ? "Opening…" : `Pay ₹${grandTotal}`}</span>
            <span className={styles.stickyArrow} aria-hidden="true">→</span>
          </button>
        </div>
      </div>
    </>
  );
}

interface FieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  error?: string;
  type?: string;
  autoComplete?: string;
  inputMode?: "text" | "email" | "tel" | "numeric";
  required?: boolean;
  fieldKey?: string;
}

function Field({
  label,
  value,
  onChange,
  onBlur,
  error,
  type = "text",
  autoComplete,
  inputMode,
  required,
  fieldKey,
}: FieldProps) {
  const id = `field-${label.replace(/\s+/g, "-").toLowerCase()}`;
  return (
    <div className={styles.field} data-field={fieldKey}>
      <label className={styles.label} htmlFor={id}>
        {label}
        {required ? <span aria-hidden="true"> *</span> : null}
      </label>
      <input
        id={id}
        type={type}
        className={`${styles.input} ${error ? styles.inputError : ""}`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        autoComplete={autoComplete}
        inputMode={inputMode}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        required={required}
      />
      {error ? (
        <p id={`${id}-error`} className={styles.errorMsg}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
