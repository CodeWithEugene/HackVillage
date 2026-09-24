import { NextResponse } from "next/server";

import { cancelRegistrationAction } from "@/lib/events/registration-actions";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  await cancelRegistrationAction(slug);
  return NextResponse.redirect(new URL("/dashboard/events", _request.url), 303);
}
