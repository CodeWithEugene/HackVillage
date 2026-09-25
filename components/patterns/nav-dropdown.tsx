"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { ChevronDown } from "lucide-react";

import { isActivePath } from "@/lib/nav";

interface NavDropdownItem {
  href: string;
  label: string;
}

export function NavDropdown({ label, items }: { label: string; items: NavDropdownItem[] }) {
  const ref = useRef<HTMLDetailsElement>(null);
  const pathname = usePathname();
  const hasActiveItem = items.some((item) => isActivePath(pathname, item.href));

  useEffect(() => {
    const closeOutside = (event: PointerEvent) => {
      if (event.target instanceof Node && !ref.current?.contains(event.target)) {
        ref.current?.removeAttribute("open");
      }
    };
    document.addEventListener("pointerdown", closeOutside);
    return () => document.removeEventListener("pointerdown", closeOutside);
  }, []);

  return (
    <details
      ref={ref}
      className="nav-dropdown"
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          ref.current?.removeAttribute("open");
          ref.current?.querySelector("summary")?.focus();
        }
      }}
    >
      <summary className="nav-dropdown-trigger" data-active={hasActiveItem || undefined}>
        {label}
        <ChevronDown aria-hidden className="nav-dropdown-chevron size-3.5" />
      </summary>
      <div className="nav-dropdown-panel" role="group" aria-label={label}>
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="nav-dropdown-link"
            aria-current={isActivePath(pathname, item.href) ? "page" : undefined}
            onClick={() => ref.current?.removeAttribute("open")}
          >
            {item.label}
          </Link>
        ))}
      </div>
    </details>
  );
}
