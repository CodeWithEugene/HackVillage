import Link from "next/link";
import { Github, Mail, MapPin } from "lucide-react";

const GITHUB_URL = "https://github.com/CodeWithEugene/HackVillage";
const CONTACT_EMAIL = "info@hackvillage.xyz";

const FOOTER_SECTIONS: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: "Platform",
    links: [
      { label: "Hackathons", href: "/events" },
      { label: "Developers", href: "/developers" },
      { label: "Trust & escrow", href: "/trust" },
      { label: "How it works", href: "/#how-it-works" },
    ],
  },
  {
    title: "Project",
    links: [
      { label: "GitHub", href: GITHUB_URL },
      { label: "Contributing", href: `${GITHUB_URL}/blob/main/CONTRIBUTING.md` },
      { label: "Code of Conduct", href: `${GITHUB_URL}/blob/main/CODE_OF_CONDUCT.md` },
      { label: "Security", href: `${GITHUB_URL}/blob/main/SECURITY.md` },
      { label: "License", href: `${GITHUB_URL}/blob/main/LICENSE` },
    ],
  },
  {
    title: "Get Started",
    links: [
      { label: "Sign in", href: "/signin" },
      { label: "Create an account", href: "/signup" },
      { label: "Host a hackathon", href: "/onboarding/organizer" },
    ],
  },
];

const LINK_CLASS = "text-sm text-body-copy transition-colors hover:text-ink";

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-ink/10 bg-paper">
      <div className="site-container grid grid-cols-2 gap-x-6 gap-y-10 pt-16 pb-12 lg:grid-cols-[1.7fr_1fr_1fr_1fr_1.3fr] lg:gap-8">
        <div className="col-span-2 lg:col-span-1">
          <Link href="/" aria-label="HackVillage home" className="inline-block">
            {/* eslint-disable-next-line @next/next/no-img-element -- animated brand lockup, no static/SVG source */}
            <img
              src="/branding/HackVillage-Logo.gif"
              alt="HackVillage"
              className="h-10 w-auto rounded-control"
            />
          </Link>
          <p className="mt-5 max-w-xs text-sm leading-6 text-body-copy">
            Open-source infrastructure for high-impact tech events, built for the African developer
            community.
          </p>
          <div className="mt-6 flex items-center gap-4">
            <a
              href={GITHUB_URL}
              aria-label="HackVillage on GitHub"
              className="text-brand transition-colors hover:text-ink-soft"
            >
              <Github aria-hidden className="size-5" />
            </a>
          </div>
        </div>

        {FOOTER_SECTIONS.map((section) => (
          <nav key={section.title} aria-label={section.title}>
            <h2 className="font-display text-base font-semibold text-ink">{section.title}</h2>
            <ul className="mt-5 space-y-3">
              {section.links.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className={LINK_CLASS}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}

        <div className="col-span-2 lg:col-span-1">
          <h2 className="font-display text-base font-semibold text-ink">Contact Us</h2>
          <ul className="mt-5 space-y-3">
            <li>
              <a href={`mailto:${CONTACT_EMAIL}`} className={`flex items-center gap-2.5 ${LINK_CLASS}`}>
                <Mail aria-hidden className="size-4 shrink-0 text-brand" />
                {CONTACT_EMAIL}
              </a>
            </li>
            <li className="flex items-start gap-2.5 text-sm text-body-copy">
              <MapPin aria-hidden className="mt-0.5 size-4 shrink-0 text-brand" />
              <span>
                Nairobi, Kenya
                <br />
                <a href="https://www.technetium.co.ke" className="hover:text-ink">
                  A Technetium Kenya initiative
                </a>
              </span>
            </li>
          </ul>
          <p className="mt-6 text-sm text-body-copy">In partnership with:</p>
          {/* eslint-disable-next-line @next/next/no-img-element -- SVG wordmark, no raster source */}
          <img
            src="/images/salamander-logo-yellow.svg"
            alt="Salamander Tech Hub"
            className="mt-3 h-9 w-auto"
          />
        </div>
      </div>

      <div className="site-container">
        <div className="flex flex-col items-center gap-3 border-t border-ink/10 py-6 text-sm text-body-copy sm:flex-row sm:justify-between">
          <p>Copyright © {year} HackVillage</p>
          <p>
            Apache-2.0 licensed |{" "}
            <Link href="/terms" className="text-ink-soft underline underline-offset-2 hover:text-ink">
              Terms of Service
            </Link>{" "}
            |{" "}
            <Link href="/privacy" className="text-ink-soft underline underline-offset-2 hover:text-ink">
              Privacy Policy
            </Link>
          </p>
        </div>
      </div>
    </footer>
  );
}
