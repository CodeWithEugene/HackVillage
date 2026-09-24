import Link from "next/link";

import { UserMenu } from "@/components/patterns/user-menu";
import { ThemeSwitcher } from "@/components/patterns/theme-switcher";
import { cn } from "@/lib/utils";

/**
 * Authenticated app chrome (mobile-first): brand link, role-aware primary
 * nav, and the user menu. The (app) layout wraps every protected surface;
 * layouts under it call the stricter requireSurface guards.
 */
export default function AppTopNav({
  user,
}: {
  user: { name?: string | null; handle: string; roles: string[] };
}) {
  const links: { href: string; label: string }[] = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/dashboard/events", label: "My events" },
    { href: "/dashboard/teams", label: "Teams" },
    { href: "/dashboard/winnings", label: "Winnings" },
    { href: "/dashboard/intros", label: "Intros" },
    { href: "/dashboard/notifications", label: "Alerts" },
  ];

  if (user.roles.includes("ORGANIZER")) {
    links.push({ href: "/organizer", label: "Organize" });
  }
  if (user.roles.includes("JUDGE")) {
    links.push({ href: "/judge", label: "Judge" });
  }
  if (user.roles.includes("HIRING")) {
    links.push({ href: "/hiring", label: "Talent" });
  }
  links.push(
    { href: "/dashboard/profile", label: "Profile" },
    { href: "/settings", label: "Settings" },
  );

  return (
    <header className={cn("sticky top-0 z-50 shrink-0 bg-paper/95 backdrop-blur")}>
      <div className="site-container flex h-16 items-center justify-between gap-4">
        <Link href="/" aria-label="HackVillage home" className="flex shrink-0 items-center">
          {/* eslint-disable-next-line @next/next/no-img-element -- animated brand lockup, no static/SVG source */}
          <img
            src="/branding/HackVillage-Logo.gif"
            alt="HackVillage"
            className="h-9 w-auto rounded-control"
          />
        </Link>

        <nav
          aria-label="App"
          className="flex min-w-0 items-center gap-1 overflow-x-auto py-2 sm:gap-4"
        >
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="shrink-0 rounded-control px-2 py-1 text-sm font-medium text-ink-soft hover:bg-ink/5 hover:text-ink sm:px-3"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          <ThemeSwitcher />
          <UserMenu handle={user.handle} />
        </div>
      </div>
    </header>
  );
}
