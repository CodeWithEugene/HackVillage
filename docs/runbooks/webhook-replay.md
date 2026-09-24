# Runbook: Webhook Replay & Signature Failures

**When**: `[webhook] PAYSTACK signature verification failed` in logs, or a `charge.success`/`transfer.*` event arrives twice.

## Signature failures (401 responses)

1. Confirm `PAYSTACK_SECRET_KEY` matches the Paystack dashboard secret (live vs test keys are the classic mixup).
2. The route reads the **raw body** (`await request.text()`) before any parsing — if it was ever changed to parse first, HMAC breaks. Verify the route file is untouched.
3. Rate-limiter noise: Paystack retries failed deliveries; sustained 401s mean Paystack will stop retrying — treat as urgent.

## Replays

- Replays are **safe by design**: the `WebhookEvent` unique constraint on (source, eventType, reference) makes the second delivery a no-op (`{ ok: true, duplicate: true }`).
- If a replayed `charge.success` references a deposit already `SUCCEEDED`, `recordChargeSuccess` returns `duplicate` — zero side effects (covered by integration tests).

## Unknown references

- `[webhook] charge.success with unknown reference` → a real payment with no matching `Deposit` row (usually an expired-then-paid checkout). The money is NOT lost:
  1. Look up the reference on Paystack (amount, when, metadata).
  2. If the metadata contains `eventId`, record it: mark the deposit row's reference to match, flip it via `recordChargeSuccess`, or create the deposit row then confirm.
  3. If it cannot be mapped, refund from the Paystack dashboard.

## Manual replay

- To re-drive processing of a stored webhook: delete the `WebhookEvent` row for that (source, eventType, reference) and re-send the payload to `/api/webhooks/paystack` with a fresh signature. Never do this for money events without checking the downstream state first.
