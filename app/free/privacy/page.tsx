import type { Metadata } from "next";
import Link from "next/link";
import { FooterMini } from "@/components/FooterMini";
import { Icon, type IconName } from "@/components/Icon";
import { clientConfig } from "@/client.config";
import styles from "../legal.module.css";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: `Privacy policy for ${clientConfig.brand.name}.`,
  robots: { index: true, follow: true },
};

interface Section {
  icon: IconName;
  title: string;
  body: React.ReactNode;
}

export default function PrivacyPage() {
  const sections: Section[] = [
    {
      icon: "file-text",
      title: "Information we collect",
      body: (
        <>
          <p>
            When you register for our free webinar, we collect: first name, last
            name, email, phone number with country code, city, and standard UTM
            tracking parameters from your visit. Each registration is assigned a
            unique lead ID for our records.
          </p>
          <p>
            <strong>The webinar is free — we never ask for payment.</strong> We
            do not collect, process, or store any card, bank, or payment
            information at any point.
          </p>
        </>
      ),
    },
    {
      icon: "info",
      title: "How we use information",
      body: (
        <ul>
          <li>
            To deliver the webinar (Zoom link, reminders) via WhatsApp and
            email.
          </li>
          <li>
            To send relevant follow-up content and post-webinar materials
            including the bonus toolkits.
          </li>
          <li>
            To improve our advertising via the Meta Conversions API using
            hashed identifiers only.
          </li>
          <li>
            To analyse site usage via Google Analytics and Microsoft Clarity
            (anonymized; no PII).
          </li>
        </ul>
      ),
    },
    {
      icon: "globe",
      title: "Sharing & third-party processors",
      body: (
        <>
          <p>
            <strong>We do not sell your data.</strong> We share data only with
            the processors required to deliver the service and measure
            performance:
          </p>
          <ul>
            <li>
              Pabbly Connect — automation routing to our CRM and WhatsApp
              delivery.
            </li>
            <li>
              Meta — hashed identifiers for ad attribution (Conversions API).
            </li>
            <li>Google Analytics — anonymized site analytics.</li>
            <li>Microsoft Clarity — anonymized session insights.</li>
          </ul>
        </>
      ),
    },
    {
      icon: "lock",
      title: "Security",
      body: (
        <p>
          We use HTTPS in transit and access-controlled storage for customer
          records. Because the webinar is free, we never request or handle any
          payment, card, or bank information.
        </p>
      ),
    },
    {
      icon: "shield",
      title: "Your rights",
      body: (
        <p>
          You can request access, correction, or deletion of your personal data
          at any time by emailing us. We respond within 30 days. You can also
          opt out of marketing communications using the unsubscribe link in any
          email you receive from us.
        </p>
      ),
    },
    {
      icon: "refresh",
      title: "Updates to this policy",
      body: (
        <p>
          We may update this policy from time to time. The &ldquo;Last
          updated&rdquo; date at the top of the page reflects the most recent
          revision. Material changes will be communicated to registered
          participants by email.
        </p>
      ),
    },
  ];

  return (
    <div className={styles.page}>
      <header className={styles.topNav}>
        <Link href={`/${clientConfig.funnel.slug}`} className={styles.back}>
          <span aria-hidden="true">←</span>
          <span>Back to webinar</span>
        </Link>
        <span className={styles.brandMark}>KETAN BIZLIFE</span>
      </header>

      {/* ============= Hero (dark) ============= */}
      <section className={styles.heroBlock}>
        <div className={styles.heroBg} aria-hidden="true" />
        <div className={`container-narrow ${styles.heroInner}`}>
          <div className={styles.heroBadge} aria-hidden="true">
            <Icon name="shield" size={32} />
            <span className={styles.heroBadgeRing} />
            <span className={styles.heroBadgeRingTwo} />
          </div>

          <span className={styles.heroEyebrow}>
            <span className={styles.heroEyebrowDot} aria-hidden="true" />
            Legal · Privacy
          </span>

          <h1 className={styles.heroTitle}>Privacy Policy</h1>

          <p className={styles.heroSub}>
            What we collect, how we use it, and the choices you have. Plain
            English, no dark patterns.
          </p>

          <p className={styles.heroMeta}>
            <span>Last updated</span>
            <span className={styles.heroMetaDot} aria-hidden="true" />
            <span>May 16, 2026</span>
          </p>
        </div>
      </section>

      {/* ============= Body (light) ============= */}
      <section className={`light ${styles.bodyBlock}`}>
        <div className={`container-narrow ${styles.bodyInner}`}>
          <div className={styles.intro}>
            <p>
              <strong>{clientConfig.brand.name}</strong> (&ldquo;we&rdquo;,
              &ldquo;our&rdquo;) operates {clientConfig.brand.domain} (the
              &ldquo;Site&rdquo;) and the associated webinar registration
              funnel. This policy explains what information we collect, how we
              use it, and the choices you have.
            </p>
          </div>

          <div className={styles.sections}>
            {sections.map((s) => (
              <article key={s.title} className={styles.section}>
                <span className={styles.sectionIcon} aria-hidden="true">
                  <Icon name={s.icon} size={22} />
                </span>
                <div className={styles.sectionHeader}>
                  <h2 className={styles.sectionTitle}>{s.title}</h2>
                </div>
                <div className={styles.sectionBody}>{s.body}</div>
              </article>
            ))}
          </div>

          <div className={styles.contact}>
            <span className={styles.contactIcon} aria-hidden="true">
              <Icon name="mail" size={24} />
            </span>
            <div>
              <h3 className={styles.contactTitle}>Privacy questions?</h3>
              <p className={styles.contactBody}>
                Email{" "}
                <a href="mailto:support@ketanbizlife.com">
                  support@ketanbizlife.com
                </a>{" "}
                — we respond within 30 days.
              </p>
            </div>
          </div>
        </div>
      </section>

      <FooterMini brand={clientConfig.brand} footer={clientConfig.footer} />
    </div>
  );
}
