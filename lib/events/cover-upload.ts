/**
 * Hackathon cover images. The organizer's browser crops the photo they pick
 * to 16:9 around its center and resizes it to exactly COVER_WIDTH ×
 * COVER_HEIGHT WebP before uploading, so every card and page gets the same
 * frame. Pure rules only: safe to import on the client and the server.
 */

export const COVER_WIDTH = 1600;
export const COVER_HEIGHT = 900;
/** Below this the 1600x900 output would be upscaled and look soft. */
export const COVER_MIN_WIDTH = 1200;
export const COVER_MIN_HEIGHT = 675;
/** The photo the organizer picks, before we crop and compress it. */
export const COVER_SOURCE_MAX_BYTES = 10 * 1024 * 1024;
export const COVER_SOURCE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

const ASPECT = COVER_WIDTH / COVER_HEIGHT;

export interface CropRect {
  sx: number;
  sy: number;
  sw: number;
  sh: number;
}

/** The largest centered 16:9 rectangle inside a width × height image. */
export function coverCropRect(width: number, height: number): CropRect {
  if (width / height > ASPECT) {
    const sw = Math.round(height * ASPECT);
    return { sx: Math.round((width - sw) / 2), sy: 0, sw, sh: height };
  }
  const sh = Math.round(width / ASPECT);
  return { sx: 0, sy: Math.round((height - sh) / 2), sw: width, sh };
}

/** Is the picked photo big enough to fill the cover once cropped? */
export function validateCoverSource(width: number, height: number): string | null {
  const { sw, sh } = coverCropRect(width, height);
  if (sw < COVER_MIN_WIDTH || sh < COVER_MIN_HEIGHT) {
    return `Choose a photo at least ${COVER_MIN_WIDTH} × ${COVER_MIN_HEIGHT} px (this one gives ${sw} × ${sh} once cropped to 16:9).`;
  }
  return null;
}

export function validateCoverUpload(contentType: string, sizeBytes: number): string | null {
  if (!COVER_SOURCE_TYPES.some((type) => type === contentType)) {
    return "Covers must be JPEG, PNG, or WebP images.";
  }
  if (sizeBytes <= 0 || sizeBytes > COVER_SOURCE_MAX_BYTES) {
    return "Covers must be under 10MB.";
  }
  return null;
}

function randomHex(bytes: number): string {
  const values = new Uint8Array(bytes);
  globalThis.crypto.getRandomValues(values);
  return Array.from(values, (value) => value.toString(16).padStart(2, "0")).join("");
}

const EXTENSIONS: Record<(typeof COVER_SOURCE_TYPES)[number], string> = {
  "image/webp": "webp",
  "image/jpeg": "jpg",
  "image/png": "png",
};

/**
 * A fresh storage key per upload, so a new cover never serves a cached old
 * one. The extension follows the real format: browsers that can't encode WebP
 * (Safari) send JPEG instead.
 */
export function coverKey(eventId: string, contentType: string): string {
  const extension = EXTENSIONS[contentType as keyof typeof EXTENSIONS] ?? "webp";
  return `covers/${eventId}/${randomHex(8)}.${extension}`;
}

/** Only keys we could have issued for this hackathon: no other events, no path tricks. */
export function isCoverKeyFor(eventId: string, key: string): boolean {
  const escaped = eventId.replace(/[^a-zA-Z0-9_-]/g, "");
  if (escaped !== eventId) return false;
  return new RegExp(`^covers/${escaped}/[a-f0-9]{16}\\.(webp|jpg|png)$`).test(key);
}
