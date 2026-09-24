import Link from "next/link";
import { Github } from "lucide-react";

const FOOTER_SECTIONS: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: "Platform",
    links: [
      { label: "Events", href: "/events" },
      { label: "Developers", href: "/developers" },
      { label: "Trust & escrow", href: "/trust" },
      { label: "Sign in", href: "/signin" },
    ],
  },
  {
    title: "Project",
    links: [
      { label: "GitHub", href: "https://github.com/CodeWithEugene/HackVillage" },
      { label: "Contributing", href: "https://github.com/CodeWithEugene/HackVillage/blob/main/CONTRIBUTING.md" },
      { label: "Code of Conduct", href: "https://github.com/CodeWithEugene/HackVillage/blob/main/CODE_OF_CONDUCT.md" },
      { label: "Security", href: "https://github.com/CodeWithEugene/HackVillage/blob/main/SECURITY.md" },
      { label: "License (Apache-2.0)", href: "https://github.com/CodeWithEugene/HackVillage/blob/main/LICENSE" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy Policy", href: "/privacy" },
      { label: "Terms of Service", href: "/terms" },
    ],
  },
];

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-ink/10 bg-ink text-paper">
      <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 py-12 sm:grid-cols-2 lg:grid-cols-5">
        <div className="sm:col-span-2 lg:col-span-2">
          {/* Heritage mark — Salamander Tech Hub's wordmark is retired from
              the rest of the product UI but kept here as a nod to HackVillage's roots. */}
          {/* eslint-disable-next-line @next/next/no-img-element -- SVG wordmark, no raster source */}
          <img src="/images/salamander-logo-yellow.svg" alt="Salamander Tech Hub" className="h-9 w-auto" />
          <p className="mt-3 max-w-sm text-sm leading-6 text-paper/70">
            The open-source infrastructure for high-impact tech events. 100% escrowed
            prize pools, 50% instant payouts, verified Proof-of-Work developer
            profiles — built with intention for the African developer community.
          </p>
          <p className="mt-4 text-xs text-paper/50">
            A Technetium Kenya initiative ·{" "}
            <a
              href="https://www.technetium.co.ke"
              className="underline hover:text-paper"
            >
              technetium.co.ke
            </a>
          </p>
        </div>

        {FOOTER_SECTIONS.map((section) => (
          <nav key={section.title} aria-label={section.title}>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-paper/60">
              {section.title}
            </h2>
            <ul className="mt-3 space-y-2">
              {section.links.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-paper/80 transition-colors hover:text-paper"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>

      <div className="border-t border-paper/10">
        <div className="mx-auto flex w-full max-w-7xl flex-col-reverse items-center gap-3 px-4 py-6 text-xs text-paper/50 sm:flex-row sm:justify-between">
          <p>© {year} HackVillage. Apache-2.0 licensed.</p>
          <a
            href="https://github.com/CodeWithEugene/HackVillage"
            aria-label="HackVillage on GitHub"
            className="flex size-8 items-center justify-center rounded-control text-paper/70 hover:bg-paper/10 hover:text-paper"
          >
            <Github aria-hidden className="size-4" />
          </a>
        </div>
      </div>
    </footer>
  );
}
