import Link from "next/link";
import { Github } from "lucide-react";

import { cn } from "@/lib/utils";

interface NavLink {
  href: string;
  label: string;
}

const NAV_LINKS: NavLink[] = [
  { href: "/events", label: "Events" },
];

export function SiteHeader({ className }: { className?: string }) {
  return (
    <header
      className={cn("border-b border-ink/10 bg-paper/90 backdrop-blur", className)}
    >
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-3" aria-label="HackVillage home">
          {/* eslint-disable-next-line @next/next/no-img-element -- SVG wordmark, no raster source */}
          <img
            src="/images/salamander-logo-yellow.svg"
            alt="HackVillage"
            className="h-8 w-auto"
          />
        </Link>

        <nav aria-label="Primary" className="flex items-center gap-6">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-ink-soft hover:text-ink"
            >
              {link.label}
            </Link>
          ))}
          <a
            href="https://github.com/CodeWithEugene/HackVillage"
            className="flex size-9 items-center justify-center rounded-control text-ink hover:bg-ink/5"
            aria-label="HackVillage on GitHub"
          >
            <Github aria-hidden className="size-5" />
          </a>
        </nav>
      </div>
    </header>
  );
}
