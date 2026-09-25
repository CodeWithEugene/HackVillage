"use client";

import Link from "next/link";
import { createPortal } from "react-dom";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";

import { NavLink } from "@/components/patterns/nav-link";

interface NavLinkItem {
  href: string;
  label: string;
}

interface MobileNavProps {
  navLinks: NavLinkItem[];
  organizerLinks: NavLinkItem[];
  contributeLink: NavLinkItem;
}

/**
 * Mobile-only hamburger menu. Sits to the right of the Sign Up button
 * (rendered inline in the header's action row) and opens a drawer that
 * slides in from the left edge of the screen, with a dimmed backdrop.
 * The desktop inline nav (site-header-links) is hidden below 767px —
 * see the matching @media block in globals.css.
 *
 * The overlay + drawer are portaled to document.body: the header has
 * `backdrop-blur`, and `backdrop-filter` on an ancestor makes it the
 * containing block for `position: fixed` descendants, which would
 * otherwise shrink the overlay down to the header's own height instead
 * of covering the full viewport (and break click-outside-to-close).
 */
export function MobileNav({ navLinks, organizerLinks, contributeLink }: MobileNavProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    document.documentElement.classList.add("overflow-hidden");

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.documentElement.classList.remove("overflow-hidden");
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        className="header-icon mobile-nav-trigger"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        aria-controls="mobile-nav-panel"
        onClick={() => setOpen((value) => !value)}
      >
        {open ? <X aria-hidden className="size-5" /> : <Menu aria-hidden className="size-5" />}
      </button>

      {mounted
        ? createPortal(
            <>
              <div
                className={`mobile-nav-overlay${open ? "mobile-nav-overlay-open" : ""}`}
                aria-hidden="true"
                onClick={() => setOpen(false)}
              />

              <nav
                id="mobile-nav-panel"
                aria-label="Mobile"
                className={`mobile-nav-panel${open ? "mobile-nav-panel-open" : ""}`}
                inert={!open}
              >
                <div className="mobile-nav-panel-header">
                  <Link href="/" className="mobile-nav-logo" onClick={() => setOpen(false)}>
                    {/* eslint-disable-next-line @next/next/no-img-element -- animated brand lockup, no static/SVG source */}
                    <img
                      src="/branding/HackVillage-Logo.gif"
                      alt="HackVillage"
                      className="h-9 w-auto rounded-control"
                    />
                  </Link>
                  <button
                    type="button"
                    className="header-icon"
                    aria-label="Close menu"
                    onClick={() => setOpen(false)}
                  >
                    <X aria-hidden className="size-5" />
                  </button>
                </div>

                <ul className="mobile-nav-list">
                  {navLinks.map((link) => (
                    <li key={link.href}>
                      <NavLink
                        href={link.href}
                        className="mobile-nav-link"
                        onClick={() => setOpen(false)}
                      >
                        {link.label}
                      </NavLink>
                    </li>
                  ))}
                </ul>

                <p className="mobile-nav-group-label">Organizers</p>
                <ul className="mobile-nav-list">
                  {organizerLinks.map((link) => (
                    <li key={link.href}>
                      <NavLink
                        href={link.href}
                        className="mobile-nav-link"
                        onClick={() => setOpen(false)}
                      >
                        {link.label}
                      </NavLink>
                    </li>
                  ))}
                </ul>

                <ul className="mobile-nav-list">
                  <li>
                    <NavLink
                      href={contributeLink.href}
                      className="mobile-nav-link"
                      onClick={() => setOpen(false)}
                    >
                      {contributeLink.label}
                    </NavLink>
                  </li>
                </ul>
              </nav>
            </>,
            document.body,
          )
        : null}
    </>
  );
}
