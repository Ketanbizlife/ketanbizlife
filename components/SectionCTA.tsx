import { CTAButton } from "./CTAButton";
import styles from "./SectionCTA.module.css";

interface Props {
  text: string;
}

/**
 * Wraps a primary CTA in a vertically-padded, horizontally-centered block.
 * Used between sections to keep the CTA rhythm consistent. Opens the free
 * registration modal (event-delegated via CTAButton's `opensRegister`).
 */
export function SectionCTA({ text }: Props) {
  return (
    <div className={styles.wrap}>
      <CTAButton opensRegister variant="primary" size="large" withArrow>
        {text}
      </CTAButton>
    </div>
  );
}
