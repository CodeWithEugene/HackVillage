import Link from "next/link";

const FOOTER_SECTIONS: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: "Platform",
    links: [
      { label: "Events", href: "/events" },
      { label: "Developers", href: "/developers" },
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
];

export function SiteFooter() {
  return (
    <footer className="border-t border-ink/10 bg-ink text-paper">
      <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element -- brand PNG */}
            <img src="/branding/icon-96.png" alt="" className="size-10 rounded-control" />
            <p className="font-display text-lg font-bold">
              Hack<span className="text-brand">Village</span>
            </p>
          </div>
          <p className="mt-2 max-w-xs text-sm leading-6 text-paper/70">
            The open-source infrastructure for high-impact tech events. Built with
            intention for the African developer community.
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
    </footer>
  );
}
