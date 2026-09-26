import { appUrl } from "@/lib/url";

import {
  CONTACT_EMAIL,
  KNOW_ABOUT,
  LOGO_PATH,
  SAME_AS,
  SITE_ALTERNATE_NAME,
  SITE_DESCRIPTION,
  SITE_NAME,
} from "@/lib/seo/site";

/**
 * JSON-LD builders. Every helper emits plain objects that the <JsonLd />
 * component serializes into <script type="application/ld+json">.
 *
 * Rules for this file:
 * - Only factual, publicly visible data. Structured data that contradicts the
 *   page content is a manual-action risk (Google spam policy).
 * - All URLs absolute (schema.org requires it) — go through appUrl().
 * - The Organization node is the entity anchor; other types reference it by
 *   its @id so search engines build one connected graph.
 */

type Schema = Record<string, unknown>;

export const ORGANIZATION_ID = appUrl("/#organization");
export const WEBSITE_ID = appUrl("/#website");

export function organizationSchema(): Schema {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": ORGANIZATION_ID,
    name: SITE_NAME,
    alternateName: SITE_ALTERNATE_NAME,
    url: appUrl("/"),
    logo: {
      "@type": "ImageObject",
      url: appUrl(LOGO_PATH),
    },
    description: SITE_DESCRIPTION,
    email: CONTACT_EMAIL,
    sameAs: [...SAME_AS],
    address: {
      "@type": "PostalAddress",
      addressCountry: "KE",
    },
    knowAbout: [...KNOW_ABOUT],
  };
}

export function websiteSchema(): Schema {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": WEBSITE_ID,
    name: SITE_NAME,
    alternateName: SITE_ALTERNATE_NAME,
    url: appUrl("/"),
    description: SITE_DESCRIPTION,
    inLanguage: "en",
    publisher: { "@id": ORGANIZATION_ID },
  };
}

export interface EventSchemaInput {
  slug: string;
  title: string;
  summary?: string | null;
  startsAt: Date;
  endsAt: Date;
  venueType: "PHYSICAL" | "ONLINE" | "HYBRID";
  location?: string | null;
  /** Absolute or root-relative image URL (cover). */
  coverUrl: string;
  orgName: string;
  orgWebsite?: string | null;
}

const ATTENDANCE_MODE = {
  PHYSICAL: "https://schema.org/OfflineEventAttendanceMode",
  ONLINE: "https://schema.org/OnlineEventAttendanceMode",
  HYBRID: "https://schema.org/MixedEventAttendanceMode",
} as const;

export function eventSchema(event: EventSchemaInput): Schema {
  const pageUrl = appUrl(`/hackathons/${event.slug}`);
  const location: Schema =
    event.venueType === "ONLINE"
      ? { "@type": "VirtualLocation", url: pageUrl }
      : {
          "@type": "Place",
          name: event.location ?? "Venue to be announced",
          address: {
            "@type": "PostalAddress",
            // Listings are Kenya-first; the stored location text (e.g.
            // "Nairobi Innovation Hub") carries the city detail.
            addressLocality: event.location ?? undefined,
            addressCountry: "KE",
          },
        };
  return {
    "@context": "https://schema.org",
    "@type": "Event",
    name: event.title,
    description: event.summary ?? event.title,
    startDate: event.startsAt.toISOString(),
    endDate: event.endsAt.toISOString(),
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: ATTENDANCE_MODE[event.venueType],
    location,
    image: [event.coverUrl.startsWith("/") ? appUrl(event.coverUrl) : event.coverUrl],
    url: pageUrl,
    isAccessibleForFree: true,
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "KES",
      url: pageUrl,
      availability: "https://schema.org/InStock",
    },
    organizer: {
      "@type": "Organization",
      name: event.orgName,
      ...(event.orgWebsite ? { url: event.orgWebsite } : {}),
    },
  };
}

export interface ArticleSchemaInput {
  slug: string;
  title: string;
  excerpt: string;
  /** ISO date, YYYY-MM-DD. */
  publishedAt: string;
  author: string;
  cover: string;
}

export function articleSchema(meta: ArticleSchemaInput): Schema {
  const pageUrl = appUrl(`/blog/${meta.slug}`);
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: meta.title,
    description: meta.excerpt,
    image: [appUrl(meta.cover)],
    datePublished: meta.publishedAt,
    dateModified: meta.publishedAt,
    author: {
      "@type": "Organization",
      name: meta.author,
      url: appUrl("/"),
    },
    publisher: { "@id": ORGANIZATION_ID },
    mainEntityOfPage: { "@type": "WebPage", "@id": pageUrl },
    inLanguage: "en",
  };
}

export function breadcrumbSchema(items: { name: string; path: string }[]): Schema {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: appUrl(item.path),
    })),
  };
}

export function faqSchema(qas: { question: string; answer: string }[]): Schema {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: qas.map((qa) => ({
      "@type": "Question",
      name: qa.question,
      acceptedAnswer: { "@type": "Answer", text: qa.answer },
    })),
  };
}

export interface ProfileSchemaInput {
  handle: string;
  name: string | null;
  headline?: string | null;
  bio?: string | null;
  location?: string | null;
  githubLogin?: string | null;
  linkedinUrl?: string | null;
}

export function profileSchema(profile: ProfileSchemaInput): Schema {
  const pageUrl = appUrl(`/developers/${profile.handle}`);
  const sameAs = [
    ...(profile.githubLogin ? [`https://github.com/${profile.githubLogin}`] : []),
    ...(profile.linkedinUrl ? [profile.linkedinUrl] : []),
  ];
  return {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    url: pageUrl,
    mainEntity: {
      "@type": "Person",
      name: profile.name ?? `@${profile.handle}`,
      alternateName: `@${profile.handle}`,
      url: pageUrl,
      ...(profile.headline ? { description: profile.headline } : {}),
      ...(profile.bio ? { knowsAbout: profile.bio.slice(0, 300) } : {}),
      ...(profile.location
        ? {
            address: {
              "@type": "PostalAddress",
              addressLocality: profile.location,
            },
          }
        : {}),
      ...(sameAs.length > 0 ? { sameAs } : {}),
      memberOf: { "@id": ORGANIZATION_ID },
    },
  };
}

export function itemListSchema(name: string, items: { title: string; path: string }[]): Schema {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name,
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.title,
      url: appUrl(item.path),
    })),
  };
}
