"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { useRouter } from "next/navigation";
import { parsePhoneNumberFromString } from "libphonenumber-js";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { ClientConfig } from "@/client.config";
import { setMetaAdvancedMatching, trackRegistrationPixel } from "@/lib/analytics";
import { readCookie, readUtmFromStorage, utmToQueryString } from "@/lib/utm";
import { persistLead } from "@/lib/lead";
import { COUNTRY_CODES } from "@/lib/countryCodes";
import type { RegisterResponse } from "@/lib/types";
import { Icon } from "./Icon";
import styles from "./RegisterModal.module.css";

interface Props {
  config: ClientConfig;
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

/** RFC4122-ish UUID. Prefers crypto.randomUUID (HTTPS + localhost), with a
 *  defensive fallback for very old browsers so leadId is never empty. */
function makeLeadId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return "lead-" + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

/**
 * Free-registration modal. Opened by any element carrying `data-register-cta`
 * (event-delegated) or by dispatching a window `open-register-modal` event.
 * Collects the same lead fields the old paid checkout used, posts them to
 * /api/register (which fires Pabbly + Meta CAPI), fires the paired browser
 * pixel events, then routes to /thank-you. No payment anywhere.
 */
export function RegisterModal({ config }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<FormState>(initialState);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const reduceMotion = useReducedMotion();
  const firstFieldRef = useRef<HTMLInputElement | null>(null);

  const openModal = useCallback(() => {
    setGlobalError(null);
    setOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    if (submitting) return;
    setOpen(false);
  }, [submitting]);

  // ---- Open triggers: click delegation on [data-register-cta] + custom event.
  useEffect(() => {
    function onClick(e: MouseEvent) {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const trigger = target.closest("[data-register-cta]");
      if (trigger) {
        e.preventDefault();
        openModal();
      }
    }
    function onOpenEvent() {
      openModal();
    }
    document.addEventListener("click", onClick);
    window.addEventListener("open-register-modal", onOpenEvent);
    return () => {
      document.removeEventListener("click", onClick);
      window.removeEventListener("open-register-modal", onOpenEvent);
    };
  }, [openModal]);

  // ---- Esc to close + body scroll lock while open.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") closeModal();
    }
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // Focus the first field shortly after the open animation begins.
    const focusTimer = window.setTimeout(() => {
      firstFieldRef.current?.focus();
    }, 60);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      window.clearTimeout(focusTimer);
    };
  }, [open, closeModal]);

  // ---- Manual Advanced Matching on valid form-fill (debounced 500ms).
  // Writes hashed identity to the kbl_mam cookie so every subsequent PageView
  // (incl. /thank-you) carries full matching — no-op off the prod domain.
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

    const fieldErrors = validate(state);
    setErrors(fieldErrors);
    if (Object.keys(fieldErrors).length > 0) {
      const firstInvalid = Object.keys(fieldErrors)[0];
      const el = document.querySelector(`[data-field="${firstInvalid}"] input`);
      if (el instanceof HTMLElement) el.focus();
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
    // In-app browsers (Instagram/FB webview) often block the pixel's _fbc
    // cookie, so we also forward the raw fbclid captured from the landing URL
    // (persisted by UtmTracker). The register route rebuilds _fbc from it when
    // the cookie is empty — keeps EMQ high for paid mobile-ad traffic.
    const fbclid = utm.fbclid;
    const leadId = makeLeadId();

    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // keepalive keeps the request alive at the OS layer through the
        // /thank-you transition so the server can finish firing Pabbly + CAPI.
        keepalive: true,
        body: JSON.stringify({
          leadId,
          customer,
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

      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as
          | { error?: string }
          | null;
        setGlobalError(
          data?.error ??
            "We couldn't complete your registration. Please try again.",
        );
        setSubmitting(false);
        return;
      }

      const parsed: RegisterResponse = await res.json();
      if (!parsed.success) {
        setGlobalError(parsed.message ?? "Registration failed. Please try again.");
        setSubmitting(false);
        return;
      }

      // Persist the entered fields so a later visit to the standalone OTO
      // checkout can prefill them (editable). Stores dial code + local number
      // separately to match the checkout form inputs.
      persistLead({
        firstName: customer.firstName,
        lastName: customer.lastName,
        email: customer.email,
        dialCode: state.countryCode,
        phone: state.phone.trim(),
        city: customer.city,
      });

      // Browser-side Meta events, paired with the server CAPI events via the
      // shared event_id (= leadId). MAM first so the events inherit hashed
      // identity for 9.5+/10 EMQ. Both are no-ops off the prod domain (fbq is
      // only defined there), mirroring the server CAPI host gate.
      await setMetaAdvancedMatching({
        email: customer.email,
        phone: customer.phone,
        firstName: customer.firstName,
        lastName: customer.lastName,
        city: customer.city,
        country: customer.countryCode,
      });
      trackRegistrationPixel({
        leadId,
        standardEvent: config.capi.standardEvent,
        customEvent: config.capi.customEvent,
        contentName: `${config.brand.name} Free Webinar`,
      });

      const utmQs = utmToQueryString(utm);
      // utmToQueryString returns "&utm_..."; swap the leading "&" for "?" so
      // the query string is well-formed on the nested thank-you route.
      const query = utmQs ? `?${utmQs.slice(1)}` : "";
      router.push(`/${config.funnel.slug}/thank-you${query}`);
    } catch (err) {
      console.error("[register] submit error", err);
      setGlobalError(
        "Could not register. Please check your internet connection and try again.",
      );
      setSubmitting(false);
    }
  }

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className={styles.overlay}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="register-modal-title"
        >
          <motion.div
            className={styles.modal}
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.26, ease: [0.23, 1, 0.32, 1] }}
          >
            <button
              type="button"
              className={styles.close}
              onClick={closeModal}
              aria-label="Close"
              disabled={submitting}
            >
              <svg
                viewBox="0 0 24 24"
                width="18"
                height="18"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>

            <div className={styles.head}>
              <span className={styles.freeBadge}>100% Free</span>
              <h2 id="register-modal-title" className={styles.title}>
                Reserve Your Free Seat
              </h2>
              <p className={styles.subtitle}>
                {config.event.dateLabel} · {config.event.timeLabel} · Live on
                Zoom. Zoom link WhatsApp pe 30 min pehle aayega.
              </p>
            </div>

            <form className={styles.form} onSubmit={handleSubmit} noValidate>
              <div className={styles.row}>
                <Field
                  label="First name"
                  value={state.firstName}
                  error={errors.firstName}
                  onChange={(v) => update("firstName", v)}
                  onBlur={() => handleBlur("firstName")}
                  autoComplete="given-name"
                  fieldKey="firstName"
                  inputRef={firstFieldRef}
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
                  <label className={styles.label} htmlFor="reg-countryCode">
                    Code
                  </label>
                  <select
                    id="reg-countryCode"
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

              <button
                type="submit"
                className={styles.submit}
                disabled={submitting}
              >
                {submitting ? (
                  <span className={styles.spinner} aria-hidden="true" />
                ) : null}
                <span>{submitting ? "Reserving…" : "Confirm My Free Seat"}</span>
                {!submitting ? (
                  <span className={styles.arrow} aria-hidden="true">
                    →
                  </span>
                ) : null}
              </button>

              <p className={styles.trust}>
                <span className={styles.trustIcon} aria-hidden="true">
                  <Icon name="shield" size={14} />
                </span>
                No payment · No credit card · Zoom link on WhatsApp
              </p>
            </form>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
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
  inputRef?: React.RefObject<HTMLInputElement | null>;
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
  inputRef,
}: FieldProps) {
  const id = `reg-field-${label.replace(/\s+/g, "-").toLowerCase()}`;
  return (
    <div className={styles.field} data-field={fieldKey}>
      <label className={styles.label} htmlFor={id}>
        {label}
        {required ? <span aria-hidden="true"> *</span> : null}
      </label>
      <input
        id={id}
        ref={inputRef}
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
