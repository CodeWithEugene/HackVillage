import { NextResponse } from "next/server";

import { registerForEventAction } from "@/lib/events/registration-actions";

/**
 * Plain-form-friendly registration endpoint (P6: no client JS required).
 * The server action owns the logic; this handler only exists because HTML
 * forms cannot invoke server actions with dynamic arguments.
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  await registerForEventAction(slug);
  return NextResponse.redirect(new URL(`/hackathons/${slug}/workspace`, _request.url), 303);
}
