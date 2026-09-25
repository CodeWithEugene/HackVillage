import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { verifyNewsletterUnsubscribeToken } from "@/lib/newsletter/unsubscribe-token";

/**
 * RFC 8058 one click unsubscribe for the public newsletter: mail clients
 * (Gmail, Yahoo) POST here directly from their own Unsubscribe control, with
 * no page load and no confirmation step, mirroring app/api/unsubscribe.
 */
export async function POST(request: Request): Promise<Response> {
  const token = new URL(request.url).searchParams.get("token");
  const subscriberId = token ? verifyNewsletterUnsubscribeToken(token) : null;
  if (!subscriberId) return NextResponse.json({ ok: false }, { status: 400 });

  try {
    await prisma.newsletterSubscriber.update({
      where: { id: subscriberId },
      data: { unsubscribedAt: new Date() },
    });
  } catch {
    // Already gone — the outcome the caller wants either way.
  }

  return NextResponse.json({ ok: true });
}
