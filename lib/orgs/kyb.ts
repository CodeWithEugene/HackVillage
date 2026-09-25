import { z } from "zod";

import type { OrgKind, ParseResult } from "@/lib/orgs/details";

interface KybRequirements {
  /** What the registration number is called for this kind of organization. */
  registrationLabel: string;
  kraPinRequired: boolean;
  /**
   * Documents a reviewer may ask for during the review. DRAFT: this list is
   * awaiting legal sign-off (docs/GO_LIVE_CHECKLIST.md); edit it here once
   * counsel confirms what the payment partner needs.
   */
  documents: string[];
}

export const KYB_REQUIREMENTS: Record<OrgKind, KybRequirements> = {
  COMPANY: {
    registrationLabel: "Business registration number",
    kraPinRequired: true,
    documents: [
      "Certificate of incorporation or business registration",
      "CR12 or another current list of directors",
      "KRA PIN certificate",
    ],
  },
  UNIVERSITY: {
    registrationLabel: "Charter or registration number",
    kraPinRequired: true,
    documents: [
      "Charter or registration certificate",
      "A letter authorizing the signatory to run hackathons",
      "KRA PIN certificate",
    ],
  },
  COMMUNITY: {
    registrationLabel: "Society, CBO, or club registration number",
    kraPinRequired: false,
    documents: [
      "Society, CBO, or club registration certificate",
      "A letter from the officials authorizing the signatory",
    ],
  },
  NGO: {
    registrationLabel: "NGO or foundation registration number",
    kraPinRequired: true,
    documents: [
      "Registration certificate",
      "A current list of officials or trustees",
      "KRA PIN certificate",
    ],
  },
  GOVERNMENT: {
    registrationLabel: "Agency or department reference",
    kraPinRequired: false,
    documents: ["An official letter on agency letterhead authorizing the signatory"],
  },
};

export interface KybSubmissionInput {
  legalName: string;
  registrationNumber: string;
  kraPin: string | null;
  signatoryName: string;
  signatoryRole: string;
  notes: string | null;
}

/** KRA PINs are a letter, nine digits, and a letter, e.g. P051234567Z. */
export const KRA_PIN_PATTERN = /^[AP]\d{9}[A-Z]$/;

const text = (label: string, min: number, max: number) =>
  z
    .string({ message: `${label} must be text.` })
    .trim()
    .min(min, `Add the ${label.toLowerCase()}.`)
    .max(max, `Keep the ${label.toLowerCase()} under ${max} characters.`);

const schema = z.object({
  legalName: text("Registered legal name", 2, 120),
  registrationNumber: text("Registration number", 3, 60),
  signatoryName: text("Signatory's full name", 2, 80),
  signatoryRole: text("Signatory's role", 2, 60),
  notes: z.string().trim().max(2000, "Keep the notes under 2000 characters.").optional(),
});

export function parseKybSubmission(
  input: Record<string, unknown>,
  kind: OrgKind,
): ParseResult<KybSubmissionInput> {
  const parsed = schema.safeParse({ ...input, notes: input.notes ?? undefined });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const rawPin =
    typeof input.kraPin === "string" ? input.kraPin.replace(/\s/g, "").toUpperCase() : "";
  if (rawPin && !KRA_PIN_PATTERN.test(rawPin)) {
    return {
      ok: false,
      error: "KRA PINs look like P051234567Z: a letter, nine digits, and a letter.",
    };
  }
  if (!rawPin && KYB_REQUIREMENTS[kind].kraPinRequired) {
    return { ok: false, error: "Add your organization's KRA PIN." };
  }

  return {
    ok: true,
    data: {
      legalName: parsed.data.legalName,
      registrationNumber: parsed.data.registrationNumber,
      kraPin: rawPin || null,
      signatoryName: parsed.data.signatoryName,
      signatoryRole: parsed.data.signatoryRole,
      notes: parsed.data.notes || null,
    },
  };
}

/** Organizers submit when they have not yet, or again after a rejection. A pending review is read only. */
export function canSubmitKyb(status: "NONE" | "PENDING" | "VERIFIED" | "FAILED"): boolean {
  return status === "NONE" || status === "FAILED";
}
