import Image from "next/image";
import type { ClientConfig } from "@/client.config";
import { CTAButton } from "./CTAButton";
import { Countdown } from "./Countdown";
import { HindiBanner } from "./HindiBanner";
import { Icon, type IconName } from "./Icon";
import { MastheadMarquee } from "./MastheadMarquee";
import { TrustLine } from "./TrustLine";
import styles from "./Hero.module.css";

interface Props {
  hero: ClientConfig["hero"];
  event: ClientConfig["event"];
  /** Reserved for backward compatibility — no longer rendered on the free funnel. */
  showRefundLine: boolean;
}

interface InfoCard {
  icon: IconName;
  label: string;
  value: string;
}

export function Hero({ hero, event }: Props) {
  // Built inside the component so it picks up env-driven date/time on every
  // render. (Previously this lived as a module-level const with the date
  // hardcoded — meaning Vercel env changes never reached the marquee.)
  const mastheadItems = [
    "Ketan BizLife",
    "For Indian Manufacturers, Traders & Sourcing Agents Doing Goods Export",
    "The Indian Export Insider Workshop",
    `Live · ${event.dateLabel} · ${event.timeLabel}`,
    "Hindi · Zoom · 3 Hours · Free entry",
  ];

  const infoCards: InfoCard[] = [
    { icon: "calendar", label: "Date", value: event.dateShortLabel },
    { icon: "clock", label: "Time", value: event.timeLabel },
    { icon: "video", label: "Venue", value: "Live on Zoom" },
    { icon: "user", label: "Host", value: "Ketan Vadariya" },
  ];

  return (
    <>
      <MastheadMarquee items={mastheadItems} />

      <header id="hero" className={styles.hero}>
        <div className={styles.bg} aria-hidden="true">
          <div className={styles.gridGlow} />
        </div>
        <div className={styles.drift} aria-hidden="true" />

        <div className={styles.split}>
          {/* Top of copy column — Hindi banner + headline only. */}
          <div className={styles.copyTop}>
            <HindiBanner text={hero.hindiBanner} />

            <h1 className={styles.headline}>
              <span className={styles.headlineLead}>{hero.headlineLead}</span>
              {hero.headlinePunchLines.map((line, i) => (
                <span key={i} className={styles.headlinePunch}>
                  {line}
                </span>
              ))}
            </h1>
          </div>

          {/* Stat block — on mobile sits directly under the headline, ABOVE
              Ketan's portrait. On desktop the grid-template-areas place it
              independently of this DOM order, so desktop layout is unchanged. */}
          <div className={styles.stat}>
            <p className={styles.statHeadline}>{hero.statHeadline}</p>
            {hero.statLines.map((line, i) => (
              <p key={i} className={styles.statLine}>
                {line}
              </p>
            ))}
          </div>

          {/* Portrait card — solo on the right column at desktop, between
              headline and info grid on mobile. */}
          <figure className={styles.portraitCard}>
            {/* Mobile-only: landscape hero image sits at the very top of the
                card; the new artwork already carries the name/role lockup. */}
            <div className={styles.mobileImageFrame}>
              <Image
                src="/ketan-hero-new.webp"
                alt="Ketan Vadariya — The Export Unstuck"
                width={1456}
                height={1092}
                priority
                sizes="(max-width: 767px) calc(100vw - 74px), 480px"
                className={styles.mobileImage}
              />
            </div>

            {/* Mobile-only solution copy — sits below the image, inside the
                card. Two-line punch summary of the offer. */}
            <div className={styles.mobileSolutionBelow}>
              <p className={styles.mobileSolutionLead}>
                <span className={styles.mobileSolutionAccent}>2 proven</span>{" "}
                buyer-finding systems
              </p>
              <p className={styles.mobileSolutionTail}>
                to land genuine international orders.
              </p>
            </div>

            {/* Desktop-only structure follows. */}
            <div className={styles.portraitTopRow}>
              <span className={styles.portraitBrand}>KETAN BIZLIFE</span>
              <span className={styles.portraitLive}>
                <span
                  className={styles.portraitLiveDot}
                  aria-hidden="true"
                />
                LIVE
              </span>
            </div>

            <p className={styles.portraitTagline}>
              Every Indian Exporter Who Cracked Their First International
              Order Had a System. Do You?
            </p>

            <div className={styles.portraitImageFrame}>
              <Image
                src="/ketan-hero.jpeg"
                alt="Ketan Vadariya, Export Mentor"
                fill
                priority
                sizes="(min-width: 1024px) 480px, 100vw"
                className={styles.portraitImage}
              />
              <div
                className={styles.portraitImageVignette}
                aria-hidden="true"
              />
              <div
                className={styles.portraitImageBottom}
                aria-hidden="true"
              />

              <p className={styles.portraitOverlayText}>
                2 proven buyer-finding systems that can help you get genuine
                international orders.{" "}
                <em>
                  Wahi system jo Mein 10+ saal se 2 export brands ke saath
                  use kar raha hoon.
                </em>
              </p>

              <figcaption className={styles.portraitCaption}>
                <span className={styles.portraitName}>KETAN VADARIYA</span>
                <span className={styles.portraitRole}>
                  EXPORT MENTOR · 10+ YEARS
                </span>
              </figcaption>
            </div>
          </figure>

          {/* Info grid — mobile: after the portrait. Desktop: bottom of the
              left column (placed via grid-area). */}
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

          {/* Bottom of copy column — countdown + CTA. */}
          <div className={styles.copyBottom}>
            <div className={styles.countdownWrap}>
              <span className={styles.eventInLabel}>Event in</span>
              <Countdown
                targetISO={event.countdownTargetISO}
                label=""
              />
            </div>

            <div className={styles.ctaRow}>
              <CTAButton
                opensRegister
                variant="primary"
                size="large"
                withArrow
                ariaLabel={hero.primaryCtaText}
              >
                {hero.primaryCtaText}
              </CTAButton>
              <TrustLine text={hero.trustLine} refundLine={null} />

              <div className={styles.withoutBlock}>
                <p className={styles.withoutKicker}>{hero.withoutHeading}</p>
                <ul
                  className={styles.withoutStrip}
                  aria-label={hero.withoutHeading}
                >
                  {hero.withoutItems.map((item) => (
                    <li key={item} className={styles.withoutChip}>
                      <span className={styles.withoutIcon} aria-hidden="true">
                        ×
                      </span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </header>
    </>
  );
}
