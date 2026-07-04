import type { ClientConfig } from "@/client.config";
import { ScrollReveal } from "./ScrollReveal";
import { SectionCTA } from "./SectionCTA";
import styles from "./AgendaSection.module.css";

interface Props {
  agenda: ClientConfig["agenda"];
}

export function AgendaSection({ agenda }: Props) {
  return (
    <section className={`alt ${styles.section}`} aria-labelledby="agenda-heading">
      <div className="container">
        <ScrollReveal>
          <h2 id="agenda-heading" className={styles.heading}>
            {agenda.heading}
          </h2>
          <p className={styles.subheading}>{agenda.subheading}</p>
        </ScrollReveal>

        <ol className={styles.timeline}>
          {agenda.blocks.map((block, i) => (
            <ScrollReveal key={i} delay={0.05 + i * 0.08}>
              <li className={styles.block}>
                <div className={styles.meta}>
                  <span className={styles.label}>{block.label}</span>
                  {block.time ? (
                    <span className={styles.time}>{block.time}</span>
                  ) : null}
                </div>

                <div className={styles.content}>
                  <h3 className={styles.title}>{block.title}</h3>
                  <ul className={styles.bullets}>
                    {block.bullets.map((bullet, j) => (
                      <li key={j} className={styles.bullet}>
                        <span className={styles.dot} aria-hidden="true" />
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </li>
            </ScrollReveal>
          ))}
        </ol>

        <SectionCTA text={agenda.ctaText} />
      </div>
    </section>
  );
}
