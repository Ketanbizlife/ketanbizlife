/**
 * Tiny shared HTTP helpers for route handlers.
 *
 * Used by /api/register to capture the originating client IP for the Meta
 * CAPI user_data (client_ip_address) and the Pabbly enrichment payload.
 */

/**
 * Extracts the originating client IP from the standard proxy headers.
 * Returns "" only when EVERY known header is unset (in which case the
 * caller should skip the field rather than send blank to Meta CAPI).
 *
 * We try multiple headers because empirically (500+ paid leads) the
 * Pabbly `client_ip_address` column had been blank for in-app-browser
 * traffic. The original code only checked `x-forwarded-for` then
 * `x-real-ip`; we now also check Vercel's own forwarded header and the
 * Cloudflare connecting IP as additional safety nets. A one-line log
 * names the winning header so future debugging is trivial — keep this
 * log until we've confirmed IP populates on real production purchases.
 *
 * Header order (most-trusted first):
 *   1. x-forwarded-for          (standard; Vercel sets it)
 *   2. x-vercel-forwarded-for   (Vercel-specific mirror)
 *   3. x-real-ip                (older proxy convention)
 *   4. cf-connecting-ip         (defensive — repo doesn't sit behind CF today)
 */
export function extractClientIp(request: Request): string {
  const candidates: Array<[string, string | null]> = [
    ["x-forwarded-for", request.headers.get("x-forwarded-for")],
    ["x-vercel-forwarded-for", request.headers.get("x-vercel-forwarded-for")],
    ["x-real-ip", request.headers.get("x-real-ip")],
    ["cf-connecting-ip", request.headers.get("cf-connecting-ip")],
  ];

  for (const [name, raw] of candidates) {
    if (!raw) continue;
    // x-forwarded-for headers can be a comma-separated chain; client IP is first.
    const first = raw.split(",")[0]?.trim();
    if (first) {
      console.log(`[http] extractClientIp: ${name}=${first}`);
      return first;
    }
  }

  console.warn(
    "[http] extractClientIp: no IP found in any candidate header — sending blank",
  );
  return "";
}
