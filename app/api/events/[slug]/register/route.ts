import { NextResponse } from "next/server";

import { currentUser } from "@/lib/auth/guards";
import { registerForEventAction } from "@/lib/events/registration-actions";
import { rateLimit } from "@/lib/rate-limit";

/**
 * Plain-form-friendly registration endpoint (P6: no client JS required).
 * The server action owns the logic; this handler only exists because HTML
 * forms cannot invoke server actions with dynamic arguments.
 *
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
    const limit = await rateLimit(`register:${user.id}`, 30, 60 * 60 * 1000);
    if (!limit.ok) {
      return NextResponse.json(
        { error: "Too many attempts. Try again later." },
        { status: 429, headers: { "retry-after": String(limit.retryAfterSeconds) } }
      );
    }
  }
  await registerForEventAction(slug);
  return NextResponse.redirect(new URL(`/hackathons/${slug}/workspace`, _request.url), 303);
}
