import Link from "next/link";
import { ArrowUpRight, ChevronRight } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface LandingLinkProps {
  href: string;
  children: React.ReactNode;
  variant?: "primary" | "secondary";
  className?: string;
  external?: boolean;
}

/**
 * A navigation link dressed as the pill button, so the landing page keeps the
 * button design system (sweep fill + nudging arrow) without nesting a
 * <button> inside an <a>.
 */
export function LandingLink({
  href,
  children,
  variant = "primary",
  className,
  external = false,
}: LandingLinkProps) {
  return (
    <Link
      href={href}
      className={cn(
        buttonVariants({ variant, size: "md" }),
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
