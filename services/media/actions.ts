"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import {
  MediaError,
  applyManualTrustAdjustment,
  createUploadTarget,
  grantMediaAppeal,
  registerMediaAsset,
  setMediaStatus,
} from "@/services/media/service";

export interface MediaActionState {
  error?: string;
  message?: string;
  uploadUrl?: string;
  uploadHeaders?: Record<string, string>;
  publicUrl?: string;
}

function toState(error: unknown): MediaActionState {
  if (error instanceof MediaError) return { error: error.message };
  console.error("[media] action failed", error);
  return { error: "Something went wrong — try again in a moment." };
}

// ── Organizer: media vault ───────────────────────────────────────────────

export async function requestUploadUrlAction(
  _prev: MediaActionState,
  formData: FormData
): Promise<MediaActionState> {
  const user = await requireUser();
  const eventId = z.string().cuid().safeParse(String(formData.get("eventId") ?? ""));
  const filename = z.string().trim().min(3).max(120).safeParse(String(formData.get("filename") ?? ""));
  const contentType = z.string().trim().min(3).max(60).safeParse(String(formData.get("contentType") ?? ""));
  const sizeBytes = z.coerce.number().int().positive().safeParse(String(formData.get("sizeBytes") ?? "0"));
  const caption = String(formData.get("caption") ?? "").trim().slice(0, 300) || undefined;

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

    // Dev/local mode: the client posts the file to our own route which calls
    // registerMediaAsset. Prod (R2): the client PUTs directly, then registers.
    if (target.uploadUrl.includes("/api/dev/media/upload/")) {
      return {
        message: "dev-upload",
        uploadUrl: target.uploadUrl,
        uploadHeaders: target.headers,
        publicUrl: target.publicUrl,
      };
    }

    await registerMediaAsset({
      eventId: eventId.data,
      userId: user.id,
      key: target.key,
      kind: contentType.data.startsWith("video/") ? "VIDEO" : "PHOTO",
      caption,
    });
    revalidatePath(`/organizer/events/${eventId.data}/media`);
    return { message: "Upload ready — complete it in your browser.", uploadUrl: target.uploadUrl, uploadHeaders: target.headers };
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
    if (asset) revalidatePath(`/organizer/events/${asset.eventId}/media`);
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
    return { message: "Trust updated — audit logged." };
  } catch (error) {
    return toState(error);
  }
}
