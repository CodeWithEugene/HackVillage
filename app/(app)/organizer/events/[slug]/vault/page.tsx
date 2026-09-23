import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Lock } from "lucide-react";

import { FundVaultForm, KybRequestForm } from "@/components/escrow/vault-forms";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/guards";
import { getEnv } from "@/lib/env";
import { prisma } from "@/lib/db";
import { formatKes } from "@/lib/utils";

export const metadata: Metadata = { title: "Prize Vault" };

const CHAIN_LABELS: Record<string, string> = {
  AWAITING: "Awaiting deposit",
  LOCKED: "Locked — event live",
  HALF_RELEASED: "50% released",
  SETTLED: "Fully settled",
  REFUNDED: "Refunded",
};

export default async function VaultPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ deposit?: string }>;
}) {
  const [{ slug }, { deposit: depositNotice }, user] = await Promise.all([
    params,
    searchParams,
    requireUser(),
  ]);

  const event = await prisma.event.findFirst({
    where: { slug },
    include: {
      org: { include: { members: { where: { userId: user.id, status: "ACTIVE" } } } },
      prizes: { orderBy: { place: "asc" } },
      deposits: { orderBy: { createdAt: "desc" } },
      vault: true,
      ledgerEntries: { orderBy: { mirroredAt: "asc" } },
    },
  });
  if (!event) notFound();

  const membership = event.org.members[0];
  if (!membership || membership.role === "MEMBER") notFound();

  const declaredPool = event.prizes.reduce((sum, prize) => sum + prize.amountKes, 0);
  const succeededPool = event.deposits
    .filter((d) => d.status === "SUCCEEDED")
    .reduce((sum, d) => sum + d.poolAmountKes, 0);
  const remaining = Math.max(0, declaredPool - succeededPool);
  const grossDue = Math.round(remaining * (1 + getEnv().PLATFORM_FEE_BPS / 10_000));

  const kybVerified = event.org.kycStatus === "VERIFIED";
  const vaultLive = event.status === "LIVE";

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">Prize Vault</h1>
          <p className="mt-1 text-sm text-muted">
            {event.title} ·{" "}
            <Link href={`/organizer/events/${event.slug}`} className="underline hover:text-ink">
              command center
            </Link>
          </p>
        </div>
        <Badge variant={vaultLive ? "success" : "warning"}>
          {vaultLive ? "Event live — funds locked" : "Awaiting deposit"}
        </Badge>
      </header>

      {depositNotice === "success" ? (
        <p role="status" className="rounded-card border border-success/40 bg-success/10 p-4 text-sm font-semibold text-success">
          Deposit confirmed — the vault is locking and the event is going live.
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Declared pool</p>
          <p className="mt-1 font-display text-2xl font-bold text-ink">{formatKes(declaredPool)}</p>
          <p className="mt-1 text-xs text-muted">
            {event.prizes.length} prize {event.prizes.length === 1 ? "place" : "places"}
          </p>
        </Card>
        <Card>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Deposited (pool)</p>
          <p className="mt-1 font-display text-2xl font-bold text-ink">{formatKes(succeededPool)}</p>
          <p className="mt-1 text-xs text-muted">{formatKes(remaining)} remaining</p>
        </Card>
        <Card>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Vault state</p>
          <p className="mt-1 font-display text-lg font-bold text-ink">
            {event.vault ? CHAIN_LABELS[event.vault.chainState] : "—"}
          </p>
          <p className="mt-1 text-xs text-muted">
            {event.vault?.contractAddress ? "attested on-chain" : "attestation pending"}
          </p>
        </Card>
      </div>

      {!vaultLive && event.status === "PENDING_DEPOSIT" ? (
        <Card>
          <CardTitle className="flex items-center gap-2">
            <Lock aria-hidden className="size-5" /> Fund the vault to go live
          </CardTitle>
          <CardDescription>
            The deposit covers the remaining pool plus the platform fee. The event flips LIVE the
            moment the vault locks — and every deposit lands on the{" "}
            <Link href="/trust" className="underline hover:text-ink">
              public ledger
            </Link>
            .
          </CardDescription>

          <div className="mt-5">
            {kybVerified ? (
              <FundVaultForm
                eventId={event.id}
                grossDueKes={formatKes(grossDue)}
                disabled={
                  remaining <= 0
                    ? "The vault is fully funded — waiting for confirmation."
                    : undefined
                }
              />
            ) : (
              <KybRequestForm orgId={event.org.id} />
            )}
          </div>
        </Card>
      ) : null}

      {event.deposits.length > 0 ? (
        <Card>
          <CardTitle>Deposits</CardTitle>
          <table className="mt-3 w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-muted">
                <th className="pb-2">Reference</th>
                <th className="pb-2 text-right">Gross</th>
                <th className="pb-2 text-right">Pool</th>
                <th className="pb-2 text-right">Fee</th>
                <th className="pb-2 text-right">Status</th>
              </tr>
            </thead>
            <tbody>
              {event.deposits.map((d) => (
                <tr key={d.id} className="border-t border-ink/5">
                  <td className="py-2 font-mono text-xs">{d.paystackReference}</td>
                  <td className="py-2 text-right font-semibold">{formatKes(d.grossAmountKes)}</td>
                  <td className="py-2 text-right">{formatKes(d.poolAmountKes)}</td>
                  <td className="py-2 text-right text-muted">{formatKes(d.feeKes)}</td>
                  <td className="py-2 text-right">
                    <Badge
                      variant={
                        d.status === "SUCCEEDED" ? "success" : d.status === "INITIATED" ? "warning" : "neutral"
                      }
                    >
                      {d.status.toLowerCase()}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      ) : null}

      {event.ledgerEntries.length > 0 ? (
        <Card>
          <CardTitle>On-chain attestations</CardTitle>
          <ul className="mt-3 space-y-2 text-sm">
            {event.ledgerEntries.map((entry) => (
              <li key={entry.id} className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-semibold text-ink">
                  {entry.type === "VAULT_CREATED"
                    ? "Vault created"
                    : entry.type === "DEPOSIT_LOCKED"
                      ? "Deposit locked — Prize Verified"
                      : entry.type.replace(/_/g, " ").toLowerCase()}
                </span>
                <code className="font-mono text-xs text-muted">
                  {entry.txHash.slice(0, 18)}…
                </code>
              </li>
            ))}
          </ul>
          <CardDescription>
            Attestation detail lives on{" "}
            <Link href="/trust" className="underline hover:text-ink">
              /trust
            </Link>{" "}
            — the community can verify every entry against the payment provider&apos;s receipt.
          </CardDescription>
        </Card>
      ) : null}
    </div>
  );
}
