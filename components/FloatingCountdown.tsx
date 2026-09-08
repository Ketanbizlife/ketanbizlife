"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Icon } from "./Icon";
import styles from "./FloatingCountdown.module.css";
interface Props {
  targetISO: string;
  ctaLabel?: string;
}
interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  expired: boolean;
}
function computeTimeLeft(targetISO: string): TimeLeft {
  const target = new Date(targetISO).getTime();
  const now = Date.now();
  const totalSeconds = Math.max(0, Math.floor((target - now) / 1000));
  return {
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
    expired: totalSeconds === 0,
  };
}
function pad(n: number): string {
  return n.toString().padStart(2, "0");
}
export function FloatingCountdown({
  targetISO,
  ctaLabel = "Register at ₹99",
}: Props) {
  const [mounted, setMounted] = useState(false);
  const [time, setTime] = useState<TimeLeft>(() => computeTimeLeft(targetISO));
  useEffect(() => {
    setMounted(true);
    setTime(computeTimeLeft(targetISO));
    const interval = setInterval(() => {
      setTime(computeTimeLeft(targetISO));
    }, 1000);
    return () => clearInterval(interval);
  }, [targetISO]);
  if (!mounted) return null;
  return (
    <div
      className={styles.bar}
      role="region"
      aria-label="Webinar registration"
    >
      <div className={styles.inner}>
        {time.expired ? (
          <div className={styles.label}>
            <Icon name="clock" size={14} />
            <span>Seats filling fast</span>
          </div>
        ) : (
          <>
            <div className={styles.label}>
              <Icon name="clock" size={14} />
              <span>Webinar in</span>
            </div>
            <div className={styles.cells}>
              <Cell value={pad(time.days)} unit="d" />
              <Cell value={pad(time.hours)} unit="h" />
              <Cell value={pad(time.minutes)} unit="m" />
              <Cell value={pad(time.seconds)} unit="s" />
            </div>
          </>
        )}
        <Link
          href="https://payments.cashfree.com/forms/export-unstuck-newlp"
          className={styles.cta}
          aria-label={`${ctaLabel} for the webinar`}
        >
          <span>{ctaLabel}</span>
          <Icon name="arrow-right" size={14} />
        </Link>
      </div>
    </div>
  );
}
function Cell({ value, unit }: { value: string; unit: string }) {
  return (
    <span className={styles.cell}>
      <span className={styles.value}>{value}</span>
      <span className={styles.unit}>{unit}</span>
    </span>
  );
}
