"use client";

import { useActionState, useRef, useState } from "react";
import { Image as ImageIcon, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { FormError } from "@/components/ui/input";
import { requestUploadUrlAction, type MediaActionState } from "@/services/media/actions";

/**
 * The media vault uploader: requests the upload target, PUTs the file (or
 * POSTs to the dev route locally), then refreshes. Simple, no chunking —
 * files are capped at 15MB by the port.
 */
export function MediaUploader({ eventId }: { eventId: string }) {
  const [state, action, pending] = useActionState<MediaActionState, FormData>(
    requestUploadUrlAction,
    {}
  );
  const [uploading, setUploading] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  async function handleFile(formData: FormData, file: File) {
    formData.set("filename", file.name);
    formData.set("contentType", file.type);
    formData.set("sizeBytes", String(file.size));

    const targetState = await requestUploadUrlAction({}, formData);
    if (targetState.error) return;
    if (!targetState.uploadUrl) return;

    setUploading(file.name);
    try {
      if (targetState.message === "dev-upload") {
        // Dev mode: POST the raw file to our route.
        await fetch(targetState.uploadUrl, {
          method: "POST",
          headers: { "Content-Type": file.type },
          body: file,
        });
      } else {
        // R2 mode: PUT directly with the presigned headers.
        await fetch(targetState.uploadUrl, {
          method: "PUT",
          headers: targetState.uploadHeaders ?? { "Content-Type": file.type },
          body: file,
        });
      }
      // Registration for R2 mode happened in the action; dev mode registers
      // in the route. Either way, reload to show the gallery.
      window.location.reload();
    } catch (error) {
      console.error("[media] upload failed", error);
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
        <FormError message={state.error} />
        <Button type="submit" className="mt-4" loading={pending || uploading != null}>
          Upload To The Vault
        </Button>
      </form>
    </Card>
  );
}
