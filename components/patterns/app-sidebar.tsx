"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createPortal } from "react-dom";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";

import { ThemeSwitcher } from "@/components/patterns/theme-switcher";
import { UserMenu } from "@/components/patterns/user-menu";
import { isActivePath } from "@/lib/nav";
import { cn } from "@/lib/utils";

export interface AppNavItem {
  href: string;
  label: string;
}

export interface AppNavSection {
  title: string;
  items: AppNavItem[];
}

export interface AppShellUser {
  handle: string;
}

/** Links whose siblings live under them path-wise, so they only match exactly. */
const EXACT_HREFS = new Set(["/dashboard", "/admin"]);

function useLinkActive(href: string): boolean {
  const pathname = usePathname();
  if (EXACT_HREFS.has(href)) return pathname === href;
  return isActivePath(pathname, href);
}

function AppNavLink({ href, label, onNavigate }: AppNavItem & { onNavigate?: () => void }) {
  const active = useLinkActive(href);
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      onClick={onNavigate}
      className="app-nav-link"
    >
      {label}
    </Link>
  );
}

function AppBrand({ surfaceLabel }: { surfaceLabel?: string }) {
  return (
    <Link href="/" aria-label="HackVillage home" className="app-brand">
      {/* eslint-disable-next-line @next/next/no-img-element -- animated brand lockup, no static/SVG source */}
      <img
        src="/branding/HackVillage-Logo.gif"
        alt="HackVillage"
        className="h-9 w-auto rounded-control"
      />
      {surfaceLabel ? <span className="app-brand-note">{surfaceLabel}</span> : null}
    </Link>
  );
}

function AppNavSections({
  sections,
  navLabel,
  onNavigate,
}: {
  sections: AppNavSection[];
  navLabel: string;
  onNavigate?: () => void;
}) {
  return (
    <nav aria-label={navLabel} className="app-nav">
      {sections.map((section) => (
        <div key={section.title} className="app-nav-section">
          <p className="app-nav-title">{section.title}</p>
          <ul>
            {section.items.map((item) => (
              <li key={item.href}>
                <AppNavLink {...item} onNavigate={onNavigate} />
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}

/**
 * Desktop sidebar: the left column of the ruled app frame (hidden below
 * 1024px, where the top bar's drawer takes over). Its brand cell is the same
 * height as the top bar, so one hairline runs across the whole frame.
 */
export function AppSidebar({
  sections,
  navLabel,
  surfaceLabel,
}: {
  sections: AppNavSection[];
  navLabel: string;
  surfaceLabel?: string;
}) {
  return (
    <aside className="app-sidebar">
      <div className="app-sidebar-brand">
        <AppBrand surfaceLabel={surfaceLabel} />
      </div>
      <div className="app-sidebar-scroll">
        <AppNavSections sections={sections} navLabel={navLabel} />
      </div>
    </aside>
  );
}

/**
 * The content column's top bar, aligned with the sidebar's brand cell. It
 * always carries the theme switcher and the user menu; below 1024px it also
 * shows the brand and a hamburger that opens the same sections in a drawer.
 * The drawer + overlay are portaled to document.body: the bar has
 * `backdrop-filter`, which makes it the containing block for `position:
 * fixed` descendants (the same trap the marketing MobileNav documents).
 */
export function AppTopBar({
  sections,
  navLabel,
  user,
  surfaceLabel,
}: {
  sections: AppNavSection[];
  navLabel: string;
  user: AppShellUser;
  surfaceLabel?: string;
}) {
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
    <header className="app-topbar">
      <div className="app-topbar-mobile">
        <button
          type="button"
          className="app-menu-button"
          aria-label="Open menu"
          aria-expanded={open}
          aria-controls="app-drawer-panel"
          onClick={() => setOpen(true)}
        >
          <Menu aria-hidden className="size-5" />
        </button>
        <AppBrand surfaceLabel={surfaceLabel} />
      </div>
      <div className="app-topbar-actions">
        <ThemeSwitcher />
        <UserMenu handle={user.handle} />
      </div>

      {mounted
        ? createPortal(
            <>
              <div
                className={cn("app-drawer-overlay", open && "app-drawer-overlay-open")}
                aria-hidden="true"
                onClick={() => setOpen(false)}
              />

              <div
                id="app-drawer-panel"
                className={cn("app-drawer-panel", open && "app-drawer-panel-open")}
                inert={!open}
              >
                <div className="app-drawer-head">
                  <AppBrand surfaceLabel={surfaceLabel} />
                  <button
                    type="button"
                    className="app-menu-button"
                    aria-label="Close menu"
                    onClick={() => setOpen(false)}
                  >
                    <X aria-hidden className="size-5" />
                  </button>
                </div>

                <AppNavSections
                  sections={sections}
                  navLabel={navLabel}
                  onNavigate={() => setOpen(false)}
                />
              </div>
            </>,
            document.body,
          )
        : null}
    </header>
  );
}
