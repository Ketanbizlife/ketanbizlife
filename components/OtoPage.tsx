"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import type { ClientConfig } from "@/client.config";
import { Icon } from "./Icon";
import styles from "./OtoPage.module.css";

interface Props {
  config: ClientConfig;
}

export function OtoPage({ config }: Props) {
  const router = useRouter();
  const oto = config.oto;
  const bumps = config.checkout.bumps;
  const bundleId = useMemo(() => bumps.find((b) => b.isBundle)?.id, [bumps]);
  const individualBumps = useMemo(
    () => bumps.filter((b) => !b.isBundle),
    [bumps],
  );

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  function toggle(id: string, isBundle: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        return next;
      }
      if (isBundle) return new Set([id]);
      if (bundleId) next.delete(bundleId);
      next.add(id);
      return next;
    });
  }

  const selectedItems = useMemo(
    () => bumps.filter((b) => selected.has(b.id)),
    [bumps, selected],
  );
  const total = useMemo(
    () => selectedItems.reduce((sum, b) => sum + b.price, 0),
    [selectedItems],
  );
  const bundleSelected = selectedItems.some((b) => b.isBundle);
  const individualSelected = selectedItems.filter((b) => !b.isBundle);

  function goToCheckout() {
    if (selectedItems.length === 0) return;
    const ids = selectedItems.map((b) => b.id).join(",");
    router.push(`/${config.funnel.slug}/checkout?bumps=${encodeURIComponent(ids)}`);
  }

  function scrollToPerks() {
    document.getElementById("oto-perks")?.scrollIntoView({ behavior: "smooth" });
  }

  return (
    <div className={styles.page}>
      <header className={styles.topNav}>
        <span className={styles.brandMark}>KETAN BIZLIFE</span>
        <span className={styles.navBadge}>{oto.badge}</span>
      </header>

      {/* ============= HERO ============= */}
      <section className={styles.hero}>
        <div className={styles.heroBg} aria-hidden="true" />
        <div className={`container-narrow ${styles.heroInner}`}>
          <span className={styles.heroBadge}>
            <span className={styles.heroBadgeDot} aria-hidden="true" />
            {oto.badge}
          </span>
          <p className={styles.eyebrow}>{oto.eyebrow}</p>
          <h1 className={styles.heroHeading}>{oto.heading}</h1>
          <p className={styles.heroSub}>{oto.subheading}</p>

          <div className={styles.heroCtas}>
            <button type="button" className={styles.primaryCta} onClick={scrollToPerks}>
              <span>See the tools</span>
              <span className={styles.ctaArrow} aria-hidden="true">↓</span>
            </button>
            <a href={`/${config.funnel.slug}/thank-you`} className={styles.skipLink}>
              {oto.skipText}
            </a>
          </div>
        </div>
      </section>

      {/* ============= PERKS (selectable, 2x2) ============= */}
      <section id="oto-perks" className={`light ${styles.perksSection}`}>
        <div className="container">
          <h2 className={styles.perksHeading}>{oto.perksHeading}</h2>
          <p className={styles.perksSub}>{oto.perksSubheading}</p>

          <div className={styles.perksGrid}>
            {bumps.map((bump) => {
              const isSelected = selected.has(bump.id);
              return (
                <div
                  key={bump.id}
                  role="button"
                  tabIndex={0}
                  aria-pressed={isSelected}
                  onClick={() => toggle(bump.id, !!bump.isBundle)}
                  onKeyDown={(e) => {
                    if (e.key === " " || e.key === "Enter") {
                      e.preventDefault();
                      toggle(bump.id, !!bump.isBundle);
                    }
                  }}
                  className={[
                    styles.perkCard,
                    isSelected ? styles.perkCardSelected : "",
                    bump.isBundle ? styles.perkCardBundle : "",
                  ].join(" ")}
                >
                  <span
                    className={`${styles.perkCheck} ${isSelected ? styles.perkCheckOn : ""}`}
                    aria-hidden="true"
                  >
                    {isSelected ? <Icon name="check" size={16} /> : null}
                  </span>

                  <div className={styles.perkVisual}>
                    {bump.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={bump.image}
                        alt=""
                        className={styles.perkImg}
                        loading="lazy"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).style.display = "none";
                        }}
                      />
                    ) : null}
                    <span
                      className={`${styles.perkTagline} ${bump.isBundle ? styles.perkTaglineBundle : ""}`}
                    >
                      {bump.tagline}
                    </span>
                  </div>

                  <div className={styles.perkBody}>
                    <h3 className={styles.perkTitle}>{bump.title}</h3>
                    {bump.otoTagline ? (
                      <p className={styles.perkDesc}>{bump.otoTagline}</p>
                    ) : null}

                    <ul className={styles.perkBullets}>
                      {bump.bullets.slice(0, 3).map((b, i) => (
                        <li key={i}>
                          <span className={styles.perkTick} aria-hidden="true">
                            <Icon name="check" size={12} />
                          </span>
                          <span>{b}</span>
                        </li>
                      ))}
                    </ul>

                    <div className={styles.perkFoot}>
                      <span className={styles.perkPrice}>₹{bump.price}</span>
                      <span
                        className={`${styles.perkState} ${isSelected ? styles.perkStateOn : ""}`}
                      >
                        {isSelected ? (
                          <>
                            <Icon name="check" size={14} />
                            <span>Added</span>
                          </>
                        ) : (
                          <span>Tap to add</span>
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ============= FOUNDER ============= */}
      <section className={styles.founderSection}>
        <div className={`container ${styles.founderInner}`}>
          <h2 className={styles.founderHeading}>{oto.founderHeading}</h2>
          <div className={styles.founderCard}>
            <div className={styles.founderPhoto}>
              <Image
                src={oto.founder.image}
                alt={oto.founder.name}
                fill
                sizes="(min-width: 768px) 320px, 60vw"
                className={styles.founderImg}
              />
            </div>
            <div className={styles.founderBody}>
              <h3 className={styles.founderName}>{oto.founder.name}</h3>
              <p className={styles.founderRole}>{oto.founder.role}</p>
              {oto.founder.bio.map((p, i) => (
                <p key={i} className={styles.founderText}>
                  {p}
                </p>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ============= FAQ (accordion) ============= */}
      <section className={`light ${styles.faqSection}`}>
        <div className="container-narrow">
          <h2 className={styles.faqHeading}>{oto.faqHeading}</h2>
          <div className={styles.faqList}>
            {oto.faq.map((item, i) => {
              const isOpen = openFaq === i;
              return (
                <div key={i} className={`${styles.faqItem} ${isOpen ? styles.faqItemOpen : ""}`}>
                  <button
                    type="button"
                    className={styles.faqQ}
                    aria-expanded={isOpen}
                    aria-controls={`oto-faq-${i}`}
                    onClick={() => setOpenFaq(isOpen ? null : i)}
                  >
                    <span>{item.question}</span>
                    <span className={`${styles.faqChevron} ${isOpen ? styles.faqChevronOpen : ""}`} aria-hidden="true">
                      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M6 9l6 6 6-6" />
                      </svg>
                    </span>
                  </button>
                  <div
                    id={`oto-faq-${i}`}
                    className={styles.faqAnswer}
                    hidden={!isOpen}
                  >
                    <p className={styles.faqA}>{item.answer}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ============= CLOSING ============= */}
      <section className={styles.closingSection}>
        <div className={`container-narrow ${styles.closingInner}`}>
          <h2 className={styles.closingHeading}>{oto.closingHeading}</h2>
          <p className={styles.closingBody}>{oto.closingBody}</p>
          <button type="button" className={styles.primaryCta} onClick={scrollToPerks}>
            <span>Choose your tools</span>
            <span className={styles.ctaArrow} aria-hidden="true">↑</span>
          </button>
        </div>
      </section>

      {/* Spacer so the floating cart never covers closing content. */}
      {selectedItems.length > 0 ? <div className={styles.floatSpacer} /> : null}

      {/* ============= FLOATING CART (detached card) ============= */}
      {selectedItems.length > 0 ? (
        <div className={styles.floatWrap} role="region" aria-label="Your selection">
          <div
            className={`${styles.floatCard} ${bundleSelected ? styles.floatCardMega : ""}`}
          >
            {bundleSelected ? (
              <div className={styles.megaBody}>
                <span className={styles.megaRibbon}>★ Most Recommended · Best Value</span>
                <div className={styles.megaMain}>
                  <div className={styles.megaThumbs} aria-hidden="true">
                    {individualBumps.map((b) => (
                      <span key={b.id} className={styles.megaThumb}>
                        {b.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={b.image}
                            alt=""
                            className={styles.floatThumbImg}
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).style.display = "none";
                            }}
                          />
                        ) : null}
                      </span>
                    ))}
                  </div>
                  <div className={styles.megaMeta}>
                    <span className={styles.megaTitle}>The Export Closer&apos;s Pack</span>
                    <span className={styles.megaSub}>All 3 tools in one · biggest saving</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className={styles.floatHead}>
                <span className={styles.floatCount}>
                  {individualSelected.length} tool{individualSelected.length === 1 ? "" : "s"} selected
                </span>
                <ul className={styles.floatItems}>
                  {individualSelected.map((b) => (
                    <li key={b.id} className={styles.floatItem}>
                      <span className={styles.floatThumb} aria-hidden="true">
                        {b.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={b.image}
                            alt=""
                            className={styles.floatThumbImg}
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).style.display = "none";
                            }}
                          />
                        ) : null}
                      </span>
                      <span className={styles.floatItemName}>{b.title}</span>
                      <span className={styles.floatItemPrice}>₹{b.price}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className={styles.floatFoot}>
              <div className={styles.floatTotal}>
                <span className={styles.floatTotalLabel}>Total</span>
                <span className={styles.floatTotalValue}>₹{total}</span>
              </div>
              <button type="button" className={styles.floatCta} onClick={goToCheckout}>
                <span>{oto.stickyCtaText}</span>
                <span className={styles.ctaArrow} aria-hidden="true">→</span>
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
