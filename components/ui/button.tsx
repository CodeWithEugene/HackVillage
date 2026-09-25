import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes } from "react";
import { ArrowUpRight, Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Primary button = brand blue with ink (navy) text (contrast rule §13.1:
 * brand surfaces always carry ink text — never white on brand).
 *
 * Every button is a pill. Hover/active reveal a fill that sweeps in from the
 * bottom-left corner toward the top-right (`.btn-fill`, transform-only so it
 * stays compositor-friendly and is flattened by the reduced-motion rule in
 * globals.css). `arrow` marks a button that navigates to another page: it
 * gets a trailing arrow that nudges further up-right on hover/active.
 */
const buttonVariants = cva(
  "btn-pill group relative isolate inline-flex items-center justify-center gap-2 overflow-hidden rounded-full font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary: "btn-pill-primary bg-brand text-brand-ink",
        secondary: "btn-pill-secondary border-2 border-ink bg-transparent text-ink",
        ghost: "btn-pill-ghost bg-transparent text-ink",
        danger: "btn-pill-danger bg-danger text-white",
      },
      size: {
        sm: "h-9 px-3 text-sm",
        md: "h-11 px-5 text-base",
        lg: "h-12 px-7 text-lg",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
  /** Trailing arrow for a button that opens another page. */
  arrow?: boolean;
}

export function Button({
  className,
  variant,
  size,
  loading = false,
  arrow = false,
  disabled,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(buttonVariants({ variant, size }), className)}
      disabled={disabled || loading}
      {...props}
    >
      <span className="btn-fill" aria-hidden />
      <span className="btn-content">
        {loading ? <Loader2 aria-hidden className="size-4 animate-spin" /> : null}
        {children}
        {arrow && !loading ? <ArrowUpRight aria-hidden className="btn-arrow size-4" /> : null}
      </span>
    </button>
  );
}
