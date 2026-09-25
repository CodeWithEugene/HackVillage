"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentProps } from "react";

import { isActivePath } from "@/lib/nav";

/**
 * A nav Link that marks itself aria-current="page" when it points at the
 * page being viewed. The underline comes from CSS on [aria-current="page"],
 * so screen readers and the visual state always agree.
 */
export function NavLink({ href, ...props }: ComponentProps<typeof Link> & { href: string }) {
  const pathname = usePathname();
  const active = isActivePath(pathname, href);
  return <Link href={href} aria-current={active ? "page" : undefined} {...props} />;
}
