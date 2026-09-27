"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import {
  MediaError,
  applyManualTrustAdjustment,
  confirmMediaUpload,
  createUploadTarget,
  grantMediaAppeal,
  setMediaStatus,
} from "@/services/media/service";

export interface MediaActionState {
  error?: string;
  message?: string;
  uploadUrl?: string;
  uploadHeaders?: Record<string, string>;
  publicUrl?: string;
  /** The key the client confirms against after the upload lands. */
  key?: string;
}

function toState(error: unknown): MediaActionState {
  if (error instanceof MediaError) return { error: error.message };
  console.error("[media] action failed", error);
  return { error: "Something went wrong. Try again in a moment." };
}

/** The organizer media page is routed by slug — never revalidate by id. */
async function revalidateMediaPage(eventId: string): Promise<void> {
  const event = await prisma.event.findUnique({ where: { id: eventId }, select: { slug: true } });
  if (event) revalidatePath(`/organizer/hackathons/${event.slug}/media`);
}

// ── Organizer: media vault ───────────────────────────────────────────────

/**
 * Step 1: issue the upload target ONLY — no MediaAsset row exists until the
 * client confirms the landed upload (confirmMediaUploadAction).
 */
export async function requestUploadUrlAction(
  _prev: MediaActionState,
  formData: FormData
): Promise<MediaActionState> {
  const user = await requireUser();
  const eventId = z.string().cuid().safeParse(String(formData.get("eventId") ?? ""));
  const filename = z.string().trim().min(3).max(120).safeParse(String(formData.get("filename") ?? ""));
  const contentType = z.string().trim().min(3).max(60).safeParse(String(formData.get("contentType") ?? ""));
  const sizeBytes = z.coerce.number().int().positive().safeParse(String(formData.get("sizeBytes") ?? "0"));

  if (!eventId.success || !filename.success || !contentType.success || !sizeBytes.success) {
    return { error: "Pick a valid file first." };
  }

  try {
    const target = await createUploadTarget({
      eventId: eventId.data,
      userId: user.id,
      filename: filename.data,
      contentType: contentType.data,
      sizeBytes: sizeBytes.data,
    });
    return {
      message: "Upload ready. Complete it in your browser.",
      uploadUrl: target.uploadUrl,
      uploadHeaders: target.headers,
      publicUrl: target.publicUrl,
      key: target.key,
    };
  } catch (error) {
    return toState(error);
  }
}

/** Step 2: the client PUT the file — verify it landed, then create the row. */
export async function confirmMediaUploadAction(input: {
  eventId: string;
  key: string;
  kind: "PHOTO" | "VIDEO";
  caption?: string;
}): Promise<MediaActionState> {
  const user = await requireUser();
  const eventId = z.string().cuid().safeParse(input.eventId);
  const key = z.string().trim().min(10).max(200).safeParse(input.key);
  if (!eventId.success || !key.success || (input.kind !== "PHOTO" && input.kind !== "VIDEO")) {
    return { error: "The upload confirmation was malformed. Try the upload again." };
  }

  try {
    await confirmMediaUpload({
      eventId: eventId.data,
      userId: user.id,
      key: key.data,
      kind: input.kind,
      caption: input.caption?.trim().slice(0, 300) || undefined,
    });
    await revalidateMediaPage(eventId.data);
    return { message: "Added to the vault." };
  } catch (error) {
    return toState(error);
  }
}

export async function setMediaStatusAction(
  assetId: string,
  status: "APPROVED" | "HIDDEN"
): Promise<void> {
  const user = await requireUser();
  try {
    const asset = await prisma.mediaAsset.findUnique({
      where: { id: assetId },
      select: { eventId: true },
    });
    await setMediaStatus(assetId, user.id, status);
    if (asset) await revalidateMediaPage(asset.eventId);
  } catch (error) {
    console.error("[media] status change failed", error);
  }
}

// ── Admin: trust adjustments & appeals ───────────────────────────────────

export async function adjustTrustAction(
  _prev: MediaActionState,
  formData: FormData
): Promise<MediaActionState> {
  const user = await requireUser();
  const orgId = z.string().cuid().safeParse(String(formData.get("orgId") ?? ""));
  const delta = z.coerce.number().int().safeParse(String(formData.get("delta") ?? "0"));
  const reason = z.string().trim().min(6).max(300).safeParse(String(formData.get("reason") ?? ""));
  const appeal = String(formData.get("appeal") ?? "") === "1";

  if (!orgId.success || !reason.success) {
    return { error: reason.error?.issues[0]?.message ?? "Check the form and try again." };
  }

  try {
    if (appeal) {
      const original = String(formData.get("originalReason") ?? "");
      await grantMediaAppeal({
        adminId: user.id,
        orgId: orgId.data,
        originalReason: original,
        note: reason.data,
      });
    } else {
      if (!delta.success) return { error: "Delta must be a whole number." };
      await applyManualTrustAdjustment({
        adminId: user.id,
        orgId: orgId.data,
        delta: delta.data,
        reason: reason.data,
      });
    }
    revalidatePath("/admin/trust");
    return { message: "Trust updated and audit logged." };
  } catch (error) {
    return toState(error);
  }
}
