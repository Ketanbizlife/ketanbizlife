import type { Metadata } from "next";
import Link from "next/link";
import { FooterMini } from "@/components/FooterMini";
import { Icon } from "@/components/Icon";
import { MamReapply } from "@/components/MamReapply";
import { clientConfig } from "@/client.config";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Order Confirmed — Ketan BizLife",
  description:
    "Your export tools are confirmed and on the way. Join the WhatsApp community for your Zoom link, reminders, and downloads.",
  robots: { index: false, follow: false },
};

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function parseBumpIds(raw: string | string[] | undefined): string[] {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value) return [];
  return value.split(",").map((s) => s.trim()).filter(Boolean);
}

export default async function OtoThankYouPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const ids = new Set(parseBumpIds(sp.bumps));
  const purchased = clientConfig.checkout.bumps.filter((b) => ids.has(b.id));
  const total = purchased.reduce((sum, b) => sum + b.price, 0);

  const oto = clientConfig.oto;
  const ty = oto.thankYou;
  const community = oto.whatsappCommunityUrl;

  return (
    <div className={styles.page}>
      {/* Re-fire MAM from the kbl_mam cookie so this pageview carries hashed
          identity (the browser Purchase already fired on /free/checkout). */}
      <MamReapply />

      <header className={styles.topNav}>
        <Link href={`/${clientConfig.funnel.slug}`} className={styles.back}>
          <span aria-hidden="true">←</span>
          <span>Back to home</span>
        </Link>
        <span className={styles.brandMark}>KETAN BIZLIFE</span>
      </header>

      {/* ============= Hero: confirmation ============= */}
      <section className={styles.heroBlock}>
        <div className={styles.heroBg} aria-hidden="true" />
        <div className={`container-narrow ${styles.heroInner}`}>
          <div className={styles.checkBadge} aria-hidden="true">
            <Icon name="check" size={40} />
          </div>
          <p className={styles.eyebrow}>{ty.eyebrow}</p>
          <h1 className={styles.heading}>{ty.heading}</h1>
          <p className={styles.lead}>{ty.lead}</p>
        </div>
      </section>

      {/* ============= Purchased items ============= */}
      {purchased.length > 0 ? (
        <section className={`light ${styles.orderBlock}`}>
          <div className="container-narrow">
            <h2 className={styles.blockHeading}>{ty.purchasedHeading}</h2>
            <ul className={styles.orderList}>
              {purchased.map((b) => (
                <li key={b.id} className={styles.orderItem}>
                  <span className={styles.orderThumb} aria-hidden="true">
                    {b.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={b.image} alt="" className={styles.orderThumbImg} />
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
            <div className={styles.orderTotalRow}>
              <span>Total paid</span>
              <span className={styles.orderTotalAmount}>₹{total}</span>
            </div>
          </div>
        </section>
      ) : null}

      {/* ============= Next steps ============= */}
      <section className={`light ${styles.stepsBlock}`}>
        <div className="container-narrow">
          <h2 className={styles.blockHeading}>{ty.stepsHeading}</h2>
          <ol className={styles.steps}>
            {ty.steps.map((step, i) => (
              <li key={i} className={styles.step}>
                <span className={styles.stepIndex} aria-hidden="true">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div>
                  <h3 className={styles.stepTitle}>{step.title}</h3>
                  <p className={styles.stepText}>{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ============= FINAL STEP: WhatsApp community (most important) ============= */}
      <section className={styles.waBlock}>
        <div className={`container-narrow ${styles.waInner}`}>
          <span className={styles.waStepTag}>Final step</span>
          <h2 className={styles.waHeading}>{ty.whatsappHeading}</h2>
          <p className={styles.waSub}>{ty.whatsappSub}</p>

          {community ? (
            <a
              href={community}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.waCta}
            >
              <span className={styles.waIcon} aria-hidden="true">
                <svg viewBox="0 0 32 32" width="26" height="26" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                  <path d="M16.001 4C9.374 4 4 9.373 4 16c0 2.115.555 4.184 1.612 6.005L4 28l6.156-1.594A11.94 11.94 0 0 0 16.001 28C22.628 28 28 22.627 28 16S22.628 4 16.001 4Zm0 21.818c-1.838 0-3.64-.493-5.221-1.427l-.374-.222-3.654.946.974-3.563-.244-.388A9.78 9.78 0 0 1 6.182 16c0-5.42 4.4-9.818 9.819-9.818 5.418 0 9.818 4.398 9.818 9.818 0 5.42-4.4 9.818-9.818 9.818Zm5.378-7.348c-.295-.148-1.745-.86-2.015-.96-.27-.098-.467-.148-.664.149-.196.295-.762.96-.934 1.158-.172.197-.344.221-.639.074-.295-.148-1.246-.46-2.373-1.466-.877-.783-1.469-1.749-1.641-2.044-.172-.296-.018-.456.13-.603.133-.133.295-.345.443-.517.148-.172.197-.295.295-.492.099-.197.05-.369-.024-.517-.074-.148-.664-1.605-.91-2.197-.239-.575-.483-.497-.664-.506l-.566-.01c-.197 0-.516.074-.787.369-.27.295-1.033 1.009-1.033 2.466 0 1.456 1.057 2.862 1.205 3.06.148.197 2.082 3.18 5.04 4.46.704.305 1.253.487 1.681.624.706.224 1.349.193 1.857.117.567-.085 1.745-.713 1.99-1.402.246-.689.246-1.279.172-1.402-.074-.123-.27-.197-.566-.345Z" />
                </svg>
              </span>
              <span>{ty.whatsappCtaLabel}</span>
              <span className={styles.waArrow} aria-hidden="true">→</span>
            </a>
          ) : null}

          <p className={styles.closing}>{ty.closing}</p>
        </div>
      </section>

      {/* Spacer so the floating WhatsApp bar never covers the footer. */}
      {community ? <div className={styles.waFloatSpacer} /> : null}

      <FooterMini brand={clientConfig.brand} footer={clientConfig.footer} />

      {/* ============= FLOATING WhatsApp join — always visible while scrolling ============= */}
      {community ? (
        <div className={styles.waFloat} role="region" aria-label="Join the WhatsApp community">
          <a
            href={community}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.waFloatBtn}
          >
            <span className={styles.waFloatIcon} aria-hidden="true">
              <svg viewBox="0 0 32 32" width="24" height="24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                <path d="M16.001 4C9.374 4 4 9.373 4 16c0 2.115.555 4.184 1.612 6.005L4 28l6.156-1.594A11.94 11.94 0 0 0 16.001 28C22.628 28 28 22.627 28 16S22.628 4 16.001 4Zm0 21.818c-1.838 0-3.64-.493-5.221-1.427l-.374-.222-3.654.946.974-3.563-.244-.388A9.78 9.78 0 0 1 6.182 16c0-5.42 4.4-9.818 9.819-9.818 5.418 0 9.818 4.398 9.818 9.818 0 5.42-4.4 9.818-9.818 9.818Zm5.378-7.348c-.295-.148-1.745-.86-2.015-.96-.27-.098-.467-.148-.664.149-.196.295-.762.96-.934 1.158-.172.197-.344.221-.639.074-.295-.148-1.246-.46-2.373-1.466-.877-.783-1.469-1.749-1.641-2.044-.172-.296-.018-.456.13-.603.133-.133.295-.345.443-.517.148-.172.197-.295.295-.492.099-.197.05-.369-.024-.517-.074-.148-.664-1.605-.91-2.197-.239-.575-.483-.497-.664-.506l-.566-.01c-.197 0-.516.074-.787.369-.27.295-1.033 1.009-1.033 2.466 0 1.456 1.057 2.862 1.205 3.06.148.197 2.082 3.18 5.04 4.46.704.305 1.253.487 1.681.624.706.224 1.349.193 1.857.117.567-.085 1.745-.713 1.99-1.402.246-.689.246-1.279.172-1.402-.074-.123-.27-.197-.566-.345Z" />
              </svg>
            </span>
            <span className={styles.waFloatText}>{ty.whatsappCtaLabel}</span>
            <span className={styles.waArrow} aria-hidden="true">→</span>
          </a>
        </div>
      ) : null}
    </div>
  );
}
