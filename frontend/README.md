# Frontend

Next.js 14 App Router UI for HackVillage — event discovery, organizer/developer surfaces, and PWA installability.

This package is **not installed separately**. Always work from the **repository root**.

## Stack

- Next.js 14 (App Router, Server Components)
- TypeScript (strict)
- Progressive Web App via `@ducanh2912/next-pwa`
- Route Handlers under `app/api/` for HTTP entry points

## Layout

```
frontend/
├── app/              # Pages, layouts, manifest, API routes
│   ├── api/          # Thin HTTP adapters — call @backend/*, don't put business logic here
│   ├── events/
│   ├── offline/      # PWA offline fallback
│   ├── layout.tsx
│   ├── manifest.ts   # Web app manifest
│   └── page.tsx
├── components/       # Shared React components
├── public/           # Static assets, PWA icons
├── next.config.mjs
└── tsconfig.json
```

## Setup

From the repo root (not this folder):

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

| Script (root) | What it does |
|---|---|
| `npm run dev` | Start Next.js pointing at `./frontend` |
| `npm run build` | Production build |
| `npm start` | Serve the production build |
| `npm run lint` | ESLint across frontend + backend |
| `npm run typecheck` | TypeScript check for the whole repo |

## Importing backend code

Use the `@backend/*` alias for domain logic. Keep Route Handlers thin:

```ts
import { lockPrizePool } from "@backend/services/escrow";
```

Do **not** call Paystack, RPC, or Prisma directly from components. Go through `app/api/` → `@backend/services/...`.

Within the frontend, use `@/*` for local paths (e.g. `@/components/...`).

## PWA

- Manifest: `app/manifest.ts`
- Icons: `public/icons/`
- Service worker: generated into `public/` on **production** builds only (`npm run build`)
- Offline page: `/offline`

Local `npm run dev` disables the service worker so hot reload stays predictable. Test installability with a production build.

## Conventions

- Prefer Server Components; add `"use client"` only when you need browser APIs or event handlers
- No data fetching in client components — use Server Components or Route Handlers
- UI-only PRs should stay under `frontend/` and `tests/` for any UI-related coverage

See the root [CONTRIBUTING.md](../CONTRIBUTING.md) for branching, commits, and PR rules.
