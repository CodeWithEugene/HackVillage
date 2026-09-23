# Runbook: Dispute Handling

**When**: a dispute lands in `/admin/disputes` (opened by a winner 14+ days after an unconfirmed milestone).

## Process

1. **Read both sides**: the winner's claim + evidence link; the organizer's milestone description (`Milestone` row) and the event's submission record.
2. **Contact the organizer** (email on the org owner) with the claim — 24h to respond is fair; they may just confirm.
3. **Resolve on `/admin/disputes`** with a written note (audit-logged):
   - **Release milestone — queue final 50%**: evidence shows delivery. The payout is created through the SAME idempotent path as a normal confirm (`{winnerId}:MILESTONE`) — cannot double-pay even if the organizer also confirms.
   - **Reject dispute**: the organizer's confirmation stands; the winner was paid what was owed.

## Rules

- Refunds of already-paid milestone tranches are **out of scope for v1** — they require the two-admin flow (plan §14.1) and Paystack reversal tooling; escalate to the founder.
- Never resolve with an empty note — the audit trail is the trust surface.
- A second dispute on the same winner is blocked (`WRONG_STATE`) until the first resolves.

## Funds position

- While a dispute is OPEN, the milestone payout does not exist — the final 50% stays locked in the vault (fail-closed). Disputes are therefore safe by construction: no money moves without either the organizer's confirm or the admin's audited release.
