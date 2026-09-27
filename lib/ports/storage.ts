import { createHash } from "node:crypto";
import { access, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { getEnv } from "@/lib/env";

/**
 * Storage port (ADR-009): R2/S3-compatible in production, a local directory
 * in development. The ONLY module that touches object storage — presigned
 * PUTs in prod, direct server-side saves in dev (the dev uploader posts the
 * file to our own route).
 */

export interface UploadTarget {
  uploadUrl: string;
  /** Headers the client must send with the PUT (prod only). */
  headers: Record<string, string>;
  /** Where the asset will be publicly readable once uploaded. */
  publicUrl: string;
  key: string;
}

export interface StoragePort {
  mode: "r2" | "local";
  /** Presign (prod) or return a local upload endpoint (dev). */
  createUploadTarget(input: {
    eventId: string;
    filename: string;
    contentType: string;
    sizeBytes: number;
  }): Promise<UploadTarget>;
  publicUrlFor(key: string): string;
  /**
   * Upload target at an exact key (covers). Local mode points the browser at
   * `devUploadPath`, a dev-only route that calls saveLocalAt.
   */
  createUploadTargetForKey(input: {
    key: string;
    contentType: string;
    devUploadPath: string;
  }): Promise<UploadTarget>;
  /** Dev mode: persist a keyed upload under public/uploads. Throws in R2 mode. */
  saveLocalAt(key: string, body: Buffer): Promise<string>;
  /** Public URL for a keyed upload. */
  urlForKey(key: string): string;
  /**
   * Did the upload actually land? R2: HEAD the public URL. Local: the file
   * exists under public/uploads. Confirms gate on this — no phantom rows.
   */
  verifyUploaded(key: string): Promise<boolean>;
}

const MAX_BYTES = 15 * 1024 * 1024; // 15MB per asset (photos/short clips)
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "video/mp4"]);

export function validateMediaUpload(contentType: string, sizeBytes: number): string | null {
  if (!ALLOWED_TYPES.has(contentType)) {
    return "Photos (JPEG, PNG, WebP) and videos (MP4) only.";
  }
  if (sizeBytes > MAX_BYTES) {
    return `Files must be under 15MB (got ${(sizeBytes / 1024 / 1024).toFixed(1)}MB).`;
  }
  return null;
}

function keyFor(eventId: string, filename: string): string {
  const digest = createHash("sha256").update(`${eventId}:${filename}`).digest("hex").slice(0, 16);
  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-60);
  return `events/${eventId}/${digest}-${safeName}`;
}

/** Absolute path under public/uploads — the traversal guard every write goes through. */
function localTargetFor(key: string): string {
  const root = path.join(process.cwd(), "public", "uploads");
  const target = path.join(root, key);
  if (!target.startsWith(root + path.sep)) {
    throw new Error("Storage key escapes the uploads folder.");
  }
  return target;
}

class LocalStorage implements StoragePort {
  mode = "local" as const;

  async createUploadTarget(input: {
    eventId: string;
    filename: string;
    contentType: string;
    sizeBytes: number;
  }): Promise<UploadTarget> {
    const key = keyFor(input.eventId, input.filename);
    const base = getEnv().NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
    return {
      uploadUrl: `${base}/api/dev/media/upload/${encodeURIComponent(key)}`,
      headers: { "Content-Type": input.contentType },
      publicUrl: this.publicUrlFor(key),
      key,
    };
  }

  publicUrlFor(key: string): string {
    return `/uploads/${key}`;
  }

  async createUploadTargetForKey(input: {
    key: string;
    contentType: string;
    devUploadPath: string;
  }): Promise<UploadTarget> {
    const base = getEnv().NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
    return {
      uploadUrl: `${base}${input.devUploadPath}?key=${encodeURIComponent(input.key)}`,
      headers: { "Content-Type": input.contentType },
      publicUrl: this.urlForKey(input.key),
      key: input.key,
    };
  }

  async saveLocalAt(key: string, body: Buffer): Promise<string> {
    const target = localTargetFor(key);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, body);
    return this.urlForKey(key);
  }

  urlForKey(key: string): string {
    return `/uploads/${key}`;
  }

  async verifyUploaded(key: string): Promise<boolean> {
    try {
      await access(localTargetFor(key));
      return true;
    } catch {
      return false;
    }
  }
}

class R2Storage implements StoragePort {
  mode = "r2" as const;

  constructor(
    private config: {
      accountId: string;
      accessKeyId: string;
      secretAccessKey: string;
      bucket: string;
      publicBase: string;
    },
  ) {}

  async createUploadTarget(input: {
    eventId: string;
    filename: string;
    contentType: string;
    sizeBytes: number;
  }): Promise<UploadTarget> {
    const key = keyFor(input.eventId, input.filename);

    // Presigned PUT via SigV4 (avoids the AWS SDK dependency for one call).
    const { createPresignedUrl } = await import("@/lib/ports/r2-sign");
    const { url, headers } = await createPresignedUrl({
      ...this.config,
      key,
      contentType: input.contentType,
      expiresIn: 900,
    });

    return {
      uploadUrl: url,
      headers,
      publicUrl: `${this.config.publicBase}/${key}`,
      key,
    };
  }

  publicUrlFor(key: string): string {
    return `${this.config.publicBase}/${key}`;
  }

  async createUploadTargetForKey(input: {
    key: string;
    contentType: string;
    devUploadPath: string;
  }): Promise<UploadTarget> {
    const { createPresignedUrl } = await import("@/lib/ports/r2-sign");
    const { url, headers } = await createPresignedUrl({
      ...this.config,
      key: input.key,
      contentType: input.contentType,
      expiresIn: 900,
    });
    return { uploadUrl: url, headers, publicUrl: this.urlForKey(input.key), key: input.key };
  }

  async saveLocalAt(): Promise<string> {
    throw new Error("R2Storage cannot save locally.");
  }

  urlForKey(key: string): string {
    return `${this.config.publicBase}/${key}`;
  }

  async verifyUploaded(key: string): Promise<boolean> {
    try {
      const response = await fetch(this.urlForKey(key), { method: "HEAD" });
      return response.ok;
    } catch {
      return false;
    }
  }
}

let cached: StoragePort | null = null;

export function getStoragePort(): StoragePort {
  if (cached) return cached;
  const env = process.env;
  if (env.R2_ACCOUNT_ID && env.R2_ACCESS_KEY_ID && env.R2_SECRET_ACCESS_KEY && env.R2_BUCKET) {
    const publicBase =
      env.R2_PUBLIC_BASE ?? `https://pub-${env.R2_ACCOUNT_ID}.r2.dev/${env.R2_BUCKET}`;
    cached = new R2Storage({
      accountId: env.R2_ACCOUNT_ID,
      accessKeyId: env.R2_ACCESS_KEY_ID,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY,
      bucket: env.R2_BUCKET,
      publicBase,
    });
  } else {
    console.warn("[storage] R2 env not set — media saves to public/uploads (dev mode).");
    cached = new LocalStorage();
  }
  return cached;
}

/** Test helper — re-resolve the port after env changes. */
export function resetStoragePortForTests(): void {
  cached = null;
}
