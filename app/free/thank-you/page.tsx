import type { Metadata } from "next";
import Link from "next/link";
import { Countdown } from "@/components/Countdown";
import { FooterMini } from "@/components/FooterMini";
import { Icon } from "@/components/Icon";
import { MamReapply } from "@/components/MamReapply";
import { clientConfig } from "@/client.config";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "You're In — See You Sunday",
  description:
    "Your seat is reserved for the Indian Export Insider Workshop. Zoom link, calendar invite, and next steps inside.",
  robots: {
    index: false,
    follow: false,
  },
};

/**
 * Builds a Google Calendar "Add Event" URL.
 * Reads the webinar start time + duration from clientConfig (env-driven).
 */
function buildGoogleCalendarUrl(): string {
  const start = new Date(clientConfig.event.countdownTargetISO);
  const end = new Date(
    start.getTime() + clientConfig.event.durationMinutes * 60 * 1000,
  );

  // Format: YYYYMMDDTHHmmssZ (Google accepts UTC stamps)
  const fmt = (d: Date) =>
    d
      .toISOString()
      .replace(/[-:]/g, "")
      .replace(/\.\d{3}/, "");

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: "Indian Export Insider Workshop — Ketan BizLife",
    dates: `${fmt(start)}/${fmt(end)}`,
    details:
      "Live 3-hour webinar on the system Ketan uses across 2 export brands to find genuine international buyers. The Zoom link arrives on WhatsApp 30 minutes before the start time.",
    location: "Live on Zoom (link via WhatsApp)",
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export default function ThankYouPage() {
  const community = clientConfig.community.whatsappGroupUrl;
  const calendarUrl = buildGoogleCalendarUrl();

  const infoCards = [
    {
      icon: "calendar" as const,
      label: "Date",
      value: clientConfig.event.dateLabel,
    },
    {
      icon: "clock" as const,
      label: "Time",
      value: clientConfig.event.timeLabel,
    },
    {
      icon: "video" as const,
      label: "Venue",
      value: clientConfig.event.platform,
    },
    {
      icon: "globe" as const,
      label: "Language",
      value: clientConfig.event.language,
    },
  ];

  const nextSteps = [
    {
      icon: "calendar" as const,
      title: "Save the date",
      body: "Block 3 hours on Sunday morning. Add the workshop to your calendar with one tap below.",
    },
    {
      icon: "message" as const,
      title: "Check WhatsApp",
      body: "Confirmation arrives at the number you used to register. The Zoom link reaches you 30 minutes before the session.",
    },
    {
      icon: "lightbulb" as const,
      title: "Bring a notebook",
      body: "The framework walkthrough and the live Q&A are where you'll want to write things down — specific to your product and country.",
    },
    {
      icon: "user" as const,
      title: "Camera optional",
      body: "Hindi me hoga. Camera off is fine. Just join and listen.",
    },
  ];

  return (
    <div className={styles.page}>
      {/* Safety net: re-fire MAM from kbl_mam cookie in case the inline
          pixel script ran before the cookie was written during the
          /checkout → /thank-you redirect. Renders nothing. */}
      <MamReapply />

      <header className={styles.topNav}>
        <Link href={`/${clientConfig.funnel.slug}`} className={styles.back}>
          <span aria-hidden="true">←</span>
          <span>Back to home</span>
        </Link>
        <span className={styles.brandMark}>KETAN BIZLIFE</span>
      </header>

      {/* ============= Hero: big celebration + countdown (dark) ============= */}
      <section className={styles.heroBlock}>
        <div className={styles.heroBg} aria-hidden="true" />
        <div className={`container-narrow ${styles.heroInner}`}>
          <div className={styles.checkBadge} aria-hidden="true">
            <Icon name="check" size={40} />
            <span className={styles.checkRing} />
            <span className={styles.checkRingTwo} />
          </div>

          <p className={styles.eyebrow}>Registration confirmed</p>
          <h1 className={styles.heading}>You&apos;re in.</h1>
          <p className={styles.lead}>
            Your seat for the Indian Export Insider Workshop is reserved.
            Welcome to the team that doesn&apos;t play the wrong game anymore.
          </p>

          <div className={styles.countdownCard}>
            <Countdown
              targetISO={clientConfig.event.countdownTargetISO}
              label="Webinar starts in"
            />
          </div>

          {community ? (
            <Link
              href={community}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.heroWhatsapp}
            >
              <span className={styles.heroWaIcon} aria-hidden="true">
                <svg
                  viewBox="0 0 32 32"
                  width="28"
                  height="28"
                  fill="currentColor"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M16.001 4C9.374 4 4 9.373 4 16c0 2.115.555 4.184 1.612 6.005L4 28l6.156-1.594A11.94 11.94 0 0 0 16.001 28C22.628 28 28 22.627 28 16S22.628 4 16.001 4Zm0 21.818c-1.838 0-3.64-.493-5.221-1.427l-.374-.222-3.654.946.974-3.563-.244-.388A9.78 9.78 0 0 1 6.182 16c0-5.42 4.4-9.818 9.819-9.818 5.418 0 9.818 4.398 9.818 9.818 0 5.42-4.4 9.818-9.818 9.818Zm5.378-7.348c-.295-.148-1.745-.86-2.015-.96-.27-.098-.467-.148-.664.149-.196.295-.762.96-.934 1.158-.172.197-.344.221-.639.074-.295-.148-1.246-.46-2.373-1.466-.877-.783-1.469-1.749-1.641-2.044-.172-.296-.018-.456.13-.603.133-.133.295-.345.443-.517.148-.172.197-.295.295-.492.099-.197.05-.369-.024-.517-.074-.148-.664-1.605-.91-2.197-.239-.575-.483-.497-.664-.506l-.566-.01c-.197 0-.516.074-.787.369-.27.295-1.033 1.009-1.033 2.466 0 1.456 1.057 2.862 1.205 3.06.148.197 2.082 3.18 5.04 4.46.704.305 1.253.487 1.681.624.706.224 1.349.193 1.857.117.567-.085 1.745-.713 1.99-1.402.246-.689.246-1.279.172-1.402-.074-.123-.27-.197-.566-.345Z" />
                </svg>
                <span className={styles.heroWaPulse} aria-hidden="true" />
                <span className={styles.heroWaPulseTwo} aria-hidden="true" />
              </span>
              <span className={styles.heroWaCopy}>
                <span className={styles.heroWaTitle}>
                  Join the WhatsApp community
                  <span className={styles.heroWaDot} aria-hidden="true" />
                </span>
                <span className={styles.heroWaSub}>
                  Zoom link, reminders & live Q&amp;A queue drop here
                </span>
              </span>
              <span className={styles.heroWaCta} aria-hidden="true">
                Join
                <span className={styles.heroWaArrow}>→</span>
              </span>
            </Link>
          ) : null}
        </div>
      </section>

      {/* ============= Event details + add-to-calendar (light) ============= */}
      <section className={`light ${styles.detailsBlock}`}>
        <div className={`container-narrow ${styles.detailsInner}`}>
          <div className={styles.detailsHeader}>
            <h2 className={styles.detailsHeading}>Event details</h2>
            <a
              href={calendarUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.calendarCta}
            >
              <span className={styles.calendarIcon} aria-hidden="true">
                <Icon name="calendar" size={16} />
              </span>
              <span>Add to Google Calendar</span>
            </a>
          </div>

          <div className={styles.infoGrid}>
            {infoCards.map((card) => (
              <div key={card.label} className={styles.infoCard}>
                <span className={styles.infoIcon} aria-hidden="true">
                  <Icon name={card.icon} size={18} />
                </span>
                <span className={styles.infoLabel}>{card.label}</span>
                <span className={styles.infoValue}>{card.value}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============= Next steps (light) ============= */}
      <section className={`light ${styles.stepsBlock}`}>
        <div className={`container-narrow ${styles.stepsInner}`}>
          <h2 className={styles.stepsHeading}>What happens next</h2>
          <ol className={styles.steps}>
            {nextSteps.map((step, i) => (
              <li key={i} className={styles.step}>
                <span className={styles.stepIndex} aria-hidden="true">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className={styles.stepBody}>
                  <div className={styles.stepTitleRow}>
                    <span className={styles.stepIcon} aria-hidden="true">
                      <Icon name={step.icon} size={16} />
                    </span>
                    <h3 className={styles.stepTitle}>{step.title}</h3>
                  </div>
                  <p className={styles.stepText}>{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ============= Signoff (light) ============= */}
      <section className={`light ${styles.signoffBlock}`}>
        <div className={`container-narrow ${styles.signoffInner}`}>
          <span className={styles.signoffRule} aria-hidden="true" />
          <p className={styles.signoff}>See you Sunday.</p>
          <p className={styles.signoffName}>— Ketan</p>
        </div>
      </section>

      <FooterMini brand={clientConfig.brand} footer={clientConfig.footer} />
    </div>
  );
}
