import Link from "next/link";

import { UserMenu } from "@/components/patterns/user-menu";
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
    { href: "/settings", label: "Settings" }
  );

  return (
    <header
      className={cn(
        "sticky top-0 z-40 border-b border-ink/10 bg-paper/95 backdrop-blur",
      )}
    >
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4">
        <Link href="/" aria-label="HackVillage home" className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element -- brand PNG */}
          <img src="/branding/icon-96.png" alt="" className="size-8 rounded-control" />
          <span className="font-display text-lg font-bold text-ink">
            Hack<span className="text-ink/40">Village</span>
          </span>
        </Link>

        <nav aria-label="App" className="flex items-center gap-1 sm:gap-4">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-control px-2 py-1 text-sm font-medium text-ink-soft hover:bg-ink/5 hover:text-ink sm:px-3"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <UserMenu handle={user.handle} />
      </div>
    </header>
  );
}
