import { createHash, randomBytes } from "node:crypto";
// eslint-disable-next-line no-restricted-imports -- this file IS the chain port (ADR-001): the sanctioned ethers import site.
import { Contract, JsonRpcProvider, Wallet } from "ethers";

import { getEnv } from "@/lib/env";

/**
 * Chain port (ADR-007): the ONLY module that talks to Polygon. The contract is
 * the public LEDGER, not the custodian — fiat stays with Paystack. Real mode
 * signs attestation calls with the platform key (env-only, per SECURITY.md).
 *
 * Simulation mode (no RPC_URL / key / factory address): returns deterministic
 * synthetic attestations so the entire escrow flow is testable end-to-end
 * without a chain. /trust labels entries clearly in this mode.
 */

export interface Attestation {
  txHash: string;
  blockNumber: number;
}

export type AttestationAction =
  | { kind: "createVault" }
  | { kind: "lock"; paystackRef: string }
  | { kind: "instantPayout"; winner: string; amountKes: number; txRef: string }
  | { kind: "milestonePayout"; winner: string; amountKes: number; txRef: string }
  | { kind: "refund"; refundRef: string };

export interface ChainPort {
  mode: "amoy" | "simulation";
  createVault(eventId: string, amountKes: number): Promise<Attestation & { contractAddress: string }>;
  attest(eventId: string, action: AttestationAction): Promise<Attestation>;
  vaultAddressFor(eventId: string): Promise<string | null>;
}

// ── Minimal ABIs (hand-pinned; the full artifacts live in contracts/) ────

const FACTORY_ABI = [
  "function createVault(string eventId, uint256 amountKes, address attester) returns (address)",
  "function vaultFor(string eventId) view returns (address)",
  "event VaultCreated(string eventId, address vault, uint256 amountKes, address attester)",
];

const VAULT_ABI = [
  "function lock(bytes32 paystackRef)",
  "function recordInstantPayout(bytes32 winner, uint256 amount, bytes32 txRef)",
  "function recordMilestonePayout(bytes32 winner, uint256 amount, bytes32 txRef)",
  "function refund(bytes32 refundRef)",
];

function refHash(value: string): string {
  return "0x" + createHash("sha256").update(value).digest("hex");
}

class AmoyChain implements ChainPort {
  mode = "amoy" as const;

  private provider: JsonRpcProvider;
  private signer: Wallet;
  private factory: Contract;
  /** eventId → vault address cache (the factory is the registry). */
  private vaults = new Map<string, Contract>();

  constructor(
    rpcUrl: string,
    privateKey: string,
    factoryAddress: string
  ) {
    this.provider = new JsonRpcProvider(rpcUrl);
    this.signer = new Wallet(privateKey, this.provider);
    this.factory = new Contract(factoryAddress, FACTORY_ABI, this.signer);
  }

  async createVault(
    eventId: string,
    amountKes: number
  ): Promise<Attestation & { contractAddress: string }> {
    const tx = await this.factory.createVault(eventId, BigInt(amountKes), this.signer.address);
    const receipt = await tx.wait();
    const vaultAddress = await this.factory.vaultFor(eventId);
    this.vaults.set(
      eventId,
      new Contract(vaultAddress, VAULT_ABI, this.signer)
    );
    return {
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber ?? 0,
      contractAddress: vaultAddress,
    };
  }

  async vaultAddressFor(eventId: string): Promise<string | null> {
    if (this.vaults.has(eventId)) return this.vaults.get(eventId)!.target as string;
    const address: string = await this.factory.vaultFor(eventId);
    if (address === "0x0000000000000000000000000000000000000000") return null;
    this.vaults.set(eventId, new Contract(address, VAULT_ABI, this.signer));
    return address;
  }

  async attest(eventId: string, action: AttestationAction): Promise<Attestation> {
    const vault = this.vaults.get(eventId) ?? null;
    if (!vault) throw new Error(`AmoyChain: no vault loaded for ${eventId}`);

    let tx: Promise<unknown>;
    switch (action.kind) {
      case "lock":
        tx = vault.lock(refHash(action.paystackRef));
        break;
      case "instantPayout":
        tx = vault.recordInstantPayout(
          refHash(action.winner),
          BigInt(action.amountKes),
          refHash(action.txRef)
        );
        break;
      case "milestonePayout":
        tx = vault.recordMilestonePayout(
          refHash(action.winner),
          BigInt(action.amountKes),
          refHash(action.txRef)
        );
        break;
      case "refund":
        tx = vault.refund(refHash(action.refundRef));
        break;
      default:
        throw new Error(`AmoyChain: unsupported action`);
    }

    const receipt = (await tx) as { hash: string; blockNumber?: number; wait(): Promise<{ hash: string; blockNumber?: number }> };
    const confirmed = await receipt.wait();
    return { txHash: confirmed.hash, blockNumber: confirmed.blockNumber ?? 0 };
  }
}

class SimulatedChain implements ChainPort {
  mode = "simulation" as const;
  private block = 4_000_000;
  private vaults = new Map<string, string>();

  private next(): Attestation {
    this.block += 1;
    return { txHash: `0x${randomBytes(32).toString("hex")}`, blockNumber: this.block };
  }

  async createVault(
    eventId: string,
    amountKes: number
  ): Promise<Attestation & { contractAddress: string }> {
    const attestation = this.next();
    const contractAddress = `0x${createHash("sha256")
      .update(`vault:${eventId}`)
      .digest("hex")
      .slice(0, 40)}`;
    this.vaults.set(eventId, contractAddress);
    console.log(
      `[chain:simulation] createVault ${eventId} (${amountKes} KES) -> ${contractAddress}`
    );
    return { ...attestation, contractAddress };
  }

  async attest(eventId: string, action: AttestationAction): Promise<Attestation> {
    const attestation = this.next();
    console.log(`[chain:simulation] ${action.kind} on ${eventId}`);
    return attestation;
  }

  async vaultAddressFor(eventId: string): Promise<string | null> {
    return this.vaults.get(eventId) ?? null;
  }
}

let cached: ChainPort | null = null;

export function getChainPort(): ChainPort {
  if (cached) return cached;
  const env = getEnv();
  if (env.RPC_URL && env.ATTESTER_PRIVATE_KEY && env.SMART_CONTRACT_ADDRESS) {
    cached = new AmoyChain(env.RPC_URL, env.ATTESTER_PRIVATE_KEY, env.SMART_CONTRACT_ADDRESS);
  } else {
    console.warn(
      "[chain] RPC_URL / ATTESTER_PRIVATE_KEY / SMART_CONTRACT_ADDRESS not set — " +
        "attestations run in SIMULATION mode. Entries are marked on /trust."
    );
    cached = new SimulatedChain();
  }
  return cached;
}
