import { z } from "zod";

export const ORG_KINDS = ["COMPANY", "UNIVERSITY", "COMMUNITY", "NGO", "GOVERNMENT"] as const;
export type OrgKind = (typeof ORG_KINDS)[number];

export const ORG_KIND_LABELS: Record<OrgKind, string> = {
  COMPANY: "Company",
  UNIVERSITY: "University Or School",
  COMMUNITY: "Community Or Club",
  NGO: "Nonprofit Or Foundation",
  GOVERNMENT: "Government Agency",
};

export function isOrgKind(value: unknown): value is OrgKind {
  return typeof value === "string" && (ORG_KINDS as readonly string[]).includes(value);
}

export const DEFAULT_COUNTRY = "Kenya";

/** The public and contact details an organization keeps on its profile. */
export interface OrgDetails {
  /** Only null when parsed with `allowBlank` (the HackVillage team filling in a profile). */
  kind: OrgKind | null;
  city: string | null;
  country: string;
  website: string | null;
  socialUrl: string | null;
  contactPhone: string | null;
}

export type ParseResult<T> = { ok: true; data: T } | { ok: false; error: string };

/**
 * "0712 345 678", "254712345678" and "+254 712 345678" all become
 * "+254712345678". Numbers with another country code keep it. Returns null
 * when the digits can't be a phone number.
 */
export function normalizePhone(raw: string): string | null {
  const trimmed = raw.trim();
  if (!/^\+?[\d\s().-]+$/.test(trimmed)) return null;
  const digits = trimmed.replace(/\D/g, "");
  let e164: string;
  if (trimmed.startsWith("+")) e164 = `+${digits}`;
  else if (/^0[17]\d{8}$/.test(digits)) e164 = `+254${digits.slice(1)}`;
  else if (digits.startsWith("254")) e164 = `+${digits}`;
  else return null;
  return /^\+[1-9]\d{7,14}$/.test(e164) ? e164 : null;
}

/** Adds https:// when the scheme is missing; only http(s) links are kept. */
export function normalizeUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const withScheme = /^[a-z][a-z\d+.-]*:/i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const url = new URL(withScheme);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    if (!url.hostname.includes(".")) return null;
    return url.toString();
  } catch {
    return null;
  }
}

const placeSchema = (label: string) =>
  z
    .string({ message: `${label} must be text.` })
    .trim()
    .min(2, `Add your ${label.toLowerCase()}.`)
    .max(60, `Keep the ${label.toLowerCase()} under 60 characters.`);

function optionalLink(raw: unknown, label: string): ParseResult<string | null> {
  const text = typeof raw === "string" ? raw.trim() : "";
  if (!text) return { ok: true, data: null };
  if (text.length > 200) return { ok: false, error: `Keep the ${label} under 200 characters.` };
  const url = normalizeUrl(text);
  return url
    ? { ok: true, data: url }
    : { ok: false, error: `That ${label} doesn't look like a web address.` };
}

const isBlank = (value: unknown) => typeof value !== "string" || value.trim() === "";

/**
 * Validates the organization details collected at setup and on the profile
 * form. Organizers must give a kind, city, and phone. `allowBlank` lets the
 * HackVillage team save a profile while those are still unknown; anything
 * they do fill in is still validated.
 */
export function parseOrgDetails(
  input: {
    kind: unknown;
    city: unknown;
    country: unknown;
    website: unknown;
    socialUrl: unknown;
    contactPhone: unknown;
  },
  { allowBlank = false }: { allowBlank?: boolean } = {},
): ParseResult<OrgDetails> {
  const kind = allowBlank && isBlank(input.kind) ? null : input.kind;
  if (kind !== null && !isOrgKind(kind)) {
    return { ok: false, error: "Choose what kind of organization you are." };
  }

  let city: string | null = null;
  if (!(allowBlank && isBlank(input.city))) {
    const parsedCity = placeSchema("City").safeParse(input.city ?? "");
    if (!parsedCity.success) return { ok: false, error: parsedCity.error.issues[0].message };
    city = parsedCity.data;
  }
  const country = placeSchema("Country").safeParse(input.country || DEFAULT_COUNTRY);
  if (!country.success) return { ok: false, error: country.error.issues[0].message };

  const website = optionalLink(input.website, "website");
  if (!website.ok) return website;
  const socialUrl = optionalLink(input.socialUrl, "social link");
  if (!socialUrl.ok) return socialUrl;

  let phone: string | null = null;
  if (!(allowBlank && isBlank(input.contactPhone))) {
    phone = typeof input.contactPhone === "string" ? normalizePhone(input.contactPhone) : null;
    if (!phone) {
      return {
        ok: false,
        error: "Add a contact phone number, for example 0712 345 678 or +254 712 345 678.",
      };
    }
  }

  return {
    ok: true,
    data: {
      kind,
      city,
      country: country.data,
      website: website.data,
      socialUrl: socialUrl.data,
      contactPhone: phone,
    },
  };
}

/** "Nairobi, Kenya" for the public organizer card. */
export function formatOrgLocation(org: {
  city: string | null;
  country: string | null;
}): string | null {
  return [org.city, org.country].filter(Boolean).join(", ") || null;
}
