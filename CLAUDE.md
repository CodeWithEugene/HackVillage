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

**Phase 1 (Identity & Profiles) is complete and verified**: Auth.js v5
(credentials + conditional Google/GitHub OAuth, database sessions), email
verification + password reset (Resend with dev console fallback), adapter
assigning handles/primaryRole to OAuth users, server-side RBAC guards,
signup/signin/verify-email/forgot/reset pages, onboarding wizards (developer
profile, org create/join via 7-day invite codes), authenticated app shell
(dashboard, profile editor, settings with soft-delete deactivation, organizer
overview), and public `/developers` + `/developers/[handle]` profiles.
Verified green: lint, typecheck, 39 unit tests, production build.

**Phase 2 (Events & Teams) is complete and verified**: events & teams data
model (migration 2), the event lifecycle state machine (DRAFT → PENDING_DEPOSIT
only in this phase — zero money code), organizer 5-step event wizard with
draft editing and a publish gate (min pool KES 10,000, Decision D3), public
browse with filters + event detail with Prize Verified / pending-deposit
states and status timelines, developer registration (plain-form API
endpoints — no client JS), team creation/invites by handle & code
(5-member cap), and the team workspace with submissions incl. the ADR-013
prize-split declaration (must sum to 100%). Dashboards (my events, my
teams), organizer command center (registrations, teams & submissions), and
a DB-granted-ADMIN console. Seed: realistic Nairobi demo (`npm run db:seed`,
password `demopass123`). Verified green: lint, typecheck, 64 unit tests,
production build.

Everything else is planned per the build plan phases — build features **in
phase order** (Phase 3 = Escrow Engine next: Paystack deposits + PrizeVault
contract on Amoy).

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

## Repository Structure (Phases 0–2 live; services/escrow lands in Phase 3, contracts in Phase 3)
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
