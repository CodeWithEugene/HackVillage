import { NextResponse } from "next/server";

import { currentUser } from "@/lib/auth/guards";
import { rateLimit } from "@/lib/rate-limit";
import { respondToJudgeInviteAction } from "@/services/judging/actions";

/**
 * Plain-form judge invite responses (no client JS required — P6).
 * Authenticated callers are throttled (30 mutations/hour shared across the
 * mutation routes); unauthenticated requests fall through to the action,
 * which keeps its existing redirect-to-sign-in behavior.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ assignmentId: string }> }
) {
  const { assignmentId } = await params;
  const form = await request.formData();
  const decision = String(form.get("decision") ?? "");
  if (decision !== "accept" && decision !== "decline") {
    return NextResponse.redirect(new URL("/judge", request.url), 303);
  }
  const user = await currentUser();
  if (user) {
    const limit = await rateLimit(`mutate:${user.id}`, 30, 60 * 60 * 1000);
    if (!limit.ok) {
      return NextResponse.json(
        { error: "Too many attempts. Try again later." },
        { status: 429, headers: { "retry-after": String(limit.retryAfterSeconds) } }
      );
    }
  }
  await respondToJudgeInviteAction(assignmentId, decision === "accept");
  return NextResponse.redirect(new URL("/judge", request.url), 303);
}
