"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { trackGa4EventOnce } from "@/lib/ga4";

interface Props {
  href: string;
  className?: string;
  children: ReactNode;
}

/**
 * Client wrapper around the /free/thank-you WhatsApp community button. Exists
 * only to attach a GA4 `join_whatsapp` onClick to what is otherwise a static
 * anchor on a Server Component page — wrapping just this link keeps the page
 * itself a Server Component.
 *
 * The link opens in a NEW tab (target="_blank"), so the /thank-you tab stays
 * alive and a synchronous gtag call fires cleanly — no sendBeacon needed.
 * trackGa4EventOnce enforces the once-per-browser dedup, so repeat clicks or
 * return visits don't re-count.
 */
export function JoinWhatsappLink({ href, className, children }: Props) {
  return (
    <Link
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      onClick={() => trackGa4EventOnce("join_whatsapp")}
    >
      {children}
    </Link>
  );
}
