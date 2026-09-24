import Link from "next/link";
import { Github } from "lucide-react";

import { Button } from "@/components/ui/button";
import { currentUser } from "@/lib/auth/guards";
import { cn } from "@/lib/utils";

interface NavLink {
  href: string;
  label: string;
}

const NAV_LINKS: NavLink[] = [
  { href: "/events", label: "Events" },
  { href: "/developers", label: "Developers" },
];

export async function SiteHeader({ className }: { className?: string }) {
  const user = await currentUser();
  const destination = user
    ? user.onboardingCompletedAt
      ? "/dashboard"
      : "/onboarding/choose"
    : "/signin";

  return (
    <header className={cn("sticky top-0 z-50 bg-paper/90 backdrop-blur", className)}>
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-4 px-4">
        <Link href="/" className="flex shrink-0 items-center gap-3" aria-label="HackVillage home">
          {/* eslint-disable-next-line @next/next/no-img-element -- animated brand lockup, no static/SVG source */}
          <img
            src="/branding/HackVillage-Logo.gif"
            alt="HackVillage"
            className="h-9 w-auto rounded-control"
          />
        </Link>

        <nav aria-label="Primary" className="flex shrink-0 items-center gap-3 sm:gap-6">
          <div className="hidden items-center gap-4 sm:flex sm:gap-6">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-ink-soft hover:text-ink"
              >
                {link.label}
              </Link>
            ))}
          </div>
          <a
            href="https://github.com/CodeWithEugene/HackVillage"
            className="hidden size-9 items-center justify-center rounded-control text-ink hover:bg-ink/5 sm:flex"
            aria-label="HackVillage on GitHub"
          >
            <Github aria-hidden className="size-5" />
          </a>
          <Link href={destination}>
            <Button size="sm">{user ? "Go To App" : "Sign In"}</Button>
          </Link>
        </nav>
      </div>
    </header>
  );
}
