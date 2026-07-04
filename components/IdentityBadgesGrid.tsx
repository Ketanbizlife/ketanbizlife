import type { ClientConfig } from "@/client.config";
import { ScrollReveal } from "./ScrollReveal";
import { SectionCTA } from "./SectionCTA";
import styles from "./IdentityBadgesGrid.module.css";

interface Props {
  identity: ClientConfig["identityBadges"];
}

export function IdentityBadgesGrid({ identity }: Props) {
  return (
    <section className={`alt ${styles.section}`} aria-labelledby="identity-heading">
      <div className="container">
        <ScrollReveal>
          <h2 id="identity-heading" className={styles.heading}>
            {identity.heading}
          </h2>
        </ScrollReveal>

        <div className={styles.grid}>
          {identity.badges.map((badge, i) => (
            <ScrollReveal key={i} delay={0.05 + i * 0.08}>
              <div className={styles.badge}>
                <span className={styles.index} aria-hidden="true">
                  0{i + 1}
                </span>
                <p className={styles.text}>{badge}</p>
              </div>
            </ScrollReveal>
          ))}
        </div>

        <ScrollReveal delay={0.3}>
          <p className={styles.outro}>{identity.outro}</p>
        </ScrollReveal>

        <SectionCTA text={identity.ctaText} />
      </div>
    </section>
  );
}
