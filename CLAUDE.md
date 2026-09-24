# Project Instructions — HackVillage

## What This Is
Open-source infrastructure for high-impact tech events (hackathons) in the African
ecosystem: escrowed prize pools, instant split payouts (50% at win / 50% at milestone),
Proof-of-Work developer portfolios, and organizer accountability tools. Backed by
Technetium Kenya. Repo: github.com/CodeWithEugene/HackVillage

## Current State

**v1.0 is live in production at https://www.hackvillage.xyz** (Vercel + Neon Postgres).
All 10 phases (0–9) are complete, merged to `main` via PRs #2–#12, and deployed.

- **Production**: `main` branch → auto-deploys to Vercel → https://www.hackvillage.xyz
- **Integration**: `dev` branch → preview deployments
- **CI**: GitHub Actions — lint, typecheck, unit+integration tests (against a real
  Postgres service), Hardhat contract tests, build — all green on `main` and `dev`
- **Database**: Neon Postgres (`hackvillage` database, all 9 migrations applied,
  seeded with demo data)
- **Demo accounts**: `organizer@hackvillage.dev` / `wanjiku@hackvillage.dev` /
  `judge@hackvillage.dev` — password `demopass123`

**Payments run in simulation mode** (no Paystack live keys configured). Deposits
complete via the dev checkout, payouts via the simulated transfer port. The `/trust`
page shows attestations from the simulated chain. See `docs/GO_LIVE_CHECKLIST.md`
for the remaining external launch gates (Paystack live keys, Amoy deployment +
audit, legal sign-off, Nairobi pilot).

## Tech Stack
| Layer | Technology |
|---|---|
| Frontend | Next.js 15.5 (App Router, React Server Components, SEO-optimized) |
| Backend | Node.js / TypeScript (strict mode, no `any`) |
| Database | Neon PostgreSQL + Prisma 6 (`db/schema.prisma`; migrations in `db/`) |
| Jobs | pg-boss (Postgres-backed queue, `lib/queue.ts`) |
| Payments | Paystack port (`lib/ports/paystack.ts`) — simulation mode without live keys |
| Ledger | `PrizeVault` attestation contract on Polygon (ADR-007) — simulation without RPC |
| Auth | Auth.js v5, JWT sessions with DB re-verification (revocation preserved) |
| Styling | Tailwind CSS v4, tokens in `app/globals.css` (brand `#FFED00` / ink `#222`) |
| Storage | Cloudflare R2 (SigV4 presigned PUTs in prod, local dir in dev) — ADR-009 |

## Repository Structure
```
app/                  # Next.js App Router pages/layouts
components/           # Shared React components (ui/ primitives, patterns/, domain/)
lib/                  # Auth, DB, queue, env, ports (paystack, chain, mail, storage)
services/
  ├── escrow/         # Deposits, vault, webhook, attestations, reconcile (HIGH RISK)
  ├── payout/         # 50/50 engine, tranches, milestones (HIGH RISK)
  ├── judging/        # Rubrics, scoring, feedback gate, results
  ├── media/          # 48h deadline, trust events, notifications
  ├── legacy/         # 3-month check-ins, disputes
  └── pow/            # Endorsements, portfolio, hiring intros
contracts/            # PrizeVault.sol + PrizeVaultFactory.sol (Hardhat)
db/
  ├── schema.prisma   # Single source of truth for the data model
  ├── migrations/     # 0_init through 8_legacy_disputes
  └── seeds/          # Nairobi demo data
tests/
  ├── unit/           # Pure logic (handles, RBAC, fee math, trust, judging)
  └── integration/    # Live Postgres (escrow, webhooks, payouts, judging, media, legacy)
docs/
  ├── BUILD_PLAN.md   # The build contract — 21 sections, all decisions locked
  ├── GO_LIVE_CHECKLIST.md
  └── runbooks/       # Payout triage, webhook replay, chain outage, disputes
```

## Hard Invariants (escrow layer — highest risk)
- Organizers deposit 100% of the prize pool before an event goes live ("Prize Verified" badge)
- Payout/escrow operations must be **idempotent** — retries must never double-pay
  (structural: unique `{winnerId}:{tranche}` key + conditional claim + webhook replay guard)
- **Never remove or weaken rollback logic**: on any Paystack/network failure, funds stay
  locked in the vault. No partial or ambiguous states.
- Escrow/payout/contract changes: open an issue first, require testnet deployment + ABI
  update in PR, and two maintainer approvals to merge.
- Trust Score KPI: >90% of prizes disbursed within 1 hour of event conclusion.

## Code Style (enforced — CI runs lint + typecheck)
- TypeScript everywhere in `app/`, `components/`, `lib/`, `services/` — no plain `.js`
- `"strict": true`; use `unknown` + narrowing instead of `any`
- Prefer named exports; prefer Server Components (`"use client"` only when needed)
- No data fetching in client components — use Server Components or Route Handlers
- All external API calls (Paystack, RPC) wrapped in try/catch with explicit error types
- One responsibility per service function

## Git & Commits
- Conventional Commits: `<type>(<scope>): <summary>`
- Types: `feat|fix|docs|style|refactor|test|chore|perf|ci`
- Scopes: `escrow|payout|profiles|events|auth|db|contracts|ui|api|docs|ci`
- Branches: `main` (protected, production), `dev` (integration), `feature/`, `fix/`
- Never commit directly to `main`; always PR
- Never commit `.env*` files or real credentials

## Testing
- `npm test` — 156 tests (19 suites: unit + integration against live Postgres)
- `npm run contracts:test` — 9 Hardhat tests (every contract transition)
- `npm run load:test` — judging-rush load test (reads, auth burst, webhook rejects)
- Escrow/payout coverage ≥90% lines (CONTRIBUTING gate)
- All integration tests run against a real Postgres — no mocks on money paths

## Key Commands
- `npm run dev` — local dev server
- `npm run db:migrate` — apply Prisma migrations
- `npm run db:seed` — seed demo data
- `npm run dev:fund -- <slug>` — fund a pending event through the real escrow path
- `npm run dev:cycle -- <slug>` — drive the full judging → winners → payout cycle
- `npm run build` — production build
