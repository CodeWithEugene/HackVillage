import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { getChainPort } from "@/lib/ports/chain";
import { getPaystackPort } from "@/lib/ports/paystack";

/**
 * Liveness/readiness probe (no auth — uptime monitors and load balancers
 * poll it). Reports component status only: no versions, hosts, or secret
 * presence beyond the already-public port modes. 200 when the app can serve
 * real traffic (database reachable, queue schema present, payment and chain
 * ports resolvable), 503 otherwise.
 */
export const dynamic = "force-dynamic";

interface ComponentHealth {
  ok: boolean;
  db: "ok" | "down";
  queue: "ok" | "down";
  paystackMode: string;
  chainMode: string;
  uptime: number;
}

async function databaseOk(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}

/** pg-boss creates its schema on first start; without it no job will run. */
async function queueOk(): Promise<boolean> {
  try {
    // ::text — Prisma cannot deserialize the regclass type from to_regclass.
    const rows = await prisma.$queryRaw<Array<{ name: string | null }>>`
      SELECT to_regclass('pgboss.job')::text AS name
    `;
    return rows[0]?.name != null;
  } catch {
    return false;
  }
}

function portMode(read: () => string): string {
  try {
    return read();
  } catch {
    return "unknown";
  }
}

export async function GET(): Promise<NextResponse<ComponentHealth>> {
  const [db, queue] = await Promise.all([databaseOk(), queueOk()]);

  // Port getters never reach the network (simulation fallbacks are in-process).
  // A getter that throws (e.g. no Paystack key in production) means every
  // deposit and payout would fail, so the app is not healthy.
  const paystackMode = portMode(() => getPaystackPort().mode);
  const chainMode = portMode(() => getChainPort().mode);

  const ok = db && queue && paystackMode !== "unknown" && chainMode !== "unknown";
  const body: ComponentHealth = {
    ok,
    db: db ? "ok" : "down",
    queue: queue ? "ok" : "down",
    paystackMode,
    chainMode,
    uptime: Math.floor(process.uptime()),
  };
  return NextResponse.json(body, { status: ok ? 200 : 503 });
}
