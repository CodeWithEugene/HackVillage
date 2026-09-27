import { describe, expect, it } from "vitest";

import { chainStateReflects } from "@/lib/ports/chain";
import {
  AttestationNotReadyError,
  isChainStateRevert,
  mirrorTxHash,
} from "@/services/escrow/attestations";

/**
 * State-aware attestation helpers (audit remediation): handlers read the
 * on-chain vault before writing; these pure functions decide skip vs write
 * vs retry. The matrix mirrors the PrizeVault.sol state machine exactly.
 */
describe("chainStateReflects — intended state already on-chain?", () => {
  it("a missing vault reflects nothing", () => {
    expect(chainStateReflects(null, "LOCKED")).toBe(false);
    expect(chainStateReflects(null, "HALF_RELEASED")).toBe(false);
    expect(chainStateReflects(null, "SETTLED")).toBe(false);
    expect(chainStateReflects(null, "REFUNDED")).toBe(false);
  });

  it("AWAITING reflects nothing beyond creation", () => {
    const onChain = { state: "AWAITING", releasedKes: 0 };
    expect(chainStateReflects(onChain, "LOCKED")).toBe(false);
    expect(chainStateReflects(onChain, "HALF_RELEASED")).toBe(false);
    expect(chainStateReflects(onChain, "SETTLED")).toBe(false);
    expect(chainStateReflects(onChain, "REFUNDED")).toBe(false);
  });

  it("LOCKED reflects the lock intent only", () => {
    const onChain = { state: "LOCKED", releasedKes: 0 };
    expect(chainStateReflects(onChain, "LOCKED")).toBe(true);
    expect(chainStateReflects(onChain, "HALF_RELEASED")).toBe(false);
    expect(chainStateReflects(onChain, "SETTLED")).toBe(false);
  });

  it("HALF_RELEASED reflects lock + instant-payout intents (multi-winner skip)", () => {
    const onChain = { state: "HALF_RELEASED", releasedKes: 50_000 };
    expect(chainStateReflects(onChain, "LOCKED")).toBe(true);
    expect(chainStateReflects(onChain, "HALF_RELEASED")).toBe(true);
    expect(chainStateReflects(onChain, "SETTLED")).toBe(false);
  });

  it("SETTLED reflects everything except refund", () => {
    const onChain = { state: "SETTLED", releasedKes: 100_000 };
    expect(chainStateReflects(onChain, "LOCKED")).toBe(true);
    expect(chainStateReflects(onChain, "HALF_RELEASED")).toBe(true);
    expect(chainStateReflects(onChain, "SETTLED")).toBe(true);
    expect(chainStateReflects(onChain, "REFUNDED")).toBe(false);
  });

  it("REFUNDED reflects the lock (it was locked first) and the refund, never payouts", () => {
    const onChain = { state: "REFUNDED", releasedKes: 0 };
    expect(chainStateReflects(onChain, "LOCKED")).toBe(true);
    expect(chainStateReflects(onChain, "REFUNDED")).toBe(true);
    expect(chainStateReflects(onChain, "HALF_RELEASED")).toBe(false);
    expect(chainStateReflects(onChain, "SETTLED")).toBe(false);
  });
});

describe("isChainStateRevert — contract state-gate revert reasons", () => {
  it("matches the PrizeVault.sol revert strings", () => {
    expect(isChainStateRevert(new Error("Vault: not awaiting deposit"))).toBe(true);
    expect(isChainStateRevert(new Error("Vault: not locked"))).toBe(true);
    expect(isChainStateRevert(new Error("Vault: not half released"))).toBe(true);
    expect(isChainStateRevert(new Error("Vault: not refundable"))).toBe(true);
    expect(isChainStateRevert(new Error("execution reverted: already initialized"))).toBe(true);
  });

  it("does not swallow real failures", () => {
    expect(isChainStateRevert(new Error("network timeout"))).toBe(false);
    expect(isChainStateRevert(new Error("insufficient funds for gas"))).toBe(false);
    expect(isChainStateRevert("string error")).toBe(false);
  });
});

describe("mirrorTxHash — deterministic ledger hash for already-applied paths", () => {
  it("is deterministic per seed and shaped like a real tx hash", () => {
    const a = mirrorTxHash("deposit-locked:evt1:hv-abc");
    expect(a).toBe(mirrorTxHash("deposit-locked:evt1:hv-abc"));
    expect(a).toMatch(/^0x[0-9a-f]{64}$/);
    expect(mirrorTxHash("deposit-locked:evt1:hv-xyz")).not.toBe(a);
  });
});

describe("AttestationNotReadyError", () => {
  it("is a distinct retryable type the job layer can recognize", () => {
    const error = new AttestationNotReadyError("chain behind");
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe("AttestationNotReadyError");
  });
});
