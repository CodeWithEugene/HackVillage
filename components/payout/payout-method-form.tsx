"use client";

import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { FormError, FormSuccess, Input, Label } from "@/components/ui/input";
import { savePayoutMethodAction, type PayoutActionState } from "@/services/payout/actions";

const BANKS = [
  { code: "63902", name: "Equity Bank" },
  { code: "00038", name: "KCB Bank" },
  { code: "01045", name: "Co-operative Bank" },
  { code: "00158", name: "NCBA Bank" },
  { code: "00025", name: "Absa Bank Kenya" },
  { code: "07001", name: "Stanbic Bank" },
];

export function PayoutMethodForm({
  current,
}: {
  current?: { method: string | null; recipientCode: string | null } | null;
}) {
  const [state, action, pending] = useActionState<PayoutActionState, FormData>(
    savePayoutMethodAction,
    {}
  );
  const [method, setMethod] = useState<"MPESA" | "BANK">(
    (current?.method as "MPESA" | "BANK" | undefined) ?? "MPESA"
  );

  return (
    <Card>
      <CardTitle>Payout method</CardTitle>
      <CardDescription>
        Where your winnings land. M-Pesa is instant; bank transfers take minutes to hours.
        {current?.recipientCode ? (
          <span className="mt-1 block">
            Current: <code className="font-mono text-xs">{current.recipientCode.slice(0, 18)}…</code>
          </span>
        ) : null}
      </CardDescription>

      <form action={action} className="mt-4 space-y-4">
        <fieldset>
          <legend className="mb-2 text-sm font-semibold text-ink">Receive via</legend>
          <div className="grid grid-cols-2 gap-2">
            {(["MPESA", "BANK"] as const).map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={method === option}
                onClick={() => setMethod(option)}
                className={`rounded-control border-2 px-3 py-2 text-sm font-semibold ${
                  method === option
                    ? "border-brand bg-brand/10 text-ink"
                    : "border-ink/10 text-muted hover:border-ink/25"
                }`}
              >
                {option === "MPESA" ? "M-Pesa" : "Bank"}
              </button>
            ))}
          </div>
        </fieldset>
        <input type="hidden" name="type" value={method} />

        <div>
          <Label htmlFor="payout-name">Name on the account</Label>
          <Input id="payout-name" name="name" required maxLength={80} placeholder="Wanjiku Kariuki" />
        </div>

        <div>
          <Label htmlFor="payout-account">
            {method === "MPESA" ? "M-Pesa number" : "Account number"}
          </Label>
          <Input
            id="payout-account"
            name="accountNumber"
            required
            inputMode="numeric"
            placeholder={method === "MPESA" ? "254712345678" : "1234567890"}
          />
          {method === "MPESA" ? (
            <p className="mt-1.5 text-xs text-muted">
              Format: 2547XXXXXXXX or 2541XXXXXXXX — the full number with country code.
            </p>
          ) : null}
        </div>

        {method === "BANK" ? (
          <div>
            <Label htmlFor="payout-bank">Bank</Label>
            <select
              id="payout-bank"
              name="bankCode"
              required
              className="h-11 w-full rounded-control border border-ink/15 bg-white px-3 text-ink"
            >
              {BANKS.map((bank) => (
                <option key={bank.code} value={bank.code}>
                  {bank.name}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        <FormError message={state.error} />
        <FormSuccess message={state.message} />
        <Button type="submit" loading={pending}>
          Save Payout Method
        </Button>
      </form>
    </Card>
  );
}
