"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth/guards";
import { KybSubmissionError, submitKyb } from "@/lib/orgs/verification-service";

export interface KybFormState {
  error?: string;
  submitted?: boolean;
}

const FIELDS = [
  "legalName",
  "registrationNumber",
  "kraPin",
  "signatoryName",
  "signatoryRole",
  "notes",
];

export async function submitKybAction(
  _prev: KybFormState,
  formData: FormData,
): Promise<KybFormState> {
  const user = await requireUser();
  const orgId = String(formData.get("orgId") ?? "");
  const input = Object.fromEntries(
    FIELDS.map((field) => [field, formData.get(field) ?? undefined]),
  );

  try {
    await submitKyb(user.id, orgId, input);
  } catch (error) {
    if (error instanceof KybSubmissionError) return { error: error.message };
    console.error(`[orgs] KYB submission failed (org=${orgId})`, error);
    return { error: "We couldn't send your details. Please try again." };
  }

  revalidatePath("/organizer", "layout");
  revalidatePath("/admin/kyb");
  return { submitted: true };
}
