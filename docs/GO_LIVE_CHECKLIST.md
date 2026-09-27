# Go-Live Checklist (v1.0 Launch)

The gate before the first production event. Every box is verified in a real environment — staging-verified items are marked.

> **2026-09-27 remediation progress** (code landed, not yet verified in a real
> environment — no boxes ticked by this work):
> - Security headers shipped in `next.config.ts`: CSP, HSTS (2y, preload), `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `frame-ancestors 'none'`; `X-Powered-By` off.
> - Coverage gate wired: `pnpm test:coverage` runs in CI with thresholds on `services/escrow/**` + `services/payout/**` (floor 75 lines/95 functions, ratcheting toward 90 — plan §14).
> - Health endpoint live at `GET /api/health` (db + queue probes, port modes, uptime; 200/503).
> - Rate limiting is DB-backed (`RateLimitBucket`) with per-IP secondary limits on auth actions; mutation API routes throttled 30/h/user.
> - Sentry wired (DSN-gated no-op until `SENTRY_DSN`/`NEXT_PUBLIC_SENTRY_DSN` are set — feeds the §4 Sentry box).
> - Script guards: dev/ops scripts refuse non-localhost `DATABASE_URL` without `--allow-prod`.
> - Simulation in prod now requires the explicit `PAYSTACK_ALLOW_SIMULATION_IN_PROD=true` opt-in (fail closed otherwise).

## 1. Legal & Compliance

- [ ] Paystack **live** account verified (business KYB on the Paystack side) — test keys swapped for live in all environments.
- [ ] Legal review of the escrow model complete (R5, plan §19): funds custodied by the licensed PSP; platform never holds float. Sign-off recorded.
- [ ] Paystack KYB on the platform org (Technetium Kenya — D7) — the org row flipped to `VERIFIED` through the real KYB review, not a manual DB edit.
- [ ] Kenya DPA 2019: privacy policy page live listing processors (Vercel, Neon, Paystack, Cloudflare, Brevo, Polygon); data-export + delete-account paths tested end to end.
- [ ] Terms of Service published (payout obligations, dispute process, IP defaults per event rules).

## 2. Money Path (the launch blocker)

- [ ] Live-mode webhook received and verified against a real KES 1 test deposit (HMAC green in logs, `WebhookEvent` row with `signatureOk=true`).
- [ ] A live test payout of KES 1 to a real M-Pesa recipient succeeded (transfer webhook → `SUCCEEDED` → `paidAt` set).
- [ ] `PAYSTACK_SECRET_KEY` + webhook secret in Vercel (prod) — never in the repo.
- [ ] Deposit-expiry cron observed running (24h stale deposits → `FAILED`).
- [ ] Payout recovery sweep observed re-driving a `QUEUED` payout without duplicating.
- [ ] Fail-closed drill: kill Paystack (sandbox a fake 500) → payouts land in `MANUAL_REVIEW`, funds stay locked, alert fires. Runbook executed.

## 3. Chain & Ledger

- [ ] `PrizeVaultFactory` deployed to **Polygon Amoy** from a fresh attester wallet; address in `SMART_CONTRACT_ADDRESS` (prod env).
- [ ] A full deposit→lock attestation executed on Amoy (visible on Amoy polygonscan).
- [ ] **Independent contract audit** booked/completed; findings resolved (per CONTRIBUTING: two maintainer approvals on the contracts PR).
- [ ] Mainnet factory deployment — ONLY after the pilot (D6) and audit.
- [ ] Nightly reconciliation job green over 7 consecutive days on staging.

## 4. Infrastructure

- [ ] Vercel production deploy from `main` (squash-merge only).
- [ ] Neon production database with PITR backups; connection pooling on.
- [ ] `DATABASE_URL` configured; `db:deploy` run against prod. (2026-09-27: `DIRECT_URL` removed — the Prisma datasource uses `DATABASE_URL` only; a pooled-vs-direct split can return if Neon migrations ever need it.)
- [ ] Sentry DSN live with alerts (error-rate + the `[payout] MANUAL_REVIEW` log).
- [ ] Vercel Analytics on; Lighthouse mobile perf ≥ 90 on `/` and `/events` (budget: landing ≥ 95 — plan §15).
- [ ] Rate limits sane in prod (auth 5/min/IP is default).

## 5. Product Readiness

- [ ] First Nairobi pilot event partner signed (plan §17 M9) — organizer hand-held through deposit.
- [ ] Seed data REMOVED from prod (the dev demo users are dev-only).
- [ ] `/trust` simulation banner gone (chain mode active).
- [ ] Admin runbooks rehearsed: payout triage, webhook replay, chain outage, disputes (docs/runbooks/).
- [ ] On-call rotation defined for the pilot weekend.

## 6. Post-Pilot (v1.1 planning)

- [ ] Pilot retro: Trust Score measured against the >90% KPI; feed findings into v1.1.
- [ ] Multi-recipient payout splits from declared splits (ADR-013 v1.1 candidate).
- [ ] One-click internship automation depth + Legacy Tracker public stats (v1.1).
