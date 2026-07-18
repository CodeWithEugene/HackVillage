# Backend

Domain services, data layer, and financial engines for HackVillage — escrow, payouts, Prisma/PostgreSQL, and public-ledger stubs.

This package is **not installed separately**. Always work from the **repository root**.

## Stack

- Node.js / TypeScript
- PostgreSQL via Prisma
- Paystack (fiat deposits & M-Pesa/bank payouts) — stubs today
- Smart contract / public ledger layer — stubs in `contracts/`

## Layout

```
backend/
├── services/
│   ├── escrow/       # Prize vault lock + release authorization
│   └── payout/       # Idempotent split disbursement (50% / 50%)
├── contracts/        # ABI stubs + public ledger recording helpers
├── lib/
│   ├── db.ts         # Prisma client singleton
│   └── env.ts        # Required environment accessors
├── prisma/
│   └── schema.prisma # Source of truth for the data model
└── db/
    ├── migrations/   # Produced by `npm run db:migrate`
    └── seeds/        # Local demo data
```

## Setup

From the repo root (not this folder):

```bash
npm install
cp .env.example .env.local
```

Set at least:

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `PAYSTACK_SECRET_KEY` | Paystack secret (`sk_test_...` locally) |
| `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` | Paystack public key |
| `SMART_CONTRACT_ADDRESS` | Deployed escrow contract (stub ok locally) |
| `RPC_URL` | Chain RPC endpoint |

Then:

```bash
npm run db:migrate   # create/apply migrations
npm run db:seed      # optional demo organizer + Prize Verified event
npm run db:studio    # browse data in Prisma Studio
```

| Script (root) | What it does |
|---|---|
| `npm run db:generate` | Regenerate Prisma Client |
| `npm run db:migrate` | Dev migrations against `backend/prisma/schema.prisma` |
| `npm run db:push` | Push schema without a migration (prototyping only) |
| `npm run db:seed` | Seed demo rows |
| `npm test` | Unit tests (escrow/payout stubs live under `/tests`) |

## How frontend talks to backend

HTTP enters through `frontend/app/api/*` Route Handlers. Those handlers import services with `@backend/...`:

```ts
import { disburse } from "@backend/services/payout";
import { prisma } from "@backend/lib/db";
```

Keep Paystack and chain calls inside `services/` so UI and Route Handlers never own money-moving logic.

## Escrow & payout rules (hard invariants)

1. **No escrow, no live event** — only `PRIZE_VERIFIED` / vault-locked events go live.
2. **Rollback on failure** — if Paystack or the network fails, funds stay locked. No ambiguous partial states.
3. **Idempotent payouts** — every disbursement needs an `idempotencyKey`; retries must never double-pay.
4. **Public ledger** — deposit, instant 50%, and milestone 50% are recorded for transparency.

Escrow/payout/contract changes need an issue first and two maintainer approvals. Details: [Working with the Escrow Layer](../CONTRIBUTING.md#working-with-the-escrow-layer).

## Testing

Service tests live in the root `tests/` folder (not inside this directory):

```bash
npm run test:unit
```

Every new function in `services/escrow/` or `services/payout/` needs unit coverage, including failure/rollback paths.

## Conventions

- TypeScript only; no `any`
- One responsibility per service function
- Wrap external APIs (Paystack, RPC) in explicit error types
- Prefer extending stubs with real integrations rather than calling vendors from elsewhere

See the root [CONTRIBUTING.md](../CONTRIBUTING.md) for branching, commits, and PR rules.
