import Bowser from "bowser";

/**
 * What we can honestly say about a sign-in from its request headers, for the
 * "New Sign In" security email. Location and time zone come from Vercel's IP
 * geolocation headers (x-vercel-ip-*), so they're approximate and are absent
 * in local development.
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

function describeDevice(userAgent: string | null): { device: string; browser: string } {
  if (!userAgent) return { device: "Unknown device", browser: "Unknown browser" };
  const { browser, os, platform } = Bowser.getParser(userAgent).getResult();

  const hardware =
    platform.model ??
    (platform.vendor === "Apple" && platform.type === "desktop"
      ? "Mac"
      : PLATFORM_LABELS[platform.type ?? ""] ?? "Device");
  const osVersion = os.name && !OS_WITHOUT_RELIABLE_VERSION.has(os.name) ? os.version : undefined;
  const osLabel = [os.name, osVersion].filter(Boolean).join(" ");
  const majorVersion = browser.version?.split(".")[0];

  return {
    device: osLabel ? `${hardware} running ${osLabel}` : hardware,
    browser: browser.name
      ? [browser.name, majorVersion].filter(Boolean).join(" ")
      : "Unknown browser",
  };
}

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function describeLocation(headers: HeaderReader): string {
  const city = headers.get("x-vercel-ip-city");
  const countryCode = headers.get("x-vercel-ip-country");
  let country: string | undefined;
  if (countryCode && /^[A-Z]{2}$/.test(countryCode)) {
    country = countryNames.of(countryCode) ?? countryCode;
  }
  const parts = [city ? safeDecode(city) : undefined, country].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : "Unknown location";
}

function describeIp(headers: HeaderReader): string {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || headers.get("x-real-ip")?.trim() || "Unknown";
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
function describeTime(headers: HeaderReader, now: Date): string {
  const requested = headers.get("x-vercel-ip-timezone");
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
  return {
    time: describeTime(headers, now),
    ...describeDevice(headers.get("user-agent")),
    location: describeLocation(headers),
    ip: describeIp(headers),
    method: signInMethodLabel(provider),
  };
}
