import { isIP } from "node:net";

import Bowser from "bowser";

import { isCloudflareIp } from "@/lib/net/cloudflare";

/**
 * What we can honestly say about a sign-in from its request headers, for the
 * "New Sign In" security email. IP, location, and time zone describe the
 * visitor's network: hackvillage.xyz is proxied through Cloudflare, so when a
 * request really came from a Cloudflare edge they come from Cloudflare's
 * cf-* headers; otherwise from Vercel's (x-forwarded-for, x-vercel-ip-*).
 * Locations are approximate and absent in local development.
 */
export interface SignInContext {
  time: string;
  device: string;
  browser: string;
  location: string;
  ip: string;
  method: string;
}

interface HeaderReader {
  get(name: string): string | null;
}

const FALLBACK_TIME_ZONE = "Africa/Nairobi";

const METHOD_LABELS: Record<string, string> = {
  credentials: "Email and password",
  google: "Google",
  github: "GitHub",
};

/** "Google" for google, "Email and password" for credentials. */
export function signInMethodLabel(provider?: string): string {
  return METHOD_LABELS[provider ?? ""] ?? (provider ? provider : "Unknown");
}

const PLATFORM_LABELS: Record<string, string> = {
  mobile: "Phone",
  tablet: "Tablet",
  desktop: "Computer",
  tv: "TV",
};

// Browsers freeze these in the user agent (macOS reports 10.15.7 forever and
// Windows 10 and 11 both say NT 10.0), so their versions would be misleading.
const OS_WITHOUT_RELIABLE_VERSION = new Set(["macOS", "Windows"]);

const countryNames = new Intl.DisplayNames(["en"], { type: "region" });

// Brands as Chromium-based browsers name themselves in Sec-CH-UA, mapped to
// what people call them. Brands not listed here are shown as sent.
const CLIENT_HINT_BRANDS: Record<string, string> = {
  "Google Chrome": "Chrome",
  "Microsoft Edge": "Microsoft Edge",
  Brave: "Brave",
  Opera: "Opera",
  "Opera GX": "Opera GX",
  Vivaldi: "Vivaldi",
  "Samsung Internet": "Samsung Internet",
  YaBrowser: "Yandex Browser",
  DuckDuckGo: "DuckDuckGo",
};

/**
 * The browser named in the Sec-CH-UA client hint, e.g.
 * `"Chromium";v="152", "Brave";v="152", "Not)A;Brand";v="24"` is "Brave 152".
 * Brave (and some others) send exactly Chrome's user agent on purpose, so
 * this hint is the only honest way to tell them apart server side. The
 * generic "Chromium" brand and the randomized "Not A Brand" filler are
 * skipped; null means the hint names no specific browser.
 */
export function browserFromClientHints(secChUa: string | null): string | null {
  if (!secChUa) return null;
  const brands = [...secChUa.matchAll(/"([^"]*)"\s*;\s*v\s*=\s*"([^"]*)"/g)].map((match) => ({
    name: match[1].trim(),
    version: match[2].trim(),
  }));
  const specific = brands.find(
    (brand) =>
      brand.name !== "Chromium" &&
      !/not.?a.?brand/i.test(brand.name) &&
      /^[\w .()-]{1,40}$/.test(brand.name),
  );
  if (!specific) return null;
  const name = CLIENT_HINT_BRANDS[specific.name] ?? specific.name;
  const major = specific.version.split(".")[0];
  return /^\d{1,4}$/.test(major) ? `${name} ${major}` : name;
}

function describeDevice(headers: HeaderReader): { device: string; browser: string } {
  const userAgent = headers.get("user-agent");
  const hintedBrowser = browserFromClientHints(headers.get("sec-ch-ua"));
  if (!userAgent) return { device: "Unknown device", browser: hintedBrowser ?? "Unknown browser" };
  const { browser, os, platform } = Bowser.getParser(userAgent).getResult();

  const hardware =
    platform.model ??
    (platform.vendor === "Apple" && platform.type === "desktop"
      ? "Mac"
      : (PLATFORM_LABELS[platform.type ?? ""] ?? "Device"));
  const osVersion = os.name && !OS_WITHOUT_RELIABLE_VERSION.has(os.name) ? os.version : undefined;
  const osLabel = [os.name, osVersion].filter(Boolean).join(" ");
  const majorVersion = browser.version?.split(".")[0];

  return {
    device: osLabel ? `${hardware} running ${osLabel}` : hardware,
    browser:
      hintedBrowser ??
      (browser.name ? [browser.name, majorVersion].filter(Boolean).join(" ") : "Unknown browser"),
  };
}

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

/** The visitor's network as far as the headers can prove it. */
interface ClientNetwork {
  ip: string | null;
  city: string | null;
  countryCode: string | null;
  timeZone: string | null;
}

function firstHeaderValue(headers: HeaderReader, name: string): string | null {
  return headers.get(name)?.split(",")[0]?.trim() || null;
}

/**
 * Vercel sets x-forwarded-for to the address that connected to it. When that
 * address is a Cloudflare edge, the visitor is behind it, and Cloudflare's
 * cf-connecting-ip and geolocation headers describe them instead. The edge
 * check matters: without it anyone could send cf-* headers straight to
 * Vercel and choose what the email says.
 */
export function clientNetwork(headers: HeaderReader): ClientNetwork {
  const connectingIp =
    firstHeaderValue(headers, "x-forwarded-for") ?? firstHeaderValue(headers, "x-real-ip");
  const cloudflareClientIp = firstHeaderValue(headers, "cf-connecting-ip");

  if (
    connectingIp &&
    isCloudflareIp(connectingIp) &&
    cloudflareClientIp &&
    isIP(cloudflareClientIp)
  ) {
    return {
      ip: cloudflareClientIp,
      city: headers.get("cf-ipcity"),
      countryCode: headers.get("cf-ipcountry"),
      timeZone: headers.get("cf-timezone"),
    };
  }
  return {
    ip: connectingIp,
    city: headers.get("x-vercel-ip-city"),
    countryCode: headers.get("x-vercel-ip-country"),
    timeZone: headers.get("x-vercel-ip-timezone"),
  };
}

function describeCountry(code: string | null): string | undefined {
  if (!code) return undefined;
  if (code === "T1") return "Tor network";
  if (!/^[A-Z]{2}$/.test(code) || code === "XX") return undefined;
  return countryNames.of(code) ?? code;
}

function describeLocation(network: ClientNetwork): string {
  const parts = [
    network.city ? safeDecode(network.city) : undefined,
    describeCountry(network.countryCode),
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : "Unknown location";
}

function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-KE", { timeZone });
    return true;
  } catch {
    return false;
  }
}

/** "Friday, 25 September 2026 at 14:03 EAT" in the sign-in location's time zone. */
function describeTime(requested: string | null, now: Date): string {
  const timeZone = requested && isValidTimeZone(requested) ? requested : FALLBACK_TIME_ZONE;
  const parts = new Intl.DateTimeFormat("en-KE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone,
    timeZoneName: "short",
  }).formatToParts(now);
  const pick = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return `${pick("weekday")}, ${pick("day")} ${pick("month")} ${pick("year")} at ${pick("hour")}:${pick("minute")} ${pick("timeZoneName")}`;
}

export function describeSignIn({
  headers,
  provider,
  now = new Date(),
}: {
  headers: HeaderReader;
  provider?: string;
  now?: Date;
}): SignInContext {
  const network = clientNetwork(headers);
  return {
    time: describeTime(network.timeZone, now),
    ...describeDevice(headers),
    location: describeLocation(network),
    ip: network.ip ?? "Unknown",
    method: signInMethodLabel(provider),
  };
}
