import { currentUser } from "@/lib/auth/guards";
import { authorizeCoverEdit, CoverError } from "@/lib/events/cover-service";
import { isCoverKeyFor, validateCoverUpload } from "@/lib/events/cover-upload";

export const dynamic = "force-dynamic";

/**
 * DEV MODE cover upload (storage port in local mode): receives the processed
 * cover and saves it under public/uploads. 404 in production and whenever R2
 * is configured, so there is no dev path in production.
 */
export async function POST(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return new Response("Not Found", { status: 404 });
  }
  const storage = (await import("@/lib/ports/storage")).getStoragePort();
  if (storage.mode !== "local") {
    return new Response("Not Found", { status: 404 });
  }

  const key = new URL(request.url).searchParams.get("key") ?? "";
  const eventId = key.split("/")[1] ?? "";
  if (!isCoverKeyFor(eventId, key)) {
    return Response.json({ error: "Malformed key." }, { status: 400 });
  }

  const contentType = request.headers.get("content-type") ?? "";
  const body = Buffer.from(await request.arrayBuffer());
  const problem = validateCoverUpload(contentType, body.length);
  if (problem) return Response.json({ error: problem }, { status: 400 });

  const user = await currentUser();
  if (!user) return Response.json({ error: "Sign in first." }, { status: 401 });

  try {
    // Only organization owners/admins of the target event may write its cover.
    await authorizeCoverEdit(user.id, eventId);
    // saveLocalAt joins under public/uploads and refuses escaping keys.
    const url = await storage.saveLocalAt(key, body);
    return Response.json({ ok: true, url });
  } catch (error) {
    if (error instanceof CoverError)
      return Response.json({ error: error.message }, { status: 403 });
    console.error("[covers:dev] upload failed", error);
    return Response.json({ error: "Upload failed." }, { status: 500 });
  }
}
