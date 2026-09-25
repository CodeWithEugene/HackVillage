import Link from "next/link";
import { Github } from "lucide-react";

import { MobileNav } from "@/components/patterns/mobile-nav";
import { NavDropdown } from "@/components/patterns/nav-dropdown";
import { NavLink } from "@/components/patterns/nav-link";
import { ThemeSwitcher } from "@/components/patterns/theme-switcher";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
}

const NAV_LINKS: NavItem[] = [
  { href: "/", label: "Home" },
  { href: "/hackathons", label: "Hackathons" },
];

const ORGANIZER_LINKS: NavItem[] = [
  { href: "/onboarding/organizer", label: "Host A Hackathon" },
  { href: "/how-escrow-works", label: "How Escrow Works" },
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
            <NavLink key={link.href} href={link.href} className="site-nav-link">
              {link.label}
            </NavLink>
          ))}
          <NavDropdown label="Organizers" items={ORGANIZER_LINKS} />
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
          <Link href="/signin" className="header-signin btn-pill">
            <span className="btn-fill" aria-hidden />
            <span className="btn-content">Sign In</span>
          </Link>
          <Link href="/signup" className="header-signup btn-pill">
            <span className="btn-fill" aria-hidden />
            <span className="btn-content">Sign Up</span>
          </Link>
          <MobileNav navLinks={NAV_LINKS} organizerLinks={ORGANIZER_LINKS} />
        </div>
      </div>
    </header>
  );
}
