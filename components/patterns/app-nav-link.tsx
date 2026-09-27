"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { isActivePath } from "@/lib/nav";
import { cn } from "@/lib/utils";

/**
 * App chrome nav link: marks itself aria-current="page" when it points at the
 * page being viewed, and the active styling keys off that state so what you
 * see and what screen readers announce can never disagree. /dashboard matches
 * exactly (its siblings live under it); other links also match sub-pages.
 */
export function AppNavLink({ href, children }: { href: string; children: ReactNode }) {
  const pathname = usePathname();
  const active = href === "/dashboard" ? pathname === href : isActivePath(pathname, href);
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "shrink-0 rounded-control px-2 py-1 text-sm sm:px-3",
        active
          ? "bg-ink/8 font-bold text-ink"
          : "font-medium text-ink-soft hover:bg-ink/5 hover:text-ink"
      )}
    >
      {children}
    </Link>
  );
}
