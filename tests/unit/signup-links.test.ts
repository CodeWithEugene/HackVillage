import { describe, expect, it } from "vitest";

import { HOST_HACKATHON_HREF, parseSignUpRole } from "@/lib/auth/signup-links";

describe("parseSignUpRole", () => {
  it("picks Organizer for ?role=organizer, in any case", () => {
    expect(parseSignUpRole("organizer")).toBe("ORGANIZER");
    expect(parseSignUpRole("Organizer")).toBe("ORGANIZER");
    expect(parseSignUpRole(["organizer", "developer"])).toBe("ORGANIZER");
  });

  it("falls back to Developer for anything else", () => {
    expect(parseSignUpRole(undefined)).toBe("DEVELOPER");
    expect(parseSignUpRole("developer")).toBe("DEVELOPER");
    expect(parseSignUpRole("admin")).toBe("DEVELOPER");
  });

  it("is what the Host A Hackathon link asks for", () => {
    const role = new URL(HOST_HACKATHON_HREF, "https://hackvillage.xyz").searchParams.get("role");
    expect(new URL(HOST_HACKATHON_HREF, "https://hackvillage.xyz").pathname).toBe("/signup");
    expect(parseSignUpRole(role ?? undefined)).toBe("ORGANIZER");
  });
});
