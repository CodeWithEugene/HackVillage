import Link from "next/link";
import { Github } from "lucide-react";

import { NavDropdown } from "@/components/patterns/nav-dropdown";
import { ThemeSwitcher } from "@/components/patterns/theme-switcher";
import { cn } from "@/lib/utils";

interface NavLink {
  href: string;
  label: string;
}

const NAV_LINKS: NavLink[] = [
  { href: "/events", label: "Hackathons" },
  { href: "/developers", label: "Developers" },
];

const ORGANIZER_LINKS: NavLink[] = [
  { href: "/onboarding/organizer", label: "Host A Hackathon" },
  { href: "/#how-it-works", label: "How Escrow Works" },
];

export function SiteHeader({ className }: { className?: string }) {
  return (
    <header className={cn("sticky top-0 z-50 shrink-0 bg-paper/95 backdrop-blur", className)}>
      <div className="site-container site-header-grid">
        <Link href="/" className="flex shrink-0 items-center gap-3" aria-label="HackVillage home">
          {/* eslint-disable-next-line @next/next/no-img-element -- animated brand lockup, no static/SVG source */}
          <img
            src="/branding/HackVillage-Logo.gif"
            alt="HackVillage"
            className="h-9 w-auto rounded-control"
          />
        </Link>

        <nav aria-label="Primary" className="site-header-links">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-ink-soft hover:text-ink"
            >
              {link.label}
            </Link>
          ))}
          <NavDropdown label="Organizers" items={ORGANIZER_LINKS} />
          <Link href="/trust" className="text-sm font-medium text-ink-soft hover:text-ink">
            Trust
          </Link>
        </nav>
        <div className="site-header-actions">
          <a
            href="https://github.com/CodeWithEugene/HackVillage"
            className="header-icon"
            aria-label="HackVillage on GitHub"
          >
            <Github aria-hidden className="size-4" />
          </a>
          <ThemeSwitcher />
          <Link href="/signin" className="header-signin">
            Sign In
          </Link>
          <Link href="/signup" className="header-signup">
            Sign Up
          </Link>
        </div>
      </div>
    </header>
  );
}
