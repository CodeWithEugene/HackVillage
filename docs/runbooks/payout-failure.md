# Runbook: Payout Failure Triage

**When**: a payout is `FAILED`, `REVERSED`, or `MANUAL_REVIEW` — visible on `/admin/payments` or via the `[payout] MANUAL_REVIEW` log line.

**Invariant to protect**: funds stay locked until a human confirms. The engine never auto-releases on uncertainty (P4 fail-closed). Nothing is ever lost — a `MANUAL_REVIEW` payout is money that is *owed*, not money that is gone.

## Triage steps

1. **Read the payout row** — `lastError` and `attemptCount` tell the story:
   - `Transfer failed` / provider error → the transfer never landed; retry is safe.
   - `Provider reported transfer.reversed` → money WAS sent and came back; do NOT blind-retry — check Paystack first.
2. **Check Paystack dashboard** for `paystackReference` (format `trf-<payoutId>-<attempt>`):
   - Not found → the transfer never reached the provider; safe to retry.
   - Succeeded on Paystack but `FAILED` locally → webhook loss; verify manually, then mark paid with the receipt.
3. **Choose the action on `/admin/payments`**:
   - **Retry payout** — resets to QUEUED, fresh attempt cycle (audit-logged).
   - **Mark paid with receipt** — for webhook-confirmed-but-locally-stuck cases. REQUIRES the provider receipt reference; writes an audit entry.
4. **If the recipient is wrong** (winner changed numbers): the winner updates their payout method in Settings (new recipient code), then admin retries.

## Escalation

- 3+ payouts in `MANUAL_REVIEW` for the same event → page the on-call (likely a provider incident).
- Any suspicion of double-payment → freeze: set Paystack transfers to hold, reconcile `Payout` rows against Paystack exports, then resolve one-by-one. The `{winnerId}:{tranche}` unique key prevents platform-side duplicates; provider-side is verified by reference.

## Related

- The recovery sweep (`payout.cron`, every 10 min) re-drives `QUEUED`/`FAILED`/stale `PROCESSING` payouts — idempotent (claims under a conditional update), so it can never double-pay.
- Webhook replays are absorbed by the `WebhookEvent` unique constraint (source, eventType, reference).
