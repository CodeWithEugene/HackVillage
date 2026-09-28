import Link from "next/link";
import { Mail, MapPin } from "lucide-react";

import { GithubMark } from "@/components/icons/github-icon";
import { LinkedinIcon, XIcon, YoutubeIcon } from "@/components/icons/social-icons";
import { NewsletterForm } from "@/components/patterns/newsletter-form";
import { HOST_HACKATHON_HREF } from "@/lib/auth/signup-links";

const GITHUB_URL = "https://github.com/CodeWithEugene/HackVillage";
const CONTACT_EMAIL = "info@hackvillage.xyz";

const SOCIAL_LINKS = [
  { label: "HackVillage on GitHub", href: GITHUB_URL, Icon: GithubMark },
  {
    label: "HackVillage on LinkedIn",
    href: "https://www.linkedin.com/company/hackvillage",
    Icon: LinkedinIcon,
  },
  { label: "HackVillage on X", href: "https://x.com/hackvillagexyz", Icon: XIcon },
  {
    label: "HackVillage on YouTube",
    href: "https://www.youtube.com/@hackvillage",
    Icon: YoutubeIcon,
  },
];

const FOOTER_SECTIONS: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: "Platform",
    links: [
      { label: "Hackathons", href: "/hackathons" },
      { label: "How it works", href: "/how-it-works" },
      { label: "How it works for organizers", href: "/for-organizers" },
      { label: "How escrow works", href: "/how-escrow-works" },
    ],
  },
  {
    title: "Project",
    links: [
      { label: "GitHub", href: GITHUB_URL },
      { label: "Contributing", href: "/contribute" },
      { label: "Blog", href: "/blog" },
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
      { label: "Host a hackathon", href: HOST_HACKATHON_HREF },
    ],
  },
];

const LINK_CLASS = "text-sm text-body-copy transition-colors hover:text-ink";

function Partnership() {
  return (
    <>
      <p className="text-sm text-body-copy">In partnership with:</p>
      <a
        href="https://salamandertechhub.com/"
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 inline-block transition-opacity hover:opacity-80"
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- SVG wordmark, no raster source */}
        <img
          src="/images/salamander-logo-yellow.svg"
          alt="Salamander Tech Hub"
          className="h-9 w-auto max-w-full"
        />
      </a>
    </>
  );
}

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-ink/10 bg-paper">
      <div className="site-container grid grid-cols-2 gap-x-6 gap-y-10 pt-16 pb-12 lg:grid-cols-[1.7fr_1fr_1fr_1fr_1.3fr] lg:gap-8">
        {/* Mobile: the brand column reads as a centered stack (logo, tagline,
            socials, newsletter); lg restores the left-aligned first column. */}
        <div className="col-span-2 text-center lg:col-span-1 lg:text-left">
          <Link href="/" aria-label="HackVillage home" className="inline-block">
            {/* eslint-disable-next-line @next/next/no-img-element -- animated brand lockup, no static/SVG source */}
            <img
              src="/branding/HackVillage-Logo.gif"
              alt="HackVillage"
              className="h-10 w-auto rounded-control"
            />
          </Link>
          <p className="mx-auto mt-5 max-w-xs text-sm leading-6 text-body-copy lg:mx-0">
            Open-source infrastructure for high-impact hackathons, built for the African developer
            community.
          </p>
          <ul className="mt-6 flex items-center justify-center gap-5 lg:justify-start">
            {SOCIAL_LINKS.map(({ label, href, Icon }) => (
              <li key={href}>
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="block text-brand transition-colors hover:text-ink-soft"
                >
                  <Icon className="size-5" />
                </a>
              </li>
            ))}
          </ul>
          <div className="mt-8">
            <p className="font-display text-sm font-semibold text-ink">
              Subscribe To Our Newsletter
            </p>
            <p className="mt-1 mb-3 text-xs text-body-copy">
              New hackathons and guides, straight to your inbox.
            </p>
            {/* The form is a capped-width block (340px) — flex centers it on
                 mobile; text-left keeps the input placeholder from inheriting
                 the column's centering. lg restores the plain block flow. */}
            <div className="flex justify-center text-left lg:block">
              <NewsletterForm tone="light" />
            </div>
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

        {/* Mobile: sits beside "Get Started" (left/right in the 2-col grid);
            lg: the fifth column of the footer row. */}
        <div className="min-w-0 lg:col-span-1">
          <h2 className="font-display text-base font-semibold text-ink">Contact Us</h2>
          <ul className="mt-5 space-y-3">
            <li>
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className={`flex items-center gap-2.5 [overflow-wrap:anywhere] ${LINK_CLASS}`}
              >
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
          <div className="mt-6 hidden lg:block">
            <Partnership />
          </div>
        </div>

        {/* Mobile: the partnership gets its own centered row under the columns
            (lg keeps it at the foot of "Contact Us"). */}
        <div className="col-span-2 text-center lg:hidden">
          <Partnership />
        </div>
      </div>

      <div className="site-container">
        <div className="grid justify-items-center gap-3 py-6 text-center text-sm text-body-copy xl:grid-cols-[1fr_auto_1fr] xl:items-center xl:gap-6">
          <p className="xl:justify-self-start">Copyright © {year} HackVillage</p>
          <p>
            A{" "}
            <a
              href="https://codewitheugene.top/"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-ink-soft underline underline-offset-2 hover:text-ink"
            >
              CodeWithEugene
            </a>{" "}
            Creation.
          </p>
          <p className="xl:justify-self-end">
            Apache-2.0 licensed
            {/* Mobile: legal links drop to their own centered row below the
                license line; xl: they flow inline exactly as before. */}
            <span className="mt-1.5 block xl:mt-0 xl:inline">
              {" | "}
              <Link
                href="/terms"
                className="text-ink-soft underline underline-offset-2 hover:text-ink"
              >
                Terms of Service
              </Link>
              {" | "}
              <Link
                href="/privacy"
                className="text-ink-soft underline underline-offset-2 hover:text-ink"
              >
                Privacy Policy
              </Link>
            </span>
          </p>
        </div>
      </div>
    </footer>
  );
}
