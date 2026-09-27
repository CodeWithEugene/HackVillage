"use client";

import { useActionState, useRef, useState } from "react";
import { Image as ImageIcon, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { FormError } from "@/components/ui/input";
import {
  confirmMediaUploadAction,
  requestUploadUrlAction,
  type MediaActionState,
} from "@/services/media/actions";

/**
 * The media vault uploader: requests the upload target, PUTs the file (or
 * POSTs to the dev route locally), then CONFIRMS the upload — the MediaAsset
 * row only exists once the file is verifiably in storage. Simple, no
 * chunking — files are capped at 15MB by the port.
 */
export function MediaUploader({ eventId }: { eventId: string }) {
  const [state, action, pending] = useActionState<MediaActionState, FormData>(
    requestUploadUrlAction,
    {}
  );
  const [uploading, setUploading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  async function handleFile(formData: FormData, file: File) {
    setError(null);
    formData.set("filename", file.name);
    formData.set("contentType", file.type);
    formData.set("sizeBytes", String(file.size));

    const targetState = await requestUploadUrlAction({}, formData);
    if (targetState.error || !targetState.uploadUrl || !targetState.key) {
      // Was previously swallowed — the uploader failed silently.
      setError(targetState.error ?? "We couldn't prepare the upload. Try again.");
      return;
    }

    setUploading(file.name);
    try {
      const response = await fetch(targetState.uploadUrl, {
        method: targetState.uploadUrl.includes("/api/dev/media/upload/") ? "POST" : "PUT",
        headers: targetState.uploadHeaders ?? { "Content-Type": file.type },
        body: file,
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        setError(body?.error ?? "The upload didn't complete. Try again.");
        return;
      }

      // The row is created only now, after the file verifiably landed.
      const confirmed = await confirmMediaUploadAction({
        eventId,
        key: targetState.key,
        kind: file.type.startsWith("video/") ? "VIDEO" : "PHOTO",
        caption: String(formData.get("caption") ?? "") || undefined,
      });
      if (confirmed.error) {
        setError(confirmed.error);
        return;
      }

      window.location.reload();
    } catch (uploadError) {
      // Was previously a console.error only — the UI gave no signal.
      console.error("[media] upload failed", uploadError);
      setError("The upload didn't complete. Check your connection and try again.");
    } finally {
      setUploading(null);
    }
  }

  return (
    <Card>
      <CardTitle className="flex items-center gap-2">
        <Upload aria-hidden className="size-5" /> Upload Hackathon Media
      </CardTitle>
      <CardDescription>
        High-resolution photos and clips: the gallery developers and the community see.
        JPEG/PNG/WebP up to 15MB per file, MP4 for clips.
      </CardDescription>

      <form
        ref={formRef}
        action={action}
        className="mt-4"
        onSubmit={(event) => {
          event.preventDefault();
          const fileInput = event.currentTarget.elements.namedItem("file") as HTMLInputElement;
          const file = fileInput?.files?.[0];
          if (!file) return;
          const formData = new FormData(event.currentTarget);
          void handleFile(formData, file);
        }}
      >
        <input type="hidden" name="eventId" value={eventId} />
        <label
          htmlFor="media-file"
          className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-card border-2 border-dashed border-ink/20 bg-paper px-6 py-10 text-center hover:border-ink/40"
        >
          <ImageIcon aria-hidden className="size-8 text-muted" />
          <span className="text-sm font-semibold text-ink">
            {uploading ? `Uploading ${uploading}…` : "Click to choose a file"}
          </span>
          <span className="text-xs text-muted">or drag it here</span>
          <input
            id="media-file"
            name="file"
            type="file"
            accept="image/jpeg,image/png,image/webp,video/mp4"
            className="sr-only"
            required
          />
        </label>
        <FormError message={error ?? state.error} />
        <Button type="submit" className="mt-4" loading={pending || uploading != null}>
          Upload To The Vault
        </Button>
      </form>
    </Card>
  );
}
