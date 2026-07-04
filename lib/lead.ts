/**
 * Persist the registrant's form fields to sessionStorage on free signup so the
 * standalone OTO checkout can prefill them (editable). Best-effort: if the user
 * lands cold on /free/checkout without registering first, there's simply
 * nothing stored and the form starts empty.
 *
 * Stores the raw form fields (dial code + local number separately) so the
 * checkout can rehydrate its inputs without re-parsing a combined phone.
 */

const LEAD_KEY = "ketan_lead";

export interface StoredLead {
  firstName: string;
  lastName: string;
  email: string;
  /** Dial code, e.g. "+91". */
  dialCode: string;
  /** Local number without the dial code. */
  phone: string;
  city: string;
}

export function persistLead(lead: StoredLead): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(LEAD_KEY, JSON.stringify(lead));
  } catch {
    // sessionStorage may be unavailable (private mode, quota) — fail silently.
  }
}

export function readLead(): StoredLead | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(LEAD_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === "object") return parsed as StoredLead;
    return null;
  } catch {
    return null;
  }
}
