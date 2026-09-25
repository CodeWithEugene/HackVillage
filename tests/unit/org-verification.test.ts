import { describe, expect, it } from "vitest";

import {
  formatOrgLocation,
  normalizePhone,
  normalizeUrl,
  parseOrgDetails,
} from "@/lib/orgs/details";
import { canSubmitKyb, KYB_REQUIREMENTS, parseKybSubmission } from "@/lib/orgs/kyb";

const validDetails = {
  kind: "COMPANY",
  city: "Nairobi",
  country: "Kenya",
  website: "technetium.co.ke",
  socialUrl: "",
  contactPhone: "0712 345 678",
};

describe("normalizePhone", () => {
  it("turns Kenyan numbers into +254 form", () => {
    expect(normalizePhone("0712 345 678")).toBe("+254712345678");
    expect(normalizePhone("0110-345-678")).toBe("+254110345678");
    expect(normalizePhone("254712345678")).toBe("+254712345678");
    expect(normalizePhone("+254 (712) 345 678")).toBe("+254712345678");
  });

  it("keeps other country codes and rejects junk", () => {
    expect(normalizePhone("+256 772 123456")).toBe("+256772123456");
    expect(normalizePhone("12345")).toBeNull();
    expect(normalizePhone("call me")).toBeNull();
    expect(normalizePhone("+0712345678")).toBeNull();
  });
});

describe("normalizeUrl", () => {
  it("adds https and keeps web links only", () => {
    expect(normalizeUrl("technetium.co.ke")).toBe("https://technetium.co.ke/");
    expect(normalizeUrl("http://example.com/about")).toBe("http://example.com/about");
    expect(normalizeUrl("javascript:alert(1)")).toBeNull();
    expect(normalizeUrl("ftp://example.com")).toBeNull();
    expect(normalizeUrl("localhost")).toBeNull();
    expect(normalizeUrl("   ")).toBeNull();
  });
});

describe("parseOrgDetails", () => {
  it("accepts a complete profile and normalizes it", () => {
    const result = parseOrgDetails(validDetails);
    expect(result).toEqual({
      ok: true,
      data: {
        kind: "COMPANY",
        city: "Nairobi",
        country: "Kenya",
        website: "https://technetium.co.ke/",
        socialUrl: null,
        contactPhone: "+254712345678",
      },
    });
  });

  it("requires a kind, a city, and a phone from organizers", () => {
    expect(parseOrgDetails({ ...validDetails, kind: "PIRATES" }).ok).toBe(false);
    expect(parseOrgDetails({ ...validDetails, city: "" }).ok).toBe(false);
    expect(parseOrgDetails({ ...validDetails, contactPhone: "" }).ok).toBe(false);
  });

  it("defaults the country to Kenya", () => {
    const result = parseOrgDetails({ ...validDetails, country: "" });
    expect(result.ok && result.data.country).toBe("Kenya");
  });

  it("rejects links that aren't web addresses", () => {
    const result = parseOrgDetails({ ...validDetails, socialUrl: "javascript:alert(1)" });
    expect(result).toEqual({
      ok: false,
      error: "That social link doesn't look like a web address.",
    });
  });

  it("lets the HackVillage team leave kind, city, and phone blank, but still checks what they fill in", () => {
    const blank = parseOrgDetails(
      { ...validDetails, kind: "", city: "", contactPhone: "" },
      { allowBlank: true },
    );
    expect(blank.ok && blank.data).toMatchObject({ kind: null, city: null, contactPhone: null });
    expect(parseOrgDetails({ ...validDetails, contactPhone: "12" }, { allowBlank: true }).ok).toBe(
      false,
    );
  });
});

describe("formatOrgLocation", () => {
  it("joins what is known", () => {
    expect(formatOrgLocation({ city: "Kisumu", country: "Kenya" })).toBe("Kisumu, Kenya");
    expect(formatOrgLocation({ city: null, country: "Kenya" })).toBe("Kenya");
    expect(formatOrgLocation({ city: null, country: null })).toBeNull();
  });
});

describe("parseKybSubmission", () => {
  const valid = {
    legalName: "Technetium Kenya Limited",
    registrationNumber: "PVT-ABC123",
    kraPin: "p051234567z",
    signatoryName: "Wanjiku Kamau",
    signatoryRole: "Director",
    notes: "",
  };

  it("uppercases the KRA PIN and drops empty notes", () => {
    const result = parseKybSubmission(valid, "COMPANY");
    expect(result.ok && result.data).toMatchObject({ kraPin: "P051234567Z", notes: null });
  });

  it("rejects a malformed KRA PIN", () => {
    expect(parseKybSubmission({ ...valid, kraPin: "12345" }, "COMPANY").ok).toBe(false);
  });

  it("requires a KRA PIN only where the kind needs one", () => {
    expect(parseKybSubmission({ ...valid, kraPin: "" }, "COMPANY").ok).toBe(false);
    const community = parseKybSubmission({ ...valid, kraPin: "" }, "COMMUNITY");
    expect(community.ok && community.data.kraPin).toBeNull();
  });

  it("requires the signatory", () => {
    expect(parseKybSubmission({ ...valid, signatoryName: "" }, "COMPANY").ok).toBe(false);
  });
});

describe("KYB rules", () => {
  it("allows a submission before review and after a rejection only", () => {
    expect(canSubmitKyb("NONE")).toBe(true);
    expect(canSubmitKyb("FAILED")).toBe(true);
    expect(canSubmitKyb("PENDING")).toBe(false);
    expect(canSubmitKyb("VERIFIED")).toBe(false);
  });

  it("lists documents and a registration label for every kind", () => {
    for (const requirement of Object.values(KYB_REQUIREMENTS)) {
      expect(requirement.registrationLabel.length).toBeGreaterThan(0);
      expect(requirement.documents.length).toBeGreaterThan(0);
      expect(requirement.documents.join(" ")).not.toMatch(/[—–]/);
    }
  });
});
