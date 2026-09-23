import { createHash, createHmac, timingSafeEqual } from "node:crypto";

import { getEnv } from "@/lib/env";

/**
 * Paystack port (ADR-001/ADR-006): the ONLY module that talks to Paystack.
 * Everything else in the codebase depends on this interface — never on the SDK
 * or the wire format.
 *
 * Simulation mode: when PAYSTACK_SECRET_KEY is absent (local dev, CI, preview
 * environments without secrets), the port returns a local dev checkout URL
 * served by /api/dev/paystack/checkout/[reference] that mimics the hosted
 * checkout and completes through the same escrow service path as a real
 * webhook would. It is hard-disabled in production (P4 fail-closed).
 */

export interface CheckoutInput {
  reference: string;
  /// KES — the port converts to pesewas for Paystack.
  amountKes: number;
  email: string;
  metadata?: Record<string, string>;
}

export interface CheckoutSession {
  authorizationUrl: string;
  simulated: boolean;
}

export interface TransactionVerification {
  status: "success" | "failed" | "pending" | "abandoned";
  amountPesewas: number;
  channel: string | null;
  raw: unknown;
}

export type PayoutMethod = "MPESA" | "BANK";

export interface RecipientInput {
  /** The winner's verified payout destination (ADR-013). */
  type: PayoutMethod;
  name: string;
  /// M-Pesa phone number (2547…) or bank account number.
  accountNumber: string;
  /// Bank code (Paystack's list) — required for BANK only.
  bankCode?: string;
}

export interface RecipientResult {
  recipientCode: string;
  simulated: boolean;
}

export interface TransferInput {
  /// Unique per payout — Paystack dedupes by transfer reference (P3).
  reference: string;
  recipientCode: string;
  amountKes: number;
  reason: string;
}

export interface TransferResult {
  transferCode: string;
  status: "pending" | "success" | "failed" | "reversed";
  simulated: boolean;
}

export interface PaystackPort {
  mode: "live" | "simulation";
  initializeCheckout(input: CheckoutInput): Promise<CheckoutSession>;
  verifyTransaction(reference: string): Promise<TransactionVerification | null>;
  /** HMAC-SHA512 over the raw body, constant-time compared (plan §14.2). */
  verifyWebhookSignature(rawBody: string, signature: string | null): boolean;
  createTransferRecipient(input: RecipientInput): Promise<RecipientResult>;
  initiateTransfer(input: TransferInput): Promise<TransferResult>;
}

const PAYSTACK_BASE = "https://api.paystack.co";

/** Exported for the HMAC unit test — not part of the service surface. */
export class PaystackLive implements PaystackPort {
  mode = "live" as const;

  constructor(private secretKey: string) {}

  async initializeCheckout(input: CheckoutInput): Promise<CheckoutSession> {
    const response = await fetch(`${PAYSTACK_BASE}/transaction/initialize`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        reference: input.reference,
        amount: input.amountKes * 100, // pesewas
        email: input.email,
        currency: "KES",
        metadata: input.metadata ?? {},
      }),
    });
    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(`Paystack initialize failed (${response.status}): ${body.slice(0, 300)}`);
    }
    const payload = (await response.json()) as {
      status: boolean;
      data?: { authorization_url?: string };
    };
    if (!payload.status || !payload.data?.authorization_url) {
      throw new Error("Paystack initialize returned no authorization_url.");
    }
    return { authorizationUrl: payload.data.authorization_url, simulated: false };
  }

  async verifyTransaction(reference: string): Promise<TransactionVerification | null> {
    const response = await fetch(
      `${PAYSTACK_BASE}/transaction/verify/${encodeURIComponent(reference)}`,
      { headers: { Authorization: `Bearer ${this.secretKey}` } }
    );
    if (!response.ok) return null;
    const payload = (await response.json()) as {
      status: boolean;
      data?: { status?: string; amount?: number; channel?: string };
    };
    if (!payload.status || !payload.data) return null;
    return {
      status: (payload.data.status as TransactionVerification["status"]) ?? "pending",
      amountPesewas: payload.data.amount ?? 0,
      channel: payload.data.channel ?? null,
      raw: payload.data,
    };
  }

  verifyWebhookSignature(rawBody: string, signature: string | null): boolean {
    if (!signature) return false;
    const expected = createHmac("sha512", this.secretKey).update(rawBody).digest("hex");
    const a = Buffer.from(expected, "utf8");
    const b = Buffer.from(signature, "utf8");
    return a.length === b.length && timingSafeEqual(a, b);
  }

  async createTransferRecipient(input: RecipientInput): Promise<RecipientResult> {
    const response = await fetch(`${PAYSTACK_BASE}/transferrecipient`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type: input.type === "MPESA" ? "mobile_money" : "nuban",
        name: input.name,
        account_number: input.accountNumber,
        bank_code: input.type === "MPESA" ? "MPS" : input.bankCode,
        currency: "KES",
      }),
    });
    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(`Paystack recipient failed (${response.status}): ${body.slice(0, 300)}`);
    }
    const payload = (await response.json()) as {
      status: boolean;
      data?: { recipient_code?: string };
    };
    if (!payload.status || !payload.data?.recipient_code) {
      throw new Error("Paystack returned no recipient_code.");
    }
    return { recipientCode: payload.data.recipient_code, simulated: false };
  }

  async initiateTransfer(input: TransferInput): Promise<TransferResult> {
    const response = await fetch(`${PAYSTACK_BASE}/transfer`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        source: "balance",
        amount: input.amountKes * 100, // pesewas
        recipient: input.recipientCode,
        reference: input.reference,
        reason: input.reason,
        currency: "KES",
      }),
    });
    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(`Paystack transfer failed (${response.status}): ${body.slice(0, 300)}`);
    }
    const payload = (await response.json()) as {
      status: boolean;
      data?: { transfer_code?: string; status?: string };
    };
    if (!payload.status || !payload.data?.transfer_code) {
      throw new Error("Paystack returned no transfer_code.");
    }
    return {
      transferCode: payload.data.transfer_code,
      status: (payload.data.status as TransferResult["status"]) ?? "pending",
      simulated: false,
    };
  }
}

class PaystackSimulation implements PaystackPort {
  mode = "simulation" as const;

  async initializeCheckout(input: CheckoutInput): Promise<CheckoutSession> {
    const base = getEnv().NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
    return {
      authorizationUrl: `${base}/api/dev/paystack/checkout/${input.reference}`,
      simulated: true,
    };
  }

  async verifyTransaction(reference: string): Promise<TransactionVerification | null> {
    // The dev checkout calls the escrow service directly; verification is
    // never consulted in simulation mode, but keep the shape honest.
    return {
      status: "success",
      amountPesewas: 0,
      channel: "simulation",
      raw: { reference, simulated: true },
    };
  }

  verifyWebhookSignature(): boolean {
    // Simulation traffic never enters the production webhook route.
    return false;
  }

  async createTransferRecipient(input: RecipientInput): Promise<RecipientResult> {
    // Deterministic pseudo-code — readable in the dev DB and on /trust.
    const digest = createHash("sha256")
      .update(`${input.type}:${input.accountNumber}`)
      .digest("hex")
      .slice(0, 13);
    return { recipientCode: `RCP_SIM_${digest}`, simulated: true };
  }

  async initiateTransfer(input: TransferInput): Promise<TransferResult> {
    // Test hook: references containing "-simfail" or "-simreverse" exercise
    // the failure paths of the payout engine without any network.
    if (input.reference.includes("-simfail")) {
      return { transferCode: `TRF_SIM_${input.reference}`, status: "failed", simulated: true };
    }
    if (input.reference.includes("-simreverse")) {
      return { transferCode: `TRF_SIM_${input.reference}`, status: "reversed", simulated: true };
    }
    return { transferCode: `TRF_SIM_${input.reference}`, status: "success", simulated: true };
  }
}

let cached: PaystackPort | null = null;

export function getPaystackPort(): PaystackPort {
  if (cached) return cached;
  const secret = getEnv().PAYSTACK_SECRET_KEY;
  if (secret && process.env.NODE_ENV === "production") {
    cached = new PaystackLive(secret);
  } else if (secret) {
    cached = new PaystackLive(secret);
  } else {
    console.warn(
      "[paystack] PAYSTACK_SECRET_KEY not set — running in SIMULATION mode. " +
        "Deposits complete via the dev checkout. Never enable in production."
    );
    cached = new PaystackSimulation();
  }
  return cached;
}
