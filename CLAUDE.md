# Project Instructions — HackVillage

## What This Is
Open-source infrastructure for high-impact tech events (hackathons) in the African
ecosystem: escrowed prize pools, instant split payouts (50% at win / 50% at milestone),
Proof-of-Work developer portfolios, and organizer accountability tools. Backed by
Technetium Kenya. Repo: github.com/CodeWithEugene/HackVillage

## Current State — IMPORTANT
This repository is **pre-code**. It contains only documentation and a logo
(`README.md`, `CONTRIBUTING.md`, `LICENSE` Apache-2.0, `public/images/`). The entire
application described below is planned, not implemented. `README.md` and
`CONTRIBUTING.md` are the specification source of truth — read both before writing
any code.

Referenced-but-missing files (known gaps, do not assume they exist):
`CODE_OF_CONDUCT.md`, `SECURITY.md`, `.env.example`, `.gitignore`,
`package.json`, CI workflows, issue/PR templates.

## Planned Tech Stack
| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router, React Server Components, SEO-optimized) |
| Backend | Node.js / TypeScript (strict mode, no `any`) |
| Database | PostgreSQL >= 15 |
| Payments | Paystack (M-Pesa + bank transfers, Split API) |
| Ledger | Smart contract on Polygon/Solana (escrow "Prize Vault" state) |
| Auth | NextAuth |

## Planned Structure (from CONTRIBUTING.md)
```
app/                  # Next.js App Router pages/layouts
components/           # Shared React components
lib/                  # Shared utilities, DB client, API helpers
services/escrow/      # Paystack + smart contract calls (HIGH RISK)
services/payout/      # Split disbursement logic (HIGH RISK)
contracts/            # Smart contract source and ABI (HIGH RISK)
db/migrations/  db/seeds/
public/  tests/       # tests mirror source structure
```

## Hard Invariants (escrow layer — highest risk)
- Organizers deposit 100% of the prize pool before an event goes live ("Prize Verified" badge).
- Payout/escrow operations must be **idempotent** — retries must never double-pay.
- **Never remove or weaken rollback logic**: on any Paystack/network failure, funds stay
  locked in the vault. No partial or ambiguous states.
- Escrow/payout/contract changes: open an issue first, require testnet deployment + ABI
  update in PR, and two maintainer approvals to merge.
- Trust Score KPI: >90% of prizes disbursed within 1 hour of event conclusion.

## Code Style (to be enforced once code exists)
- TypeScript everywhere in `app/`, `components/`, `lib/`, `services/` — no plain `.js`.
- `"strict": true`; use `unknown` + narrowing instead of `any`.
- Prefer named exports; prefer Server Components (`"use client"` only when needed).
- No data fetching in client components — use Server Components or Route Handlers.
- All external API calls (Paystack, RPC) wrapped in try/catch with explicit error types.
- One responsibility per service function.

## Git & Commits
- Conventional Commits: `<type>(<scope>): <summary>`; types `feat|fix|docs|style|refactor|test|chore|perf|ci`;
  scopes `escrow|payout|profiles|events|auth|db|contracts|ui|api|docs`.
- Branches: `main` (protected, PR-only), `develop` (integration), `feature/`, `fix/`, `chore/`, `docs/` from `develop`.
- Squash on merge; never commit directly to `main`/`develop`.
- Never commit `.env.local` or real credentials.

## Testing (once code exists)
- `npm test` / `npm run test:unit` / `npm run test:e2e` (e2e needs running dev server).
- Every function in `services/escrow/` and `services/payout/` needs unit tests.
- Failure/rollback paths must be covered. Paystack integration tests use recorded
  fixtures (no live calls in CI); contract tests run on local hardhat/anchor node.
