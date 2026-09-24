import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { verifyUnsubscribeToken } from "@/lib/notifications/unsubscribe";

/**
 * RFC 8058 one click unsubscribe: mail clients (Gmail, Yahoo) POST here
 * directly, with no page load and no confirmation step, whenever a person
 * uses the client's own Unsubscribe control. The click already happened in
 * the client's UI, so this applies immediately.
 */
export async function POST(request: Request): Promise<Response> {
  const token = new URL(request.url).searchParams.get("token");
  const payload = token ? verifyUnsubscribeToken(token) : null;
  if (!payload) return NextResponse.json({ ok: false }, { status: 400 });

  await prisma.notificationPreference.upsert({
    where: { userId: payload.userId },
    create: { userId: payload.userId, [payload.category]: false },
    update: { [payload.category]: false },
  });

  return NextResponse.json({ ok: true });
}
