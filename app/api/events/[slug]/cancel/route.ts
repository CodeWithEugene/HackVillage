import { NextResponse } from "next/server";

import { currentUser } from "@/lib/auth/guards";
import { cancelRegistrationAction } from "@/lib/events/registration-actions";
import { rateLimit } from "@/lib/rate-limit";

/**
 * Authenticated callers are throttled (30 mutations/hour shared across the
 * mutation routes); unauthenticated requests fall through to the action,
 * which keeps its existing redirect-to-sign-in behavior.
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
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
  await cancelRegistrationAction(slug);
  return NextResponse.redirect(new URL("/dashboard/hackathons", _request.url), 303);
}
