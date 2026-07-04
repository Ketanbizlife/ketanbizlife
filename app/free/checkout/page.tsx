import type { Metadata } from "next";
import Link from "next/link";
import { CheckoutForm } from "@/components/CheckoutForm";
import { FooterMini } from "@/components/FooterMini";
import { Icon } from "@/components/Icon";
import { UtmTracker } from "@/components/UtmTracker";
import { clientConfig } from "@/client.config";
import { getCashfreeMode } from "@/lib/cashfree";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Complete Your Order — Ketan BizLife",
  description:
    "Secure one-time payment for your selected export tools. Delivered digitally right after payment.",
  robots: { index: false, follow: false },
};

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function parseBumpIds(raw: string | string[] | undefined): string[] {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value) return [];
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export default async function CheckoutPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const initialBumpIds = parseBumpIds(sp.bumps);
  const cashfreeMode = getCashfreeMode();

  return (
    <div className={styles.page}>
      <UtmTracker storageKey={clientConfig.funnel.sessionStorageKey} />

      <header className={styles.topNav}>
        <Link href={`/${clientConfig.funnel.slug}/oto`} className={styles.back}>
          <span aria-hidden="true">←</span>
          <span>Back to offer</span>
        </Link>
        <span className={styles.brandMark}>KETAN BIZLIFE</span>
      </header>

      {/* ====== Dark hero ====== */}
      <section className={`${styles.section} ${styles.headerBlock}`}>
        <div className={styles.heroBg} aria-hidden="true" />
        <div className="container">
          <div className={styles.headerInner}>
            <span className={styles.heroBadge}>
              <Icon name="lock" size={13} />
              Secure Checkout · One-Time Offer
            </span>
            <h1 className={styles.productTitle}>Confirm your order</h1>
            <p className={styles.productMeta}>
              One-time payment · Instant digital delivery on WhatsApp &amp; email.
              Takes 30 seconds.
            </p>
          </div>
        </div>
      </section>

      {/* ====== FORM + ORDER SUMMARY ====== */}
      <section className={`light ${styles.section} ${styles.checkoutBlock}`}>
        <div className="container">
          <CheckoutForm
            config={clientConfig}
            mode={cashfreeMode}
            initialBumpIds={initialBumpIds}
          />

          <p className={styles.secureNote}>
            <Icon name="shield" size={16} />
            <span>PCI-DSS secure payment by Cashfree · Your card details never touch our servers</span>
          </p>
        </div>
      </section>

      <FooterMini brand={clientConfig.brand} footer={clientConfig.footer} />
    </div>
  );
}
