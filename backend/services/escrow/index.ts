/**
 * Escrow microservice boundary.
 * Paystack deposits lock prize pools; smart contract records public ledger state.
 * Never call Paystack or chain RPCs from UI components — go through these APIs.
 */

export type PrizeVaultState =
  | "PENDING_DEPOSIT"
  | "PRIZE_VAULT"
  | "PARTIAL_RELEASED"
  | "FULLY_RELEASED"
  | "LOCKED_ERROR";

export type LockPrizePoolInput = {
  eventId: string;
  amountKes: number;
  paystackReference: string;
};

export type LockPrizePoolResult = {
  state: PrizeVaultState;
  ledgerTxHash: string;
  publicLedgerUrl: string;
};

/**
 * Records a confirmed Paystack deposit and locks funds in PRIZE_VAULT.
 * Stub: replace with Paystack verify + contract write.
 */
export async function lockPrizePool(
  input: LockPrizePoolInput,
): Promise<LockPrizePoolResult> {
  // TODO: verify Paystack transaction, then call contracts/escrow
  return {
    state: "PRIZE_VAULT",
    ledgerTxHash: `stub-lock-${input.eventId}`,
    publicLedgerUrl: `https://example.invalid/tx/stub-lock-${input.eventId}`,
  };
}

/**
 * Authorizes instant 50% release after judging is finalized.
 * On Paystack/network failure, leave vault locked (no partial ambiguous state).
 */
export async function authorizeInstantRelease(eventId: string): Promise<{
  authorized: boolean;
  ledgerTxHash: string;
}> {
  // TODO: smart contract authorize + payout service transfer
  return {
    authorized: true,
    ledgerTxHash: `stub-instant-${eventId}`,
  };
}

/**
 * Authorizes final 50% after organizer handover confirmation.
 */
export async function authorizeMilestoneRelease(eventId: string): Promise<{
  authorized: boolean;
  ledgerTxHash: string;
}> {
  return {
    authorized: true,
    ledgerTxHash: `stub-milestone-${eventId}`,
  };
}
