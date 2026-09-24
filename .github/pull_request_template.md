## Summary

<!-- What changed, in one or two sentences. -->

## Motivation

<!-- The WHY, not just the what. Link the issue: "Closes #N" -->

## What changed

-

## Test plan

<!-- How you verified this works. For escrow/payout changes, state that they
     were manually tested against the Paystack test environment. -->

## Checklist

- [ ] Code follows the style guidelines in `CONTRIBUTING.md`
- [ ] New and changed code is covered by tests (`pnpm test` passes)
- [ ] No secrets, credentials, or `.env` files are included
- [ ] Changes to `services/escrow/`, `services/payout/`, or `contracts/`:
      manually tested against the Paystack test environment, and this PR has
      **two maintainer approvals**
- [ ] Smart contract changes: ABI updated + tested on a testnet (link to the
      verified contract in the PR description)
- [ ] Payout/escrow operations remain idempotent (retries can never double-pay)
- [ ] Rollback logic is not weakened (funds stay locked on any failure)
