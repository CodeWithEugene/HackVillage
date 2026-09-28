import Link from "next/link";
import { ArrowUpRight, ChevronRight } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface LandingLinkProps {
  href: string;
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "inverse";
  className?: string;
  external?: boolean;
}

/**
 * A navigation link dressed as the pill button, so the landing page keeps the
 * button design system (sweep fill + nudging arrow) without nesting a
 * <button> inside an <a>. `inverse` is the outline pill on the navy band.
 */
export function LandingLink({
  href,
  children,
  variant = "primary",
  className,
  external = false,
}: LandingLinkProps) {
  const variantClass =
    variant === "inverse"
      ? "btn-pill-inverse border border-on-inverse/30 bg-transparent text-on-inverse"
      : buttonVariants({ variant, size: "md" });
  return (
    <Link
      href={href}
      className={cn(
        variant === "inverse" &&
          "btn-pill group relative isolate inline-flex h-11 items-center justify-center gap-2 overflow-hidden rounded-full px-5 font-semibold",
        variantClass,
        "text-[15px] whitespace-nowrap",
        className,
      )}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
    >
      <span className="btn-fill" aria-hidden />
      <span className="btn-content">
        {children}
        <ArrowUpRight aria-hidden className="btn-arrow size-4" />
      </span>
    </Link>
  );
}

/** Stripe-style inline text link: brand colour, a small chevron that slides on hover. */
export function TextLink({
  href,
  children,
  className,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Link href={href} className={cn("lp-text-link", className)}>
      {children}
      <ChevronRight aria-hidden className="lp-text-link-chevron" />
    </Link>
  );
}
