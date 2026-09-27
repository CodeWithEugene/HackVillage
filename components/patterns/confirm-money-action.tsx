"use client";

import {
  useEffect,
  useRef,
  useState,
  useTransition,
  type FormEvent,
  type ReactNode,
} from "react";

import { Button } from "@/components/ui/button";
import { FormError, FormSuccess, Input, Label } from "@/components/ui/input";
import { formatKes } from "@/lib/utils";

/** Money-movement typed confirmation threshold (plan §8.2). */
export const MONEY_CONFIRM_THRESHOLD_KES = 250_000;

export interface ConfirmMoneyResult {
  error?: string;
  message?: string;
}

/** Above the threshold the user must type the confirm word; at or below, a plain confirm suffices. */
export function typedConfirmRequired(
  amountKes: number,
  thresholdKes: number = MONEY_CONFIRM_THRESHOLD_KES
): boolean {
  return amountKes > thresholdKes;
}

/**
 * The money-action confirm gate (plan §8.2): every action that moves money
 * passes through a confirmation dialog, and above the KES 250k threshold the
 * user types a confirm word. The server still re-verifies everything — this
 * is the human tripwire, not the enforcement.
 *
 * Renders the trigger button; the dialog carries any extra fields (children)
 * and submits them as FormData to onConfirm.
 */
export function ConfirmMoneyAction({
  amountKes,
  thresholdKes = MONEY_CONFIRM_THRESHOLD_KES,
  confirmWord = "CONFIRM",
  title,
  description,
  confirmLabel = "Confirm",
  triggerLabel,
  triggerVariant = "primary",
  triggerSize = "md",
  triggerDisabled = false,
  className,
  children,
  onConfirm,
}: {
  /** Money at stake in KES; 0 keeps the dialog but never asks for typed confirmation. */
  amountKes: number;
  thresholdKes?: number;
  confirmWord?: string;
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  triggerLabel: ReactNode;
  triggerVariant?: "primary" | "secondary" | "ghost" | "danger";
  triggerSize?: "sm" | "md" | "lg";
  triggerDisabled?: boolean;
  className?: string;
  children?: ReactNode;
  onConfirm: (formData: FormData) => Promise<ConfirmMoneyResult>;
}) {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [result, setResult] = useState<ConfirmMoneyResult>({});
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  const needsTyping = typedConfirmRequired(amountKes, thresholdKes);
  const typedOk = !needsTyping || typed === confirmWord;

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  const openDialog = () => {
    setTyped("");
    setResult({});
    setOpen(true);
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!typedOk || !formRef.current) return;
    const formData = new FormData(formRef.current);
    startTransition(async () => {
      const outcome = await onConfirm(formData);
      setResult(outcome);
      if (!outcome.error) setOpen(false);
    });
  };

  return (
    <div className={className}>
      <Button
        type="button"
        variant={triggerVariant}
        size={triggerSize}
        disabled={triggerDisabled}
        onClick={openDialog}
      >
        {triggerLabel}
      </Button>
      {!open && result.message ? <FormSuccess message={result.message} /> : null}

      {open ? (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-ink/45 p-4"
          onClick={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-money-title"
            className="w-full max-w-md rounded-card bg-surface p-5 shadow-card"
          >
            <h2 id="confirm-money-title" className="font-display text-lg font-bold text-ink">
              {title}
            </h2>
            {description ? (
              <p className="mt-2 text-sm leading-6 text-muted">{description}</p>
            ) : null}
            {amountKes > 0 ? (
              <p className="mt-3 font-display text-xl font-bold text-ink">{formatKes(amountKes)}</p>
            ) : null}

            <form ref={formRef} onSubmit={submit} className="mt-4 space-y-4" noValidate>
              {children}
              {needsTyping ? (
                <div>
                  <Label htmlFor="confirm-money-typed">
                    This exceeds {formatKes(thresholdKes)}, type{" "}
                    <span className="font-mono font-bold">{confirmWord}</span> to confirm
                  </Label>
                  <Input
                    id="confirm-money-typed"
                    value={typed}
                    onChange={(event) => setTyped(event.target.value.toUpperCase())}
                    placeholder={confirmWord}
                    className="font-mono"
                    autoFocus
                    autoComplete="off"
                  />
                </div>
              ) : null}

              <FormError message={result.error} />

              <div className="flex items-center justify-end gap-2">
                <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
                  Back
                </Button>
                <Button type="submit" size="sm" loading={pending} disabled={!typedOk}>
                  {confirmLabel}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
