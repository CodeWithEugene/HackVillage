import type { LedgerEntryType, Prisma } from "@prisma/client";

/**
 * Pure display logic for the /trust public ledger page, colocated with the
 * route (Next.js page modules may only export route entrypoints, so testable
 * logic lives here — see tests/unit/public-trust-pages.test.ts).
 */

/** Human labels for the on-chain attestation types (plan §11.3). */
export const LEDGER_TYPE_LABELS: Record<LedgerEntryType, string> = {
  VAULT_CREATED: "Vault created",
  DEPOSIT_LOCKED: "Prize pool locked",
  INSTANT_PAYOUT: "Instant payout",
  MILESTONE_PAYOUT: "Milestone payout",
  VAULT_REFUNDED: "Vault refunded",
};

/**
 * Ledger payloads are JSON written by the escrow/payout services: amountKes
 * is present on every type today, but the page must survive older rows and
 * future shapes — so extraction is defensive, never a cast.
 */
export function payloadAmountKes(payload: Prisma.JsonValue): number | null {
  if (payload && typeof payload === "object" && !Array.isArray(payload)) {
    const value = (payload as Record<string, unknown>).amountKes;
    if (typeof value === "number" && Number.isFinite(value)) return value;
  }
  return null;
}

/** The most human-readable reference in a payload: transfer ref, payment ref, refund ref or contract. */
export function payloadReference(payload: Prisma.JsonValue): string | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;
  const record = payload as Record<string, unknown>;
  for (const key of ["txRef", "paystackRef", "refundRef", "contractAddress"] as const) {
    const value = record[key];
    if (typeof value === "string" && value.length > 0) return value;
  }
  return null;
}

/** "0x1234…abcd" — enough to recognise a hash, short enough for a table row. */
export function shortenHash(hash: string): string {
  return hash.length > 12 ? `${hash.slice(0, 6)}…${hash.slice(-4)}` : hash;
}
