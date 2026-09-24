"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { ChevronDown } from "lucide-react";

interface NavDropdownItem {
  href: string;
  label: string;
}

export function NavDropdown({ label, items }: { label: string; items: NavDropdownItem[] }) {
  const ref = useRef<HTMLDetailsElement>(null);

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
      <summary className="nav-dropdown-trigger">
        {label}
        <ChevronDown aria-hidden className="nav-dropdown-chevron size-3.5" />
      </summary>
      <div className="nav-dropdown-panel" role="group" aria-label={label}>
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="nav-dropdown-link"
            onClick={() => ref.current?.removeAttribute("open")}
          >
            {item.label}
          </Link>
        ))}
      </div>
    </details>
  );
}
