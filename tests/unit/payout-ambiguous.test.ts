import { describe, expect, it } from "vitest";

import { PaystackSimulation } from "@/lib/ports/paystack";
import { afterAmbiguousTransferError } from "@/services/payout/service";

describe("afterAmbiguousTransferError", () => {
  it("only retries when the provider says the attempt is dead", () => {
    expect(afterAmbiguousTransferError("success")).toBe("confirm");
    expect(afterAmbiguousTransferError("failed")).toBe("retry");
    expect(afterAmbiguousTransferError("reversed")).toBe("retry");
    expect(afterAmbiguousTransferError("not_found")).toBe("retry");
    expect(afterAmbiguousTransferError("pending")).toBe("hold");
    expect(afterAmbiguousTransferError("unknown")).toBe("hold");
  });
});

describe("simulated transferStatus", () => {
  it("reports a transfer Paystack never created as not_found, distinct from unknown", async () => {
    const port = new PaystackSimulation();
    await expect(port.transferStatus("trf-x-simnotfound-1")).resolves.toEqual({ status: "not_found" });
    await expect(port.transferStatus("trf-x-simunknown-1")).resolves.toEqual({ status: "unknown" });
  });
});
