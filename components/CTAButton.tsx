import Link from "next/link";
import type { ReactNode } from "react";
import styles from "./CTAButton.module.css";
type Variant = "primary" | "secondary";
type Size = "default" | "large";
interface BaseProps {
  children: ReactNode;
  variant?: Variant;
  size?: Size;
  withArrow?: boolean;
  ariaLabel?: string;
  /**
   * When true, renders a link to the Cashfree hosted payment page.
   */
  opensRegister?: boolean;
}
interface ButtonProps extends BaseProps {
  href?: undefined;
  onClick?: () => void;
  type?: "button" | "submit";
  disabled?: boolean;
}
interface LinkProps extends BaseProps {
  href: string;
  onClick?: () => void;
}
type Props = ButtonProps | LinkProps;
export function CTAButton(props: Props) {
  const {
    children,
    variant = "primary",
    size = "default",
    withArrow = true,
    ariaLabel,
    opensRegister,
  } = props;
  const className = [
    styles.btn,
    styles[variant],
    styles[size],
  ].join(" ");
  const inner = (
    <>
      <span className={styles.label}>{children}</span>
      {withArrow ? (
        <span className={styles.arrow} aria-hidden="true">
          →
        </span>
      ) : null}
    </>
  );
  if (opensRegister) {
    return (
      <Link
        href="https://payments.cashfree.com/forms/export-unstuck-newlp"
        className={className}
        aria-label={ariaLabel}
      >
        {inner}
      </Link>
    );
  }
  if ("href" in props && props.href !== undefined) {
    return (
      <Link
        href={props.href}
        className={className}
        aria-label={ariaLabel}
        onClick={props.onClick}
      >
        {inner}
      </Link>
    );
  }
  return (
    <button
      className={className}
      type={(props as ButtonProps).type ?? "button"}
      onClick={(props as ButtonProps).onClick}
      disabled={(props as ButtonProps).disabled}
      aria-label={ariaLabel}
    >
      {inner}
    </button>
  );
}
