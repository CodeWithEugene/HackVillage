import { redirect } from "next/navigation";

import { prisma } from "@/lib/db";
import { getEnv } from "@/lib/env";
import { getPaystackPort } from "@/lib/ports/paystack";
import { recordChargeSuccess } from "@/services/escrow/deposits";

export const dynamic = "force-dynamic";

/**
 * DEV SIMULATION CHECKOUT — mirrors Paystack's hosted page when no
 * PAYSTACK_SECRET_KEY is configured, so the entire escrow flow is testable
 * locally and in CI. Hard-disabled whenever live keys exist or the process
 * runs in production (P4: no simulated money states in prod, ever).
 */
function simulationEnabled(): boolean {
  return (
    process.env.NODE_ENV !== "production" && getPaystackPort().mode === "simulation"
  );
}

function page(title: string, body: string): Response {
  return new Response(
    `<!doctype html><html lang="en"><head><meta charset="utf-8"/><title>${title}</title>
    <meta name="viewport" content="width=device-width,initial-scale=1"/>
    <style>
      body{font-family:-apple-system,system-ui,sans-serif;background:#fafbf7;color:#222;display:flex;min-height:100vh;align-items:center;justify-content:center;margin:0}
      .card{background:#fff;border:1px solid #e5e5e0;border-radius:12px;max-width:420px;width:100%;padding:32px;text-align:center}
      .brand{font-weight:800;font-size:20px;margin-bottom:16px}
      .sim{background:#ffed00;display:inline-block;padding:4px 12px;border-radius:999px;font-size:12px;font-weight:700}
      .amount{font-size:36px;font-weight:800;margin:12px 0}
      form{margin-top:24px}button{font:inherit;border:0;border-radius:8px;padding:12px 28px;font-weight:700;cursor:pointer;width:100%}
      .pay{background:#0ba4db;color:#fff}.cancel{background:transparent;color:#6b6b6b;text-decoration:underline;font-weight:400;margin-top:8px}
    </style></head><body><div class="card">${body}</div></body></html>`,
    { headers: { "content-type": "text/html; charset=utf-8" } }
  );
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ reference: string }> }
): Promise<Response> {
  if (!simulationEnabled()) return new Response("Not Found", { status: 404 });
  const { reference } = await params;

  const deposit = await prisma.deposit.findUnique({
    where: { paystackReference: reference },
    include: { event: { select: { title: true } } },
  });
  if (!deposit || deposit.status !== "INITIATED") {
    return page("Checkout unavailable", `<p>This checkout session is no longer active.</p>`);
  }

  return page(
    "Simulated checkout",
    `
    <p class="brand">Paystack <span class="sim">SIMULATION</span></p>
    <p>${deposit.event.title} — Prize Vault deposit</p>
    <p class="amount">KES ${deposit.grossAmountKes.toLocaleString("en-KE")}</p>
    <p style="font-size:13px;color:#6b6b6b">pool KES ${deposit.poolAmountKes.toLocaleString("en-KE")} + platform fee KES ${deposit.feeKes.toLocaleString("en-KE")}<br/>ref <code>${deposit.paystackReference}</code></p>
    <form method="post">
      <button class="pay" type="submit">Complete simulated payment</button>
    </form>
    <a class="cancel" href="${getEnv().NEXT_PUBLIC_APP_URL.replace(/\/$/, "")}/organizer/events/${deposit.eventId}/vault">Cancel and go back</a>
    `
  );
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ reference: string }> }
): Promise<Response> {
  if (!simulationEnabled()) return new Response("Not Found", { status: 404 });
  const { reference } = await params;

  const outcome = await recordChargeSuccess({
    reference,
    channel: "simulation",
    raw: { event: "charge.success", data: { reference, channel: "simulation" }, simulated: true },
  });

  const deposit = await prisma.deposit.findUnique({
    where: { paystackReference: reference },
    include: { event: { select: { slug: true } } },
  });

  if (deposit && outcome.outcome !== "unknown-reference") {
    redirect(`${getEnv().NEXT_PUBLIC_APP_URL.replace(/\/$/, "")}/organizer/events/${deposit.eventId}/vault?deposit=success`);
  }

  return page("Simulated payment", `<p class="brand">Paystack <span class="sim">SIMULATION</span></p><p>Payment recorded — you can close this page.</p>`);
}
