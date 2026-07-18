/**
 * Split disbursement via Paystack (M-Pesa / bank).
 * All operations must be idempotent — retries must never double-pay.
 */

export type DisburseInput = {
  idempotencyKey: string;
  amountKes: number;
  recipient: {
    type: "mpesa" | "bank";
    accountRef: string;
    name: string;
  };
  reason: "INSTANT_50" | "MILESTONE_50";
};

export type DisburseResult =
  | { ok: true; transferCode: string }
  | { ok: false; error: string; fundsRemainLocked: true };

/**
 * Executes a Paystack transfer. On failure, funds remain locked in the vault.
 */
export async function disburse(input: DisburseInput): Promise<DisburseResult> {
  // TODO: Paystack Transfer API with idempotencyKey
  if (!input.idempotencyKey) {
    return {
      ok: false,
      error: "idempotencyKey is required",
      fundsRemainLocked: true,
    };
  }

  return {
    ok: true,
    transferCode: `stub-transfer-${input.idempotencyKey}`,
  };
}
