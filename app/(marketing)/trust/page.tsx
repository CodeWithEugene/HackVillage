import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink, ScrollText, ShieldCheck } from "lucide-react";
import type { Prisma, VaultChainState } from "@prisma/client";

import { PageHero } from "@/components/patterns/page-hero";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { prisma } from "@/lib/db";
import { getEnv } from "@/lib/env";
import { getChainPort } from "@/lib/ports/chain";
import { pageOpenGraph } from "@/lib/seo/metadata";
import { formatKes } from "@/lib/utils";

import { LEDGER_TYPE_LABELS, payloadAmountKes, payloadReference, shortenHash } from "./ledger";

export const metadata: Metadata = {
  title: "The Public Ledger: Every Prize Lock And Payout, Verifiable",
  description:
    "Every hackathon prize pool locked, paid out or refunded on HackVillage is recorded on a public ledger. Verify each entry yourself — radical transparency is the product.",
  alternates: { canonical: "/trust" },
  openGraph: pageOpenGraph("/trust"),
};

const VAULT_STATE_LABELS: Record<VaultChainState, string> = {
  AWAITING: "Awaiting deposit",
  LOCKED: "Locked in escrow",
  HALF_RELEASED: "50% paid out",
  SETTLED: "Fully settled",
  REFUNDED: "Refunded",
};

const timestampFormat = new Intl.DateTimeFormat("en-KE", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "Africa/Nairobi",
});

interface PageProps {
  searchParams: Promise<{ event?: string }>;
}

export default async function TrustPage({ searchParams }: PageProps) {
  const { event: eventFilter } = await searchParams;
  const chainMode = getChainPort().mode;
  const polygonscanUrl = getEnv().POLYGONSCAN_URL;
  const onChain = chainMode !== "simulation";

  const eventWhere: Prisma.EventWhereInput | undefined = eventFilter
    ? { slug: eventFilter }
    : undefined;

  const [entries, vaults, filterEvents] = await Promise.all([
    prisma.ledgerEntry.findMany({
      where: eventWhere ? { event: eventWhere } : undefined,
      include: { event: { select: { title: true, slug: true } } },
      orderBy: { mirroredAt: "desc" },
      take: 100,
    }),
    prisma.vaultState.findMany({
      where: eventWhere ? { event: eventWhere } : undefined,
      include: { event: { select: { title: true, slug: true } } },
      orderBy: { updatedAt: "desc" },
    }),
    // Filter chips always list every event that has a ledger, so switching
    // away from the current filter is one click.
    prisma.event.findMany({
      where: { ledgerEntries: { some: {} } },
      select: { slug: true, title: true },
      orderBy: { startsAt: "desc" },
    }),
  ]);

  return (
    <div className="lp">
      <PageHero
        title="The Public Ledger"
        lead="Every prize pool locked, payout sent and vault refunded is recorded here, entry by entry. Trust on HackVillage is not a promise; it is a record you can check."
      >
        {!onChain ? (
          <Card
            className="mt-8 max-w-3xl border-warning/40 bg-warning/10 shadow-none"
            role="note"
            aria-label="Simulation mode notice"
          >
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldCheck aria-hidden className="size-5" /> Simulation Mode
            </CardTitle>
            <CardDescription className="text-ink-soft">
              The ledger is running in simulation mode while we complete go-live. Entries are
              application-verified and recorded in order; on-chain anchoring is pending, so
              transaction references are not yet verifiable on a block explorer.
            </CardDescription>
          </Card>
        ) : null}
      </PageHero>

      {vaults.length > 0 ? (
        <section aria-labelledby="vaults-heading" className="lp-section">
          <div className="lp-frame lp-block lp-divided">
            <h2 id="vaults-heading" className="lp-statement lp-statement-sm">
              Prize Vaults
            </h2>
            <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {vaults.map((vault) => (
                <li key={vault.id}>
                  <Card className="h-full shadow-none">
                    <p className="font-semibold text-ink">
                      <Link href={`/hackathons/${vault.event.slug}`} className="hover:underline">
                        {vault.event.title}
                      </Link>
                    </p>
                    <p className="mt-1 font-display text-lg font-bold text-ink">
                      {formatKes(vault.amountKes)}
                    </p>
                    <div className="mt-2">
                      <Badge variant={vault.chainState === "REFUNDED" ? "warning" : "success"}>
                        {VAULT_STATE_LABELS[vault.chainState]}
                      </Badge>
                    </div>
                    {vault.contractAddress ? (
                      <p className="mt-2 font-mono text-xs text-muted">
                        {onChain ? (
                          <a
                            href={`${polygonscanUrl}/address/${vault.contractAddress}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 hover:text-ink"
                          >
                            {shortenHash(vault.contractAddress)}
                            <ExternalLink aria-hidden className="size-3" />
                          </a>
                        ) : (
                          shortenHash(vault.contractAddress)
                        )}
                      </p>
                    ) : null}
                  </Card>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      <section className="lp-section" aria-label="Ledger">
        <div className="lp-frame lp-block lp-divided">
          {filterEvents.length > 1 ? (
            <nav aria-label="Filter ledger by hackathon" className="mb-6 flex flex-wrap gap-2">
              <Link
                href="/trust"
                aria-current={!eventFilter ? "page" : undefined}
                className={`rounded-full px-4 py-1.5 text-sm font-semibold ${
                  !eventFilter ? "bg-brand text-ink" : "bg-ink/5 text-ink-soft hover:bg-ink/10"
                }`}
              >
                All Hackathons
              </Link>
              {filterEvents.map((event) => (
                <Link
                  key={event.slug}
                  href={`/trust?event=${event.slug}`}
                  aria-current={eventFilter === event.slug ? "page" : undefined}
                  className={`rounded-full px-4 py-1.5 text-sm font-semibold ${
                    eventFilter === event.slug
                      ? "bg-brand text-ink"
                      : "bg-ink/5 text-ink-soft hover:bg-ink/10"
                  }`}
                >
                  {event.title}
                </Link>
              ))}
            </nav>
          ) : null}

          {entries.length === 0 ? (
            <EmptyState
              icon={ScrollText}
              title={
                eventFilter
                  ? "No Ledger Entries For This Hackathon Yet"
                  : "The Ledger Is Still Empty"
              }
              description="Entries appear the moment a prize pool is locked in escrow. Every lock, payout and refund from then on is recorded here, permanently."
              action={
                <Link href="/hackathons">
                  <Button arrow>Browse Hackathons</Button>
                </Link>
              }
            />
          ) : (
            <section aria-labelledby="entries-heading">
              <h2 id="entries-heading" className="lp-statement lp-statement-sm">
                Ledger Entries
              </h2>
              <div className="mt-6 overflow-x-auto rounded-card border border-ink/10 bg-surface">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-ink/10 text-xs text-muted">
                      <th scope="col" className="px-4 py-3 font-semibold">
                        Time
                      </th>
                      <th scope="col" className="px-4 py-3 font-semibold">
                        Hackathon
                      </th>
                      <th scope="col" className="px-4 py-3 font-semibold">
                        Entry
                      </th>
                      <th scope="col" className="px-4 py-3 font-semibold">
                        Amount
                      </th>
                      <th scope="col" className="px-4 py-3 font-semibold">
                        {onChain ? "Transaction" : "Reference"}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink/5">
                    {entries.map((entry) => {
                      const amount = payloadAmountKes(entry.payload);
                      const reference = payloadReference(entry.payload);
                      return (
                        <tr key={entry.id}>
                          <td className="px-4 py-3 whitespace-nowrap text-muted">
                            {timestampFormat.format(entry.mirroredAt)}
                          </td>
                          <td className="px-4 py-3">
                            <Link
                              href={`/hackathons/${entry.event.slug}`}
                              className="font-semibold text-ink hover:underline"
                            >
                              {entry.event.title}
                            </Link>
                          </td>
                          <td className="px-4 py-3">{LEDGER_TYPE_LABELS[entry.type]}</td>
                          <td className="px-4 py-3 font-semibold text-ink">
                            {amount === null ? "—" : formatKes(amount)}
                          </td>
                          <td className="px-4 py-3 font-mono text-xs">
                            {onChain ? (
                              <a
                                href={`${polygonscanUrl}/tx/${entry.txHash}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-ink-soft hover:text-ink"
                              >
                                {shortenHash(entry.txHash)}
                                <ExternalLink aria-hidden className="size-3" />
                                <span className="sr-only">(opens on Polygonscan in a new tab)</span>
                              </a>
                            ) : (
                              <span className="text-muted">
                                {shortenHash(reference ?? entry.txHash)}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <p className="mt-3 text-xs text-muted">
                Showing the {entries.length} most recent entries
                {entries.length === 100 ? " (use the hackathon filter to narrow down)" : ""}.{" "}
                {onChain
                  ? "Each transaction hash resolves on Polygonscan, the independent block explorer for the Polygon network."
                  : "References are synthetic while the ledger runs in simulation mode."}
              </p>
            </section>
          )}
        </div>
      </section>
    </div>
  );
}
