import { registerMediaAsset } from "@/services/media/service";
import { requireUser } from "@/lib/auth/guards";

export const dynamic = "force-dynamic";

/**
 * DEV MODE media upload (storage port in local mode): receives the file
 * directly and registers the asset in one step. 404 whenever R2 is
 * configured (P4 — no dev paths in production).
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ key: string }> }
) {
  const storage = (await import("@/lib/ports/storage")).getStoragePort();
  if (storage.mode !== "local") {
    return new Response("Not Found", { status: 404 });
  }

  const { key } = await params;
  const user = await requireUser();

  const contentType = request.headers.get("content-type") ?? "application/octet-stream";
  const body = Buffer.from(await request.arrayBuffer());
  if (body.length === 0) {
    return Response.json({ error: "Empty upload." }, { status: 400 });
  }

  // The key embeds the event: events/<eventId>/<file>
  const eventId = key.split("/")[1];
  if (!eventId) {
    return Response.json({ error: "Malformed key." }, { status: 400 });
  }

  try {
    await storage.saveLocal(key, body);
    await registerMediaAsset({
      eventId,
      userId: user.id,
      key,
      kind: contentType.startsWith("video/") ? "VIDEO" : "PHOTO",
    });
    return Response.json({ ok: true, url: storage.publicUrlFor(key) });
  } catch (error) {
    console.error("[media:dev] upload failed", error);
    return Response.json({ error: "Upload failed." }, { status: 500 });
  }
}
