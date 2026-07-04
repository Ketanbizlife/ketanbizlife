"use client";

import { CTAButton } from "./CTAButton";
import styles from "./MobileCTABar.module.css";

interface Props {
  ctaText: string;
}

/**
 * Sticky bottom CTA bar shown on mobile/tablet from page load (including
 * over the hero). Hidden on desktop via CSS — the hero CTA is always
 * visible there, so a sticky bar would be redundant. Opens the free
 * registration modal (event-delegated via CTAButton's `opensRegister`).
 */
export function MobileCTABar({ ctaText }: Props) {
  return (
    <div className={styles.bar}>
      <CTAButton opensRegister variant="primary" size="default" withArrow>
        {ctaText}
      </CTAButton>
    </div>
  );
}
