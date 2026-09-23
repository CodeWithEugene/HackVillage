import { processPaystackWebhook } from "@/services/escrow/webhook";

export const dynamic = "force-dynamic";

/**
 * Paystack webhook endpoint (plan §10.3 STEP 4). Always reads the RAW body —
 * HMAC verification must see the exact bytes. Responds 200 on accepted/dupes
 * (replay-safe); non-200s make Paystack retry, which is safe by design (P3).
 */
export async function POST(request: Request): Promise<Response> {
  const rawBody = await request.text();
  const signature = request.headers.get("x-paystack-signature");

  try {
    const result = await processPaystackWebhook(rawBody, signature);
    if (!result.ok) {
      return Response.json({ received: false, reason: result.reason }, { status: result.status });
    }
    return Response.json({ received: true });
  } catch (error) {
    console.error("[webhook] unexpected processing failure", error);
    // 500 → Paystack re-delivers; the replay guard makes retries safe.
    return Response.json({ received: false }, { status: 500 });
  }
}
