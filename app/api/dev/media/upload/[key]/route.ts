import { currentUser } from "@/lib/auth/guards";
import { validateMediaUpload } from "@/lib/ports/storage";
import { MediaError, requireOrgAdmin } from "@/services/media/service";

export const dynamic = "force-dynamic";

/** keys are issued as events/<eventId>/<digest>-<safeName> — anything else is rejected. */
const MEDIA_KEY_PATTERN = /^events\/([a-z0-9]+)\/[a-zA-Z0-9._-]+$/;

/**
 * DEV MODE media upload (storage port in local mode): receives the file and
 * saves it under public/uploads. The MediaAsset row is NOT created here —
 * the client confirms via confirmMediaUploadAction, identical to the R2
 * flow. 404 in production and whenever R2 is configured (P4 — no dev paths
 * in production).
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ key: string }> }
) {
  if (process.env.NODE_ENV === "production") {
    return new Response("Not Found", { status: 404 });
  }
  const storage = (await import("@/lib/ports/storage")).getStoragePort();
  if (storage.mode !== "local") {
    return new Response("Not Found", { status: 404 });
  }

  // Key shape first — traversal attempts get a cheap 400 before any auth or IO.
  const { key } = await params;
  const match = MEDIA_KEY_PATTERN.exec(key);
  if (!match || key.includes("..")) {
    return Response.json({ error: "Malformed key." }, { status: 400 });
  }
  const eventId = match[1];

  const contentType = request.headers.get("content-type") ?? "application/octet-stream";
  const body = Buffer.from(await request.arrayBuffer());
  const problem = validateMediaUpload(contentType, body.length);
  if (problem) return Response.json({ error: problem }, { status: 400 });

  const user = await currentUser();
  if (!user) return Response.json({ error: "Sign in first." }, { status: 401 });

  try {
    // Only organization owners/admins of the target event may write its files.
    await requireOrgAdmin(eventId, user.id);
    // saveLocalAt joins under public/uploads and refuses escaping keys.
    const url = await storage.saveLocalAt(key, body);
    return Response.json({ ok: true, url });
  } catch (error) {
    if (error instanceof MediaError) {
      return Response.json({ error: error.message }, { status: 403 });
    }
    console.error("[media:dev] upload failed", error);
    return Response.json({ error: "Upload failed." }, { status: 500 });
  }
}
