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

**Phase 3 (Escrow Engine) is complete, verified against a live Postgres, and
smoke-tested end to end through the running app**: PrizeVault + factory
contracts (9/9 Hardhat tests on a local chain), Paystack + chain ports with
hard-disabled dev simulation modes (HMAC-SHA512 webhook verification,
constant-time), the deposit engine (KYB gate with admin approval queue,
split deposits, idempotent confirmations — replayed webhooks never
double-flip), webhook pipeline with replay guard, pg-boss v10 job pipeline
(attestations + hourly deposit-expiry cron; queue name == job name exactly),
vault UI, `/trust` public ledger, and the PENDING_DEPOSIT → LIVE transition.
Verified: lint, typecheck, 86 unit+integration tests (~95% escrow coverage),
9 contract tests, production build, plus a live run: seeded event funded
through the dev checkout → vault LOCKED → event LIVE → attestations on
/trust. Auth note: Auth.js v5 requires JWT sessions for the credentials
provider — sessions re-verify against the DB on every request (revocation
preserved). Local dev: Postgres on 5432 (db: hackvillage_dev), demo login
`organizer@hackvillage.dev` / `demopass123`, `npm run dev:fund -- <slug>`.

**Phase 4 (Judging) is complete and verified**: judging data model (migration
5 tables), pure domain (D4 rubric template validation, the structured
feedback gate — one strength + one improvement + one next step, weighted
results with dense tie ranking), judge management (invite by handle with
participation exclusion, accept/decline), rubric editor that locks when
judging opens, the open-judging gate (LIVE → JUDGING after the event ends),
scoring screen (0–10 sliders per weighted criterion, feedback editor),
**server-enforced finalization** — a forged client cannot finalize without
complete scores AND the full feedback gate (proven by integration tests),
post-finalize locks on scores and feedback, and live standings in the
organizer command center counting finalized reviews only. Verified: lint,
typecheck, 104 unit+integration tests, production build, plus a live HTTP
smoke: credentials login as the seeded judge → /judge → team queue.

**Phase 5 (Payouts & Winners) is complete and verified end to end**: payout
data model (migration 6 — Winner, Payout with the ⬤ unique
`{winnerId}:{tranche}` idempotency key, Milestone), Paystack port extensions
(transfer recipients + transfers, simulation failure hooks), the payout
engine (atomic winner announcement with judging-completeness + recipient
gates, idempotent execution with per-attempt references, fail-closed
retry→MANUAL_REVIEW policy, milestone confirmation → SETTLED, admin retry +
mark-paid-with-receipt ops with audit logs, recovery sweep cron), transfer
webhook routing, and all surfaces (recipient onboarding in Settings,
winnings page with tranche timelines, organizer winners console with typed
confirmation over KES 250k, milestone confirmer, admin payments queue with
Trust KPI, public winner strips on event pages, payout attestations on
/trust). Verified: lint, typecheck, 127 tests, production build, plus a
full live cycle via `npm run dev:cycle` — judging → winners → instant 50%
paid → milestone 50% paid → event + vault SETTLED, with winner strips and
ledger entries visible over HTTP.

**Phase 6 (Proof of Work & Career) is complete and verified**: PoW data
model (migration 7 — Endorsement, PortfolioItem with lifecycle tags,
InternshipTag, Introduction), the PoW service (portfolio items materialize
automatically from winning submissions at announcement, judge endorsements
gated to verified winners, platform-derived metrics — events/wins/win
rate/earnings/endorsements, never self-reported), hiring partners (join
flow), one-click introductions anchored on verified wins with accept/decline
and contact exchange. Surfaces: verified metrics + portfolio + endorsements
on public profiles, the judge endorse console, the talent directory, partner
join + requests pages, and the developer intro inbox. Verified: lint,
typecheck, 132 tests, production build, plus the live cycle now proving
announcement → portfolio → endorsement end to end (`npm run dev:cycle`).

Everything else is planned per the build plan phases — build features **in
phase order** (Phase 7 = Media Vault & Trust Scores next: storage, 48h
deadline enforcement, notifications).

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
