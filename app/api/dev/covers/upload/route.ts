import { requireUser } from "@/lib/auth/guards";
import { authorizeCoverEdit, CoverError } from "@/lib/events/cover-service";
import { isCoverKeyFor, validateCoverUpload } from "@/lib/events/cover-upload";

export const dynamic = "force-dynamic";

/**
 * DEV MODE cover upload (storage port in local mode): receives the processed
 * cover and saves it under public/uploads. 404 whenever R2 is configured, so
 * there is no dev path in production.
 */
export async function POST(request: Request) {
  const storage = (await import("@/lib/ports/storage")).getStoragePort();
  if (storage.mode !== "local") {
    return new Response("Not Found", { status: 404 });
  }

  const user = await requireUser();
  const key = new URL(request.url).searchParams.get("key") ?? "";
  const eventId = key.split("/")[1] ?? "";
  if (!isCoverKeyFor(eventId, key)) {
    return Response.json({ error: "Malformed key." }, { status: 400 });
  }

  const contentType = request.headers.get("content-type") ?? "";
  const body = Buffer.from(await request.arrayBuffer());
  const problem = validateCoverUpload(contentType, body.length);
  if (problem) return Response.json({ error: problem }, { status: 400 });

  try {
    await authorizeCoverEdit(user.id, eventId);
    const url = await storage.saveLocalAt(key, body);
    return Response.json({ ok: true, url });
  } catch (error) {
    if (error instanceof CoverError)
      return Response.json({ error: error.message }, { status: 403 });
    console.error("[covers:dev] upload failed", error);
    return Response.json({ error: "Upload failed." }, { status: 500 });
  }
}
