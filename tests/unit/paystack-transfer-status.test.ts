import { describe, expect, it } from "vitest";

import { mapTransferStatus, PaystackSimulation } from "@/lib/ports/paystack";

/**
 * transferStatus recovery matrix (audit remediation): the stuck-PROCESSING
 * sweep and adminRetryPayout resolve provider truth through this port method.
 * In simulation the status derives from the reference suffix conventions —
 * the same hooks initiateTransfer uses.
 */
describe("PaystackPort.transferStatus (simulation matrix)", () => {
  const port = new PaystackSimulation();

  it("resolves terminal success for plain references and TRF_SIM_ codes", async () => {
    await expect(port.transferStatus("trf-abc123-1")).resolves.toEqual({ status: "success" });
    await expect(port.transferStatus("TRF_SIM_trf-abc123-1")).resolves.toEqual({
      status: "success",
    });
  });

  it("resolves failed/reversed/pending/unknown from the dev suffix hooks", async () => {
    await expect(port.transferStatus("trf-abc-simfail-1")).resolves.toEqual({ status: "failed" });
    await expect(port.transferStatus("trf-abc-simreverse-1")).resolves.toEqual({
      status: "reversed",
    });
    await expect(port.transferStatus("trf-abc-simpending-1")).resolves.toEqual({
      status: "pending",
    });
    await expect(port.transferStatus("trf-abc-simunknown-1")).resolves.toEqual({
      status: "unknown",
    });
  });

  it("resolves the TRF_SIM_ code form of the hooks identically", async () => {
    await expect(port.transferStatus("TRF_SIM_trf-abc-simfail-2")).resolves.toEqual({
      status: "failed",
    });
    await expect(port.transferStatus("TRF_SIM_trf-abc-simreverse-2")).resolves.toEqual({
      status: "reversed",
    });
  });

  it("initiateTransfer stays consistent with transferStatus for the same reference", async () => {
    const reference = "trf-consistency-simpending-1";
    const transfer = await port.initiateTransfer({
      reference,
      recipientCode: "RCP_SIM_TEST",
      amountKes: 100,
      reason: "consistency check",
    });
    expect(transfer.status).toBe("pending");
    await expect(port.transferStatus(reference)).resolves.toEqual({ status: "pending" });
    await expect(port.transferStatus(transfer.transferCode)).resolves.toEqual({
      status: "pending",
    });
  });
});

describe("mapTransferStatus (live wire mapping)", () => {
  it("maps Paystack transfer statuses onto the recovery vocabulary", () => {
    expect(mapTransferStatus("success")).toBe("success");
    expect(mapTransferStatus("failed")).toBe("failed");
    expect(mapTransferStatus("reversed")).toBe("reversed");
    expect(mapTransferStatus("pending")).toBe("pending");
    expect(mapTransferStatus("otp")).toBe("pending");
    expect(mapTransferStatus("processing")).toBe("pending");
    expect(mapTransferStatus("gibberish")).toBe("unknown");
    expect(mapTransferStatus(undefined)).toBe("unknown");
    expect(mapTransferStatus(null)).toBe("unknown");
  });
});
