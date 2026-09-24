# Runbook: Chain RPC Outage (Ledger-Pending Mode)

**When**: `[jobs] escrow.attest-*` failures in logs; `/trust` shows stale entries; Polygon RPC unreachable.

**Design principle (ADR-007)**: the chain is the LEDGER, not the CUSTODIAN. Fiat sits with Paystack; DB rows are the money state. A chain outage **never blocks deposits, payouts, or the event lifecycle** — attestations are derived data.

## What happens automatically

- `escrow.attest-vault-created` / `escrow.attest-vault-locked` / `payout.attest` jobs retry (5 attempts, backoff) and then park. The DB money state is already correct.
- `/trust` continues serving from `LedgerEntry` rows (the mirror) — only new attestations are missing.

## Recovery

1. Confirm the RPC provider is back (`RPC_URL` health).
2. Re-drive parked attestations: for each event missing a ledger entry, call `attestVaultCreation` / `attestVaultLocked` / `attestPayout` — all idempotent (one entry per type/entity; covered by integration tests).
3. Run the nightly reconciliation job (`ledger.reconcile-cron`): a three-way match of DB rows ↔ chain events ↔ Paystack references. Investigate any mismatch before trusting the mirror again.

## During a prolonged outage

- Announce on `/trust` (the simulation-mode banner mechanism) that attestations are delayed; money flows are unaffected.
- Cap: do not switch `SMART_CONTRACT_ADDRESS` mid-outage — a factory swap forks the ledger registry (factory uniqueness is a contract invariant).
