"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth/guards";
import { CoverError, issueCoverUpload, removeCover, setCover } from "@/lib/events/cover-service";

export interface CoverUploadTicket {
  error?: string;
  uploadUrl?: string;
  headers?: Record<string, string>;
  key?: string;
  mode?: "r2" | "local";
}

export interface CoverActionState {
  error?: string;
  coverUrl?: string | null;
}

function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof CoverError) return error.message;
  console.error("[covers]", fallback, error);
  return fallback;
}

function revalidateCover(slug: string): void {
  revalidatePath(`/organizer/hackathons/${slug}`);
  revalidatePath(`/hackathons/${slug}`);
  revalidatePath("/hackathons");
}

/** Step 1: the browser asks where to upload its processed cover. */
export async function requestCoverUploadAction(input: {
  eventId: string;
  contentType: string;
  sizeBytes: number;
}): Promise<CoverUploadTicket> {
  const user = await requireUser();
  try {
    const target = await issueCoverUpload({ userId: user.id, ...input });
    return {
      uploadUrl: target.uploadUrl,
      headers: target.headers,
      key: target.key,
      mode: target.mode,
    };
  } catch (error) {
    return { error: errorMessage(error, "We couldn't start the upload. Please try again.") };
  }
}

/** Step 3: after the upload lands, the hackathon starts using it. */
export async function saveCoverAction(input: {
  eventId: string;
  key: string;
}): Promise<CoverActionState> {
  const user = await requireUser();
  try {
    const { slug, coverUrl } = await setCover({ userId: user.id, ...input });
    revalidateCover(slug);
    return { coverUrl };
  } catch (error) {
    return { error: errorMessage(error, "We couldn't save the cover. Please try again.") };
  }
}

export async function removeCoverAction(input: { eventId: string }): Promise<CoverActionState> {
  const user = await requireUser();
  try {
    const { slug } = await removeCover({ userId: user.id, ...input });
    revalidateCover(slug);
    return { coverUrl: null };
  } catch (error) {
    return { error: errorMessage(error, "We couldn't remove the cover. Please try again.") };
  }
}
