# Security Policy

HackVillage handles data that matters to real communities — participant registrations, event records, prize money, and organizational information. We take the security of the platform seriously and appreciate the efforts of security researchers and community members who help keep it safe.

## Supported Versions

HackVillage is under active development. Security fixes are applied to the latest code on the `main` branch. If you are running a fork or an older snapshot, please update to the latest version before reporting an issue that may already be fixed.

| Version | Supported |
| ------------------ | ------------------ |
| Latest (`main`) | ✅ |
| Older snapshots | ❌ |

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub issues, discussions, or pull requests.**

Instead, use one of these private channels:

1. **GitHub Security Advisories (preferred):** Use the ["Report a vulnerability"](https://github.com/CodeWithEugene/HackVillage/security/advisories/new) feature on this repository. This keeps the report private while we work on a fix.
2. **Email:** Send details to **cyberuhurultd@gmail.com** with the subject line `[SECURITY] HackVillage`.

### What to include

To help us triage and resolve the issue quickly, please include as much of the following as you can:

- A description of the vulnerability and its potential impact
- The affected component (frontend, backend/API, database layer, deployment configuration, etc.)
- Step-by-step instructions to reproduce the issue
- A proof-of-concept, if available
- The URL, endpoint, or contract address affected
- Any transaction references or interaction hashes, if the issue involves the escrow or payout flows
- Any suggested remediation or mitigation

### What to expect

- **Acknowledgement** of your report within **72 hours**
- An initial **assessment and severity triage** within **7 days**
- Regular updates on our progress until the issue is resolved
- Credit in the release notes or advisory once the fix ships, if you would like to be acknowledged

## Scope

The following are in scope:

- The HackVillage application code in this repository (frontend, backend, and API)
- Authentication, authorization, and session handling
- Data exposure or injection issues (XSS, SQL injection, SSRF, etc.)
- Webhook processing — Paystack signature verification, replay protection
- The escrow and payout engine (`services/escrow/`, `services/payout/`)
- The `PrizeVault` smart contracts and the attestation signer operational policy
- Vulnerabilities in deployment or configuration files committed to this repository

The following are **out of scope**:

- Vulnerabilities in third-party dependencies without a demonstrated impact on HackVillage (please report those upstream)
- Denial-of-service attacks, rate-limiting issues, or volumetric attacks
- Social engineering, phishing, or physical attacks against maintainers or users
- Issues requiring physical access to a user's device

## Security invariants we care about most

If you are probing the platform, these are the invariants the maintainers have committed to (see `docs/BUILD_PLAN.md` §14 and §10):

- **Idempotency**: no retry, webhook replay, or race condition may ever cause a double payout.
- **Fail-closed escrow**: on any payment-provider or network failure, funds remain locked in the Prize Vault. No partial or ambiguous money states.
- **Webhook authenticity**: every Paystack webhook is HMAC-verified against the raw request body before any state change.
- **Least privilege for the attestation signer**: the key lives only in environment configuration, is never committed, and its rotation procedure is documented in the runbooks.

## Smart contract security

- The escrow attestation contract is open source specifically so the community can audit it. Review it, flag concerns, and open an issue with findings — but for exploitable vulnerabilities, use the private reporting channels above.
- Contract changes require a testnet deployment link in the PR and **two maintainer approvals** before merge (see `CONTRIBUTING.md`).
- The platform does **not** custody funds on-chain: fiat custody sits with Paystack (a licensed PSP); the contract is a tamper-proof public ledger of state attestations (ADR-007 in `docs/BUILD_PLAN.md`).
- An independent audit is required before any mainnet deployment. Findings from the audit are tracked in the go-live checklist (`docs/GO_LIVE_CHECKLIST.md`).
- **Attester key operations**: the platform signer key lives only in environment configuration (never in the repo, never in logs). Rotation procedure: deploy a new factory + vaults from the new key, verify the ledger mirror, then retire the old key — the runbooks (`docs/runbooks/chain-outage.md`) cover the ledger-pending mode that bridges the rotation window. The contract is immutable by design; there is no upgrade path to abuse.

## Responsible Disclosure

We ask that you:

- Give us a reasonable amount of time to fix the issue before any public disclosure (we aim for a fix within 90 days of triage)
- Avoid accessing, modifying, or deleting data that does not belong to you while researching
- Avoid actions that could degrade the service for other users
- Act in good faith — we will not pursue legal action against researchers who follow this policy

## Security Best Practices for Contributors

If you contribute to HackVillage, please follow the guidelines in [CONTRIBUTING.md](./CONTRIBUTING.md), in particular:

- Never commit `.env.local` or any file containing real credentials
- Never commit API keys, tokens, or secrets — use environment variables
- Validate and sanitize all user input on the server side
- Keep dependencies up to date and review dependency changes in pull requests

## Preferred languages

We accept reports in English or Swahili.

Thank you for helping keep HackVillage and its community safe.
