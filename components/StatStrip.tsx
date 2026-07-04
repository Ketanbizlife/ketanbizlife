"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { StatCard } from "@/client.config";
import styles from "./StatStrip.module.css";

interface Props {
  stats: StatCard[];
  hiddenIndices?: number[];
}

export function StatStrip({ stats, hiddenIndices = [] }: Props) {
  const visibleStats = stats.filter((_, i) => !hiddenIndices.includes(i));
  const stripRef = useRef<HTMLDivElement | null>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const node = stripRef.current;
    if (!node) return;

    if (typeof window !== "undefined") {
      const reduce = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      if (reduce) {
        setActive(true);
        return;
      }
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActive(true);
            observer.disconnect();
          }
        }
      },
      { threshold: 0.25 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={stripRef}
      className={styles.strip}
      role="list"
      aria-label="Credibility stats"
    >
      {visibleStats.map((stat, i) => (
        <div key={i} className={styles.card} role="listitem">
          <CountUpValue value={stat.value} active={active} indexDelay={i * 80} />
          <div className={styles.label}>{stat.label}</div>
        </div>
      ))}
    </div>
  );
}

interface CountUpProps {
  value: string;
  active: boolean;
  indexDelay: number;
}

function CountUpValue({ value, active, indexDelay }: CountUpProps) {
  /**
   * Memoize the parsed match so identical `value` props yield a stable
   * reference. Without memoization, every parent re-render (e.g. when display
   * state ticks) created a new regex result, which broke the effect dep array
   * and cancelled the in-flight animation on every frame.
   */
  const parsed = useMemo(() => {
    const m = value.match(/^(\d+)([\s\S]*)$/);
    return {
      hasNumber: !!m,
      target: m ? parseInt(m[1] ?? "0", 10) : 0,
      suffix: m ? m[2] ?? "" : "",
    };
  }, [value]);

  const { hasNumber, target, suffix } = parsed;

  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!hasNumber || !active) return;

    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setDisplay(target);
      return;
    }

    const startDelay = 240 + indexDelay;
    const duration = 1400;
    let raf = 0;
    let started = 0;

    const tick = (now: number) => {
      if (!started) started = now;
      const elapsed = now - started;
      if (elapsed < startDelay) {
        raf = requestAnimationFrame(tick);
        return;
      }
      const t = Math.min(1, (elapsed - startDelay) / duration);
      const eased = 1 - Math.pow(1 - t, 4);
      setDisplay(Math.round(eased * target));
      if (t < 1) raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, hasNumber, target, indexDelay]);

  if (!hasNumber) {
    return <div className={styles.value}>{value}</div>;
  }

  return (
    <div className={styles.value}>
      <span className={styles.valueNum}>{display}</span>
      <span className={styles.valueSuffix}>{suffix}</span>
    </div>
  );
}
