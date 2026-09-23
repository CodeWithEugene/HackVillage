# Security Policy

## Reporting a Vulnerability

**Do not open a public GitHub issue for security vulnerabilities.**

Report security issues directly to the maintainers at
[eugenegabriel.ke@gmail.com](mailto:eugenegabriel.ke@gmail.com). Include:

1. A clear description of the vulnerability and its potential impact
2. Steps to reproduce (or a proof of concept)
3. The URL, endpoint, or contract address affected
4. Any transaction references or interaction hashes, if the issue involves the
   escrow or payout flows

We will acknowledge receipt within **48 hours** and aim to release a fix within
**14 days** for critical issues. Please allow reasonable time for coordinated
disclosure before publishing details of the report.

## Scope

The following are in scope for security reports:

- The web application and its API surface (Next.js route handlers)
- Webhook processing — Paystack signature verification, replay protection
- The escrow and payout engine (`services/escrow/`, `services/payout/`)
- The `PrizeVault` smart contracts and the attestation signer operational
  policy
- Authentication, session handling, and role/permission enforcement

### Security invariants we care about most

If you are probing the platform, these are the invariants the maintainers have
committed to (see `docs/BUILD_PLAN.md` §14 and §10):

- **Idempotency**: no retry, webhook replay, or race condition may ever cause a
  double payout.
- **Fail-closed escrow**: on any payment-provider or network failure, funds
  remain locked in the Prize Vault. No partial or ambiguous money states.
- **Webhook authenticity**: every Paystack webhook is HMAC-verified against the
  raw request body before any state change.
- **Least privilege for the attestation signer**: the key lives only in
  environment configuration, is never committed, and its rotation procedure is
  documented in the runbooks.

## Smart contract security

- The escrow attestation contract is open source specifically so the community
  can audit it. Review it, flag concerns, and open an issue with findings —
  but for exploitable vulnerabilities, use the private reporting channel above.
- Contract changes require a testnet deployment link in the PR and **two
  maintainer approvals** before merge (see `CONTRIBUTING.md`).
- The platform does **not** custody funds on-chain: fiat custody sits with
  Paystack (a licensed PSP); the contract is a tamper-proof public ledger of
  state attestations (ADR-007 in `docs/BUILD_PLAN.md`).
- An independent audit is required before any mainnet deployment. Findings
  from the audit are tracked in the go-live checklist
  (`docs/GO_LIVE_CHECKLIST.md`).
- **Attester key operations**: the platform signer key lives only in
  environment configuration (never in the repo, never in logs). Rotation
  procedure: deploy a new factory + vaults from the new key, verify the
  ledger mirror, then retire the old key — the runbooks
  (`docs/runbooks/chain-outage.md`) cover the ledger-pending mode that
  bridges the rotation window. The contract is immutable by design; there is
  no upgrade path to abuse.

## Preferred languages

We accept reports in English or Swahili.
