import { describe, expect, it } from "vitest";

import { signInAlertEmail } from "@/lib/auth/mail-templates";
import { describeSignIn } from "@/lib/auth/sign-in-context";

const UA = {
  macChrome:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
  iphone:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
  android:
    "Mozilla/5.0 (Linux; Android 14; SM-A546E) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36",
  windowsEdge:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36 Edg/128.0.0.0",
};

const NOW = new Date("2026-09-25T11:03:00Z");

function ctx(headers: Record<string, string>, provider = "credentials") {
  return describeSignIn({ headers: new Headers(headers), provider, now: NOW });
}

describe("describeSignIn device and browser", () => {
  it("names a Mac without the frozen macOS version browsers report", () => {
    expect(ctx({ "user-agent": UA.macChrome })).toMatchObject({
      device: "Mac running macOS",
      browser: "Chrome 128",
    });
  });

  it("keeps real OS versions for phones", () => {
    expect(ctx({ "user-agent": UA.iphone })).toMatchObject({
      device: "iPhone running iOS 17.5",
      browser: "Safari 17",
    });
    expect(ctx({ "user-agent": UA.android })).toMatchObject({
      device: "Phone running Android 14",
      browser: "Chrome 128",
    });
  });

  it("does not guess between Windows 10 and 11", () => {
    expect(ctx({ "user-agent": UA.windowsEdge })).toMatchObject({
      device: "Computer running Windows",
      browser: "Microsoft Edge 128",
    });
  });

  it("says unknown instead of guessing when there is no user agent", () => {
    expect(ctx({})).toMatchObject({ device: "Unknown device", browser: "Unknown browser" });
  });
});

describe("describeSignIn location, IP, time, and method", () => {
  it("reads Vercel's geolocation headers into a city and country", () => {
    const result = ctx({
      "x-vercel-ip-city": "Nairobi",
      "x-vercel-ip-country": "KE",
      "x-forwarded-for": "41.90.64.10, 76.76.21.9",
    });
    expect(result.location).toBe("Nairobi, Kenya");
    expect(result.ip).toBe("41.90.64.10");
  });

  it("decodes URL encoded city names", () => {
    expect(ctx({ "x-vercel-ip-city": "S%C3%A3o%20Paulo", "x-vercel-ip-country": "BR" }).location).toBe(
      "São Paulo, Brazil"
    );
  });

  it("falls back to the country, then to unknown", () => {
    expect(ctx({ "x-vercel-ip-country": "UG" }).location).toBe("Uganda");
    expect(ctx({}).location).toBe("Unknown location");
    expect(ctx({}).ip).toBe("Unknown");
  });

  it("shows the time in the sign in location's own time zone", () => {
    expect(ctx({ "x-vercel-ip-timezone": "Africa/Nairobi" }).time).toBe(
      "Friday, 25 September 2026 at 14:03 EAT"
    );
    expect(ctx({ "x-vercel-ip-timezone": "America/New_York" }).time).toBe(
      "Friday, 25 September 2026 at 07:03 GMT-4"
    );
  });

  it("uses Nairobi time when the time zone is missing or invalid", () => {
    expect(ctx({ "x-vercel-ip-timezone": "Not/AZone" }).time).toBe(
      "Friday, 25 September 2026 at 14:03 EAT"
    );
  });

  it("names the sign in method", () => {
    expect(ctx({}, "credentials").method).toBe("Email and password");
    expect(ctx({}, "google").method).toBe("Google");
    expect(ctx({}, "github").method).toBe("GitHub");
  });
});

describe("signInAlertEmail", () => {
  it("lists every detail and links to a password reset", () => {
    const email = signInAlertEmail(
      ctx({ "user-agent": UA.iphone, "x-vercel-ip-city": "Nairobi", "x-vercel-ip-country": "KE" }),
      "https://www.hackvillage.xyz/forgot-password"
    );
    expect(email.subject).toBe("New Sign In To Your HackVillage Account");
    for (const value of ["iPhone running iOS 17.5", "Safari 17", "Nairobi, Kenya", "Email and password"]) {
      expect(email.html).toContain(value);
      expect(email.text).toContain(value);
    }
    expect(email.html).toContain("https://www.hackvillage.xyz/forgot-password");
  });

  it("escapes request derived values so a crafted header can't inject HTML", () => {
    const email = signInAlertEmail(
      ctx({ "x-vercel-ip-city": encodeURIComponent('<img src=x onerror="alert(1)">') }),
      "https://www.hackvillage.xyz/forgot-password"
    );
    expect(email.html).not.toContain("<img src=x");
    expect(email.html).toContain("&lt;img src=x");
  });
});
