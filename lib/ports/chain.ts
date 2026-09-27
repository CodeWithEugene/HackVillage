import { createHash, randomBytes } from "node:crypto";
// eslint-disable-next-line no-restricted-imports -- this file IS the chain port (ADR-001): the sanctioned ethers import site.
import { Contract, JsonRpcProvider, Wallet } from "ethers";

import { getEnv } from "@/lib/env";

/**
 * Chain port (ADR-007): the ONLY module that talks to Polygon. The contract is
 * the public LEDGER, not the custodian — fiat stays with Paystack. Real mode
 * signs attestation calls with the platform key (env-only, per SECURITY.md).
 *
 * Simulation mode (no RPC_URL / key / factory address): a deterministic,
 * in-memory mirror of the PrizeVault state machine (same transition rules,
 * same revert reasons) so the entire escrow flow is testable end-to-end
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

/** On-chain vault truth, read back via the vault's public views. */
export interface ChainVaultState {
  state: string;
  releasedKes: number;
}

export const CHAIN_STATES = [
  "AWAITING",
  "LOCKED",
  "HALF_RELEASED",
  "SETTLED",
  "REFUNDED",
] as const;
export type ChainStateName = (typeof CHAIN_STATES)[number];

/** States an attestation write may legitimately target. */
export type IntendedChainState = "LOCKED" | "HALF_RELEASED" | "SETTLED" | "REFUNDED";

/**
 * True when the on-chain state already reflects (or has moved past) the state
 * an attestation intended to write — the already-applied signal that lets
 * attestation handlers skip the write and just mirror the ledger row (P3).
 */
export function chainStateReflects(
  onChain: ChainVaultState | null,
  intended: IntendedChainState
): boolean {
  if (!onChain) return false;
  if (intended === "REFUNDED") return onChain.state === "REFUNDED";
  if (onChain.state === "REFUNDED") {
    // A refunded vault was necessarily LOCKED first — a refund reflects every
    // lock attestation, but it can never stand in for a payout attestation.
    return intended === "LOCKED";
  }
  const order = ["AWAITING", "LOCKED", "HALF_RELEASED", "SETTLED"];
  const have = order.indexOf(onChain.state);
  const want = order.indexOf(intended);
  return have >= 0 && want >= 0 && have >= want;
}

export interface ChainPort {
  mode: "amoy" | "simulation";
  createVault(eventId: string, amountKes: number): Promise<Attestation & { contractAddress: string }>;
  attest(eventId: string, action: AttestationAction): Promise<Attestation>;
  vaultAddressFor(eventId: string): Promise<string | null>;
  /** Read the vault's public state back. null = no vault on-chain. */
  readVaultState(eventId: string): Promise<ChainVaultState | null>;
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
  "function state() view returns (uint8)",
  "function releasedKes() view returns (uint256)",
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

  /**
   * Resolve the vault contract for an event, falling back to the on-chain
   * factory registry when the in-memory map misses (cold start — the cache
   * dies with the process, the factory does not).
   */
  private async vaultContractFor(eventId: string): Promise<Contract | null> {
    const cached = this.vaults.get(eventId);
    if (cached) return cached;
    const address: string = await this.factory.vaultFor(eventId);
    if (address === "0x0000000000000000000000000000000000000000") return null;
    const contract = new Contract(address, VAULT_ABI, this.signer);
    this.vaults.set(eventId, contract);
    return contract;
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
    const contract = await this.vaultContractFor(eventId);
    return contract ? (contract.target as string) : null;
  }

  async readVaultState(eventId: string): Promise<ChainVaultState | null> {
    const vault = await this.vaultContractFor(eventId);
    if (!vault) return null;
    const [stateIndex, released] = await Promise.all([
      vault.state() as Promise<bigint | number>,
      vault.releasedKes() as Promise<bigint>,
    ]);
    const state = CHAIN_STATES[Number(stateIndex)] ?? "AWAITING";
    return { state, releasedKes: Number(released) };
  }

  async attest(eventId: string, action: AttestationAction): Promise<Attestation> {
    const vault = await this.vaultContractFor(eventId);
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

interface SimVault {
  address: string;
  /// 0 means "unknown" — the vault was auto-vivified without a create call.
  amountKes: number;
  state: ChainStateName;
  releasedKes: number;
}

class SimulatedChain implements ChainPort {
  mode = "simulation" as const;
  private block = 4_000_000;
  private vaults = new Map<string, SimVault>();

  private next(): Attestation {
    this.block += 1;
    return { txHash: `0x${randomBytes(32).toString("hex")}`, blockNumber: this.block };
  }

  async createVault(
    eventId: string,
    amountKes: number
  ): Promise<Attestation & { contractAddress: string }> {
    const attestation = this.next();
    const existing = this.vaults.get(eventId);
    if (existing) {
      // Idempotent create: the factory would revert, the simulation returns
      // the existing vault so crash-replay paths stay drivable.
      return { ...attestation, contractAddress: existing.address };
    }
    const contractAddress = `0x${createHash("sha256")
      .update(`vault:${eventId}`)
      .digest("hex")
      .slice(0, 40)}`;
    this.vaults.set(eventId, {
      address: contractAddress,
      amountKes,
      state: "AWAITING",
      releasedKes: 0,
    });
    console.log(
      `[chain:simulation] createVault ${eventId} (${amountKes} KES) -> ${contractAddress}`
    );
    return { ...attestation, contractAddress };
  }

  async attest(eventId: string, action: AttestationAction): Promise<Attestation> {
    const vault = this.vaultForAction(eventId, action);
    switch (action.kind) {
      case "lock":
        if (vault.state !== "AWAITING") throw new Error("Vault: not awaiting deposit");
        vault.state = "LOCKED";
        break;
      case "instantPayout":
        if (vault.state !== "LOCKED") throw new Error("Vault: not locked");
        vault.state = "HALF_RELEASED";
        vault.releasedKes += action.amountKes;
        break;
      case "milestonePayout":
        if (vault.state !== "HALF_RELEASED") throw new Error("Vault: not half released");
        vault.releasedKes += action.amountKes;
        if (vault.amountKes === 0 || vault.releasedKes >= vault.amountKes) {
          vault.state = "SETTLED";
        }
        break;
      case "refund":
        if (vault.state !== "LOCKED" && vault.state !== "HALF_RELEASED") {
          throw new Error("Vault: not refundable");
        }
        vault.state = "REFUNDED";
        break;
      default:
        throw new Error("SimulatedChain: unsupported action");
    }
    const attestation = this.next();
    console.log(`[chain:simulation] ${action.kind} on ${eventId} -> ${vault.state}`);
    return attestation;
  }

  /**
   * Resolve the vault, auto-vivifying an unknown one into the exact state the
   * requested action needs. Pre-vault flows (tests that drive payouts without
   * a chain create) keep the old always-succeeds simulation contract, while
   * known vaults enforce the same transition rules as the real contract.
   */
  private vaultForAction(eventId: string, action: AttestationAction): SimVault {
    let vault = this.vaults.get(eventId);
    if (vault) return vault;
    const address = `0x${createHash("sha256").update(`vault:${eventId}`).digest("hex").slice(0, 40)}`;
    const vivifiedState: ChainStateName =
      action.kind === "lock"
        ? "AWAITING"
        : action.kind === "instantPayout" || action.kind === "refund"
          ? "LOCKED"
          : "HALF_RELEASED";
    vault = { address, amountKes: 0, state: vivifiedState, releasedKes: 0 };
    this.vaults.set(eventId, vault);
    return vault;
  }

  async vaultAddressFor(eventId: string): Promise<string | null> {
    return this.vaults.get(eventId)?.address ?? null;
  }

  async readVaultState(eventId: string): Promise<ChainVaultState | null> {
    const vault = this.vaults.get(eventId);
    if (!vault) return null;
    return { state: vault.state, releasedKes: vault.releasedKes };
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
