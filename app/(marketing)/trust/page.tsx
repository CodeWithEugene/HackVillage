import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { getChainPort } from "@/lib/ports/chain";
import { prisma } from "@/lib/db";
import { getEnv } from "@/lib/env";

export const metadata: Metadata = {
  title: "Trust — Public Ledger",
  description:
    "Every Prize Vault deposit and payout, attested on-chain. Verify that a hackathon's money was real before it went live.",
};

const TYPE_LABELS: Record<string, string> = {
  VAULT_CREATED: "Vault created",
  DEPOSIT_LOCKED: "Deposit locked — Prize Verified",
  INSTANT_PAYOUT: "Instant 50% payout",
  MILESTONE_PAYOUT: "Milestone payout",
  VAULT_REFUNDED: "Refund",
};

export default async function TrustPage() {
  const [chainMode, entries] = await Promise.all([
    getChainPort().mode,
    prisma.ledgerEntry.findMany({
      include: { event: { select: { title: true, slug: true, org: { select: { name: true } } } } },
      orderBy: { mirroredAt: "desc" },
      take: 50,
    }),
  ]);

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-16">
      <header className="mb-10 text-center">
        <h1 className="font-display text-3xl font-bold text-ink sm:text-4xl">
          The Public Ledger
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-muted">
          Radical transparency is the product: every prize deposit and payout on HackVillage is
          attested on-chain with its payment-provider reference. Don&apos;t trust — verify.
        </p>
        <div className="mt-4 flex items-center justify-center gap-2">
          <Badge variant={chainMode === "amoy" ? "success" : "warning"}>
            <ShieldCheck aria-hidden className="size-3.5" />
            {chainMode === "amoy" ? "Polygon Amoy testnet" : "Simulation mode"}
          </Badge>
        </div>
        {chainMode === "simulation" ? (
          <p className="mt-2 text-xs text-muted">
            This deployment has no chain configured — attestations below are locally simulated and
            clearly marked. Production connects the PrizeVault contract.
          </p>
        ) : null}
      </header>

      {entries.length === 0 ? (
        <EmptyState
          icon={ShieldCheck}
          title="The ledger starts with the first deposit"
          description="When an organizer funds a Prize Vault, the lock lands here — event, amount, payment reference, and chain transaction — for anyone to audit."
        />
      ) : (
        <ul className="space-y-3">
          {entries.map((entry) => {
            const polyscan = `${getEnv().POLYGONSCAN_URL.replace(/\/$/, "")}/tx/${entry.txHash}`;
            return (
              <li key={entry.id}>
                <Card className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-ink">{TYPE_LABELS[entry.type] ?? entry.type}</p>
                    <p className="mt-0.5 text-sm text-muted">
                      <Link href={`/events/${entry.event.slug}`} className="underline hover:text-ink">
                        {entry.event.title}
                      </Link>{" "}
                      · {entry.event.org.name}
                    </p>
                  </div>
                  <div className="text-right">
                    {typeof (entry.payload as Record<string, unknown>).amountKes === "number" ? (
                      <p className="font-display text-lg font-bold text-ink">
                        KES{" "}
                        {((entry.payload as Record<string, unknown>).amountKes as number).toLocaleString("en-KE")}
                      </p>
                    ) : null}
                    {chainMode === "amoy" ? (
                      <a
                        href={polyscan}
                        className="font-mono text-xs text-ink underline"
                        target="_blank"
                        rel="noreferrer"
                      >
                        {entry.txHash.slice(0, 20)}…
                      </a>
                    ) : (
                      <code className="font-mono text-xs text-muted">{entry.txHash.slice(0, 20)}…</code>
                    )}
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}

      <section className="mt-14 rounded-card bg-inverse p-8 text-on-inverse">
        <h2 className="font-display text-xl font-bold">How Verification Works</h2>
        <ol className="mt-4 space-y-3 text-sm leading-6 text-on-inverse/80">
          <li>
            <strong className="text-on-inverse">1.</strong> The organizer deposits 100% of the declared
            pool through our licensed payment provider. Only the pool portion enters the vault —
            platform fees never touch prize money.
          </li>
          <li>
            <strong className="text-on-inverse">2.</strong> The payment confirmation triggers an on-chain
            attestation. The vault <span className="text-brand">locks</span>, the event goes live,
            and the deposit lands here with its payment reference.
          </li>
          <li>
            <strong className="text-on-inverse">3.</strong> Winnings pay 50% instantly and 50% on
            milestones — each payout attested here too. Cross-check any entry against the
            transaction hash on a block explorer.
          </li>
        </ol>
      </section>
    </div>
  );
}
