import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge conditional class names with Tailwind conflict resolution. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Money format for the whole platform — plan §13.3: KES amounts render as
 * "KES 150,000". Never format money inline with ad-hoc `Intl` calls.
 */
export function formatKes(amountKes: number): string {
  return `KES ${new Intl.NumberFormat("en-KE").format(Math.round(amountKes))}`;
}

/**
 * Deposit gross per ADR-012: pool × (1 + fee). Integer kes; the pool portion
 * is what the vault locks — the fee is platform revenue and never reduces
 * prizes.
 */
export function depositGrossForPool(poolKes: number, feeBps: number): number {
  return Math.round(poolKes * (1 + feeBps / 10_000));
}

/** Platform fee portion of a gross deposit (ADR-012). */
export function platformFeeForPool(poolKes: number, feeBps: number): number {
  return depositGrossForPool(poolKes, feeBps) - Math.round(poolKes);
}
