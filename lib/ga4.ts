"use client";

/**
 * GA4 event helper — fires native `gtag('event', name)` calls, once per browser
 * per event, INDEPENDENT of Meta Pixel / CAPI tracking.
 *
 * Design constraints (see GA4 brief):
 *  - Exact event names only: add_to_cart | initiate_checkout | join_whatsapp.
 *  - NO value / currency / revenue params — these are pure reach/intent counts.
 *  - Once per browser, ever: a localStorage flag (namespaced `ketan_ga4_*`, kept
 *    separate from any Meta `_fired` flag so a Meta outage never suppresses GA4).
 *  - Stamp the flag BEFORE calling gtag: a CTA click often navigates away
 *    immediately, and an un-stamped flag would double-fire on rapid clicks.
 *  - If gtag is ABSENT (SSR, or off the production host where our host-gated
 *    GA4 loader never ran), return WITHOUT stamping — otherwise the event would
 *    be permanently suppressed for that browser and could never fire on prod.
 *  - If localStorage throws (private mode / sandboxed iframe), fire anyway and
 *    accept best-effort dedup. An extra count beats a lost one.
 *  - Never throw into a click handler — everything is wrapped in try/catch.
 */

declare global {
  interface Window {
    gtag?: (command: string, ...args: unknown[]) => void;
  }
}

/** Exact GA4 event names this funnel is allowed to fire. */
export type Ga4Event = "add_to_cart" | "initiate_checkout" | "join_whatsapp";

/** Matches the funnel's existing storage prefix (sessionStorageKey: "ketan_utm"). */
const FLAG_PREFIX = "ketan_ga4_";

export function trackGa4EventOnce(event: Ga4Event): void {
  // SSR guard + absent-gtag guard. When gtag is undefined (server render, or
  // any non-production host where the host-gated loader in app/layout.tsx
  // never appended the script), bail WITHOUT stamping so the event can still
  // fire on a later, properly-configured production session.
  if (typeof window === "undefined" || typeof window.gtag !== "function") {
    return;
  }

  const flag = `${FLAG_PREFIX}${event}_fired`;

  // Dedup read. If localStorage is unavailable we proceed to fire (best-effort).
  try {
    if (window.localStorage.getItem(flag) === "1") return;
  } catch {
    // localStorage blocked — skip dedup, fire anyway below.
  }

  // Stamp BEFORE firing so a rapid double-click / immediate navigation can't
  // double-fire. Best-effort — ignore storage failures.
  try {
    window.localStorage.setItem(flag, "1");
  } catch {
    // ignore — dedup is best-effort in private/sandboxed contexts.
  }

  // Fire the event. No params: pure count, independent of Meta's monetary data.
  try {
    window.gtag("event", event);
  } catch {
    // Analytics must never throw into a click handler.
  }
}
