# Project Instructions — HackVillage

## What This Is
Open-source infrastructure for high-impact tech events (hackathons) in the African
ecosystem: escrowed prize pools, instant split payouts (50% at win / 50% at milestone),
Proof-of-Work developer portfolios, and organizer accountability tools. Backed by
Technetium Kenya. Repo: github.com/CodeWithEugene/HackVillage

## Current State — IMPORTANT
This repository is **in active build-out** following `docs/BUILD_PLAN.md` — the
build contract. Read it (plus `README.md` and `CONTRIBUTING.md`) before writing
code; all product decisions are locked in its §20 Decision Log.

**Phase 0 (Foundations) is complete and verified**: Next.js 15.5 + strict
TypeScript, Tailwind v4 brand tokens, UI primitives, baseline Prisma identity
schema at `db/schema.prisma`, pg-boss wiring, Vitest + GitHub Actions CI, and
all governance files. Verified green: lint, typecheck, unit tests, production
build (5 routes, 106 kB first-load JS). Live routes: `/` landing, `/events`
stub, system pages (404/error). Branch: `feature/phase-0-foundations`.

Everything else is planned per the build plan phases — build features **in
phase order** (Phase 1 = Auth.js identity + onboarding next).

## Tech Stack (live)
| Layer | Technology |
|---|---|
| Frontend | Next.js 15 (App Router, React Server Components, SEO-optimized) |
| Backend | Node.js / TypeScript (strict mode, no `any`) |
| Database | PostgreSQL + Prisma 6 (`db/schema.prisma`; migrations in `db/`) |
| Jobs | pg-boss (Postgres-backed queue, `lib/queue.ts`) |
| Payments | Paystack (M-Pesa + bank transfers) — ports in `lib/ports/` from Phase 3 |
| Ledger | `PrizeVault` attestation contract on Polygon (Amoy first) — ADR-007 |
| Auth | Auth.js v5, database sessions (Phase 1) |
| Styling | Tailwind CSS v4, tokens in `app/globals.css` (brand `#FFED00` / ink `#222`) |

## Repository Structure (Phase 0 live; services/ and contracts/ land in Phases 2–3)
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

## Code Style (enforced — CI runs lint + typecheck)
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

## Testing
- `npm test` (Vitest) / `npm run db:seed` / e2e arrives with later phases (Playwright).
- Unit tests live in `tests/unit/` mirroring source structure.
- Every function in `services/escrow/` and `services/payout/` needs unit tests.
- Failure/rollback paths must be covered. Paystack integration tests use recorded
  fixtures (no live calls in CI); contract tests run on local hardhat/anchor node.
