"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { FormError } from "@/components/ui/input";
import {
  removeCoverAction,
  requestCoverUploadAction,
  saveCoverAction,
} from "@/lib/events/cover-actions";
import {
  COVER_HEIGHT,
  COVER_MIN_HEIGHT,
  COVER_MIN_WIDTH,
  COVER_SOURCE_MAX_BYTES,
  COVER_SOURCE_TYPES,
  COVER_WIDTH,
  coverCropRect,
  validateCoverSource,
} from "@/lib/events/cover-upload";

interface CoverUploaderProps {
  eventId: string;
  /** What the hackathon shows today (its own cover or the category photo). */
  previewUrl: string;
  hasCustomCover: boolean;
}

/** Crop to 16:9 around the center and resize to exactly COVER_WIDTH × COVER_HEIGHT. */
async function processCover(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const problem = validateCoverSource(bitmap.width, bitmap.height);
  if (problem) {
    bitmap.close();
    throw new Error(problem);
  }
  const { sx, sy, sw, sh } = coverCropRect(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = COVER_WIDTH;
  canvas.height = COVER_HEIGHT;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Your browser couldn't process the image.");
  context.imageSmoothingQuality = "high";
  context.drawImage(bitmap, sx, sy, sw, sh, 0, 0, COVER_WIDTH, COVER_HEIGHT);
  bitmap.close();

  const encode = (type: string) =>
    new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, 0.85));
  // Safari can't encode WebP and silently returns PNG, so fall back to JPEG.
  const webp = await encode("image/webp");
  if (webp?.type === "image/webp") return webp;
  const jpeg = await encode("image/jpeg");
  if (!jpeg) throw new Error("Your browser couldn't process the image.");
  return jpeg;
}

export function CoverUploader({ eventId, previewUrl, hasCustomCover }: CoverUploaderProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState(previewUrl);
  const [custom, setCustom] = useState(hasCustomCover);
  const [busy, setBusy] = useState<"uploading" | "removing" | null>(null);
  const [error, setError] = useState<string | undefined>();

  async function upload(file: File) {
    setError(undefined);
    if (!COVER_SOURCE_TYPES.some((type) => type === file.type)) {
      setError("Choose a JPEG, PNG, or WebP image.");
      return;
    }
    if (file.size > COVER_SOURCE_MAX_BYTES) {
      setError("Choose an image under 10MB.");
      return;
    }

    setBusy("uploading");
    try {
      const blob = await processCover(file);
      const ticket = await requestCoverUploadAction({
        eventId,
        contentType: blob.type,
        sizeBytes: blob.size,
      });
      if (ticket.error || !ticket.uploadUrl || !ticket.key) {
        throw new Error(ticket.error ?? "We couldn't start the upload.");
      }
      const response = await fetch(ticket.uploadUrl, {
        // Local storage posts to our dev route; R2 takes a presigned PUT.
        method: ticket.mode === "local" ? "POST" : "PUT",
        headers: ticket.headers ?? { "Content-Type": blob.type },
        body: blob,
      });
      if (!response.ok) throw new Error("The upload didn't go through. Please try again.");

      const saved = await saveCoverAction({ eventId, key: ticket.key });
      if (saved.error || !saved.coverUrl)
        throw new Error(saved.error ?? "We couldn't save the cover.");
      setPreview(saved.coverUrl);
      setCustom(true);
      router.refresh();
    } catch (problem) {
      setError(
        problem instanceof Error ? problem.message : "Something went wrong. Please try again.",
      );
    } finally {
      setBusy(null);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function remove() {
    setError(undefined);
    setBusy("removing");
    const result = await removeCoverAction({ eventId });
    setBusy(null);
    if (result.error) {
      setError(result.error);
      return;
    }
    setCustom(false);
    router.refresh();
  }

  return (
    <Card>
      <CardTitle>Cover Image</CardTitle>
      <CardDescription>
        Shown on your hackathon card and page. Covers are {COVER_WIDTH} × {COVER_HEIGHT} px (16:9).
        Upload a JPEG, PNG, or WebP of at least {COVER_MIN_WIDTH} × {COVER_MIN_HEIGHT} px, up to
        10MB. We crop it to 16:9 around the center and resize it for you.
      </CardDescription>

      <div className="mt-4 overflow-hidden rounded-card bg-brand/10">
        {/* eslint-disable-next-line @next/next/no-img-element -- preview of a just uploaded or remote cover */}
        <img
          src={preview}
          alt="Current cover"
          width={COVER_WIDTH}
          height={COVER_HEIGHT}
          className="aspect-[16/9] w-full object-cover"
        />
      </div>
      {custom ? null : (
        <p className="mt-2 text-xs text-muted">
          No cover yet, so the hackathon uses a photo that matches its category.
        </p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={COVER_SOURCE_TYPES.join(",")}
        className="sr-only"
        aria-label="Choose a cover image"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void upload(file);
        }}
      />
      <FormError message={error} />
      <div className="mt-4 flex flex-wrap gap-3">
        <Button
          type="button"
          loading={busy === "uploading"}
          disabled={busy !== null}
          onClick={() => inputRef.current?.click()}
        >
          <ImagePlus aria-hidden className="size-4" />
          {custom ? "Replace Cover" : "Upload Cover"}
        </Button>
        {custom ? (
          <Button
            type="button"
            variant="secondary"
            loading={busy === "removing"}
            disabled={busy !== null}
            onClick={() => void remove()}
          >
            <Trash2 aria-hidden className="size-4" /> Remove Cover
          </Button>
        ) : null}
      </div>
    </Card>
  );
}
