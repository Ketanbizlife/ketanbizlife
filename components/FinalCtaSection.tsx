import type { ClientConfig } from "@/client.config";
import { CTAButton } from "./CTAButton";
import { Icon } from "./Icon";
import { ScrollReveal } from "./ScrollReveal";
import styles from "./FinalCtaSection.module.css";

interface Props {
  finalCta: ClientConfig["finalCta"];
}

export function FinalCtaSection({ finalCta }: Props) {
  return (
    <section
      className={`alt ${styles.section}`}
      aria-labelledby="final-cta-heading"
    >
      <div className="container-narrow">
        <ScrollReveal>
          <h2 id="final-cta-heading" className={styles.heading}>
            {finalCta.heading}
          </h2>
        </ScrollReveal>

        <ScrollReveal delay={0.08}>
          <div className={styles.guaranteeRow}>
            <span className={styles.guaranteeIcon} aria-hidden="true">
              <Icon name="shield" size={18} />
            </span>
            <span>{finalCta.guaranteeLine}</span>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={0.16}>
          <div className={styles.antiQualifier}>
            <h3 className={styles.antiQualifierHeading}>
              {finalCta.antiQualifierHeading}
            </h3>
            <ul className={styles.antiQualifierList}>
              {finalCta.antiQualifierItems.map((item, i) => (
                <li key={i} className={styles.antiQualifierItem}>
                  <span className={styles.cross} aria-hidden="true">
                    ×
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={0.24}>
          <p className={styles.closing}>{finalCta.closing}</p>
        </ScrollReveal>

        <ScrollReveal delay={0.3}>
          <div className={styles.ctaWrap}>
            <CTAButton
              opensRegister
              variant="primary"
              size="large"
              withArrow
            >
              {finalCta.ctaText}
            </CTAButton>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={0.36}>
          <p className={styles.fineprint}>{finalCta.fineprint}</p>
        </ScrollReveal>
      </div>
    </section>
  );
}
