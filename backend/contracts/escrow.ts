/**
 * Smart contract ABI / address placeholders for the public ledger layer.
 * Deploy target: Polygon (testnet first) or Solana — see README escrow section.
 */

export const ESCROW_CONTRACT = {
  address: process.env.SMART_CONTRACT_ADDRESS ?? "0x0000000000000000000000000000000000000000",
  chain: "polygon-amoy",
} as const;

/** Minimal ABI stub for vault lock / authorize release */
export const ESCROW_ABI = [
  "function lockPrize(bytes32 eventId, uint256 amountKes) returns (bytes32)",
  "function authorizeRelease(bytes32 eventId, uint8 phase) returns (bytes32)",
  "function vaultState(bytes32 eventId) view returns (uint8)",
] as const;

export type LedgerRecordInput = {
  eventId: string;
  kind: "DEPOSIT" | "INSTANT_50" | "MILESTONE_50";
  amountKes: number;
};

/**
 * Stub: submit ledger entry to the chain and return a public explorer URL.
 */
export async function recordOnPublicLedger(
  input: LedgerRecordInput,
): Promise<{ txHash: string; publicUrl: string }> {
  const txHash = `0xstub${input.eventId.replace(/\W/g, "").slice(0, 24)}${input.kind}`;
  return {
    txHash,
    publicUrl: `https://amoy.polygonscan.com/tx/${txHash}`,
  };
}
