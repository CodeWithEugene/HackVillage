# HackVillage — End-to-End Build Plan

**Version**: 1.1 (All v1.0 decisions locked — see §20 Decision Log)
**Scope**: Everything from empty repo to launched v1.0 platform — identity, events, escrow, payouts, judging, Proof-of-Work profiles, media vault, trust scores, career matching, admin, and launch hardening.
**Source of truth**: `README.md` (product spec) + `CONTRIBUTING.md` (process spec) + this document (build spec).

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Product Definition](#2-product-definition)
3. [Design Principles](#3-design-principles)
4. [System Architecture](#4-system-architecture)
5. [Architecture Decision Records](#5-architecture-decision-records)
6. [Data Model](#6-data-model)
7. [Complete Page & Route Map](#7-complete-page--route-map)
8. [Modals, Popups & System-State Inventory](#8-modals-popups--system-state-inventory)
9. [API Surface](#9-api-surface)
10. [The Escrow & Payout Engine](#10-the-escrow--payout-engine)
11. [Smart Contract Design](#11-smart-contract-design)
12. [Background Jobs & Scheduled Workflows](#12-background-jobs--scheduled-workflows)
13. [Design System](#13-design-system)
14. [Security & Compliance](#14-security--compliance)
15. [Testing Strategy](#15-testing-strategy)
16. [Infrastructure & DevOps](#16-infrastructure--devops)
17. [Build Phases & Milestones](#17-build-phases--milestones)
18. [Workflow Registry](#18-workflow-registry)
19. [Risk Register](#19-risk-register)
20. [Decision Log](#20-decision-log)
21. [Appendix](#21-appendix)

---

## 1. Executive Summary

HackVillage is a platform where **money is provably real before an event starts**. The core loop:

1. Organizer creates an event and deposits **100% of the prize pool** into the Prize Vault (Paystack fiat + smart-contract attestation).
2. Only "Prize Verified" events go live. Developers browse, register, form teams, build, and submit.
3. When winners are announced, **50% pays out instantly** (M-Pesa/bank via Paystack Transfers); the final 50% releases when the organizer confirms milestone handover.
4. Every deposit and payout lands on a **public blockchain ledger**. Every event produces **Proof-of-Work profiles** (win rates, GitHub contributions, judge endorsements) that hiring partners can act on.

This plan specifies the full build: personas, design principles, architecture with recorded trade-offs, the complete database schema, **every page, modal, and system state**, the API surface, the escrow/payout state machines with failure paths, the smart contract, the design system, security/compliance, testing, and a phased delivery roadmap (10 phases, ~16–20 weeks solo, compressible with help) with acceptance criteria per phase.

**What v1.0 must nail (in priority order):**
1. The money never lies, never double-pays, never disappears. (Escrow engine + idempotency + rollback)
2. A developer can go from signup → team → submission → winnings in their bank account with zero human hand-holding.
3. Trust is visible everywhere — Prize Verified badges, state timelines, public ledger links.
4. Mobile-first: the primary device is a mid-range Android on 3G/4G in Nairobi.

---

## 2. Product Definition

### 2.1 Actors & Roles

The platform uses **capability roles, not account types**. One user may hold several roles (a developer can also organize events). Sign-up asks for a *primary role* only to route onboarding; roles are addable later.

| Role | What they do | Success looks like |
|---|---|---|
| **Guest** | Browse events, profiles, public ledger | Understands the trust model in <60s on landing page |
| **Developer** | Register for events, form/join teams, submit, receive payouts, build PoW profile | Wins event, 50% lands within the hour, profile gains verified endorsement |
| **Organizer** | Create org, create events, deposit prize pool, manage event, announce winners, upload media in 48h, confirm milestones | Event sells out; trust score rises; winners paid same day |
| **Judge** | Score teams against rubric, submit ≥3 structured feedback points | Feedback finalized before scores unlock |
| **Hiring Partner** | Browse verified winners, request one-click intros | Intro request accepted within a week |
| **Admin** (platform staff) | KYC ops, payout failure ops, disputes, ledger verification, trust adjustments | Zero unresolved payout failures >24h |

### 2.2 Core Jobs-to-be-Done

- **Developer**: "Show me hackathons where winning actually pays — and turn my wins into a career."
- **Organizer**: "Let me prove my prize pool is real so top developers show up — and handle payouts/feedback/media without spreadsheets."
- **Hiring Partner**: "Show me pre-verified talent with receipts, not résumés."
- **Platform**: "Keep every shilling accounted for and every promise visible."

### 2.3 The Three Non-Negotiable Pillars (from README)

1. **Instant Reward Protocol** — no deposit, no live event; 50/50 split payout.
2. **Developer Value Beyond the Prize** — PoW profiles + career brokering.
3. **Stakeholder Quality Guarantee** — production-ready outputs, media within 48h, ≥3 feedback points per team, legacy tracking.

### 2.4 KPIs (instrumented in-product)

| KPI | Definition | Goal | Where measured |
|---|---|---|---|
| Trust Score | % of prizes disbursed within 1h of winners announcement | >90% | Payout service metrics + admin dashboard |
| Media Momentum | Time from event end to photo gallery live | <48h | Media deadline job |
| Conversion Rate | Winners landing interviews/internships via platform | Tracked per cohort | Introduction records |
| Legacy Rate | Submissions alive as products at 3-month check-in | Tracked per cohort | Legacy check-in records |

---

## 3. Design Principles

These are the rules every screen, API, and contract must obey. They are ordered — when two conflict, the earlier one wins.

### P1 — Trust is the product.
Every page answers two questions: *is the money real?* and *what happens next, and who owes it?* Prize status is never more than one glance away on any event surface.

### P2 — Money states are explicit, atomic, and public.
Funds are always in exactly one named state (`AWAITING_DEPOSIT → LOCKED → HALF_RELEASED → SETTLED / REFUNDED`). No partial or ambiguous states (README invariant). State changes are single DB transactions + one on-chain attestation, visible on `/trust`.

### P3 — Idempotency everywhere money moves.
Every payout/escrow operation carries a unique idempotency key enforced by a DB unique constraint *and* passed to Paystack. Retries can never double-pay. Webhook replays are safe.

### P4 — Fail closed.
On any error (Paystack failure, network timeout, RPC outage), funds stay locked and the operation returns to a retryable state with an alert. **Never** auto-release on uncertainty. Rollback logic is never weakened (CONTRIBUTING hard rule).

### P5 — Mobile-first, M-Pesa-native.
Design for a mid-range Android on 3G/4G: ≤200KB critical-path JS, server components by default, tap targets ≥44px, M-Pesa payout as a first-class flow (most winners will want mobile money, not bank).

### P6 — Server-first rendering.
React Server Components everywhere possible; `"use client"` only for interactivity (forms, modals, real-time). Data fetching never happens in client components (CONTRIBUTING rule).

### P7 — Every async flow has a visible state.
Loading (skeletons), empty (illustration + one CTA), error (human text + retry + support link), success (confirmation with receipt). No spinners without explanation; no silent polling.

### P8 — Accessibility is a feature, not a pass.
WCAG 2.1 AA: keyboard-first navigation, visible focus (brand yellow ring), ARIA live regions for money-state toasts, color contrast checked (yellow `#FFED00` always carries `#222` ink text — never white on yellow).

### P9 — Type safety is the contract.
Strict TypeScript end to end; Prisma-generated DB types; zod-validated boundaries (server actions, webhooks, env); `unknown` + narrowing over `any` (CONTRIBUTING rule).

### P10 — Open by default.
The ledger, judging logic, and escrow mechanics are public (open-source core). Admin actions that affect trust are logged immutably in `audit_log`.

### P11 — Small, observable releases.
Every phase ends in a demoable increment with acceptance criteria (Section 17). No phase >3 weeks.

### P12 — One shilling of design polish beats ten of lorem ipsum.
No screen ships with placeholder content. Empty states, error states, and edge cases are *designed*, not left to whoever hits them first.

---

## 4. System Architecture

### 4.1 High-Level Diagram

```
                                   ┌──────────────────────────────┐
                                   │        USERS / BROWSERS       │
                                   │   (mobile-first web app)      │
                                   └──────────────┬───────────────┘
                                                  │ HTTPS
                                   ┌──────────────▼───────────────┐
                                   │   NEXT.JS 15 APP (Vercel)     │
                                   │  ┌────────────────────────┐  │
                                   │  │ app/  (RSC pages,       │  │
                                   │  │       route handlers)   │  │
                                   │  ├────────────────────────┤  │
                                   │  │ components/ (design sys)│ │
                                   │  ├────────────────────────┤  │
                                   │  │ lib/ (auth, db, util)   │  │
                                   │  ├────────────────────────┤  │
                                   │  │ services/               │  │
                                   │  │  ├── events/            │  │
                                   │  │  ├── escrow/   ◄─ HARD  │  │
                                   │  │  │   BOUNDARY            │  │
                                   │  │  ├── payout/   ◄─ HARD   │  │
                                   │  │  │   BOUNDARY            │  │
                                   │  │  ├── judging/           │  │
                                   │  │  ├── profiles/          │  │
                                   │  │  ├── media/             │  │
                                   │  │  └── trust/             │  │
                                   │  └────────────────────────┘  │
                                   └───┬───────┬────────┬─────────┘
                                       │       │        │
                    ┌──────────────────┘       │        └─────────────────┐
                    │                          │                             │
        ┌───────────▼──────────┐   ┌───────────▼───────────┐    ┌────────────▼───────────┐
        │  POSTGRES (Neon)     │   │  PAYSTACK (fiat rails) │    │  POLYGON (attestation │
        │  · app data          │   │  · Checkout (deposit) │    │  ledger — PrizeVault  │
        │  · pg-boss job queue │   │  · Transfers (M-Pesa/ │    │  contract, Amoy first)│
        │  · ledger mirror     │   │    bank payouts)      │    └────────────────────────┘
        └───────────┬──────────┘   │  · Split Payments     │
                    │              │  · Webhooks (HMAC)     │
        ┌───────────▼──────────┐  └───────────┬───────────┘
        │  CLOUDFLARE R2        │              │ webhook
        │  · media vault        │◄─────────────┘ (deposit/transfer
        │  · submission files   │                confirmations)
        └──────────────────────┘
        ┌──────────────────────┐   ┌──────────────────────────┐
        │  RESEND (email)      │   │  SENTRY (errors, traces) │
        └──────────────────────┘   └──────────────────────────┘
```

### 4.2 Bounded Contexts (domain map)

| Context | Owns | Key invariants |
|---|---|---|
| **Identity** | Users, roles, sessions, orgs, memberships | A user's roles are additive; org actions require active membership |
| **Events** | Event lifecycle, registrations, teams, problem statements | Event cannot be `LIVE` unless a `LOCKED` deposit ≥ declared pool exists |
| **Escrow** (hard boundary) | Deposits, vault state, on-chain attestations | State machine in §10.2; all writes idempotent; fail-closed |
| **Payout** (hard boundary) | Winners, payout tranches, recipients, transfers | One idempotency key per tranche; unique constraint; no double-pay |
| **Judging** | Judges, rubrics, scores, feedback | Scores cannot finalize until every judge submits ≥3 feedback points per team |
| **ProofOfWork** | Developer profiles, endorsements, portfolio, lifecycle tags | Profile metrics derive only from platform-verified events |
| **Trust** | Trust events (penalties/bonuses), organizer scores | Every score change has an auditable `trust_event` record |
| **Media** | Media assets, 48h deadline, gallery | Deadline enforcement via scheduled job, not organizer goodwill |
| **Career** | Internship tags, hiring partners, introductions | Intros require a verified win as the anchor |
| **LedgerMirror** | Chain event cache for the public `/trust` page | Mirror is derived data; chain is truth |

**Dependency direction**: `app/ → services/* → lib/ (domain)`. Domain logic in `lib/domain/` never imports route handlers or vendor SDKs; vendor SDKs (Paystack, ethers, R2) are wrapped in `lib/ports/` (anti-corruption layer) so services depend on interfaces, not SDKs. The escrow and payout services expose their functionality only through exported service functions — no other module may import Paystack/ethers directly.

### 4.3 Repo Layout (build target)

```
HackVillage/
├── app/                      # Next.js App Router
│   ├── (marketing)/          # Public, SEO-optimized routes
│   ├── (auth)/               # signin/signup/reset
│   ├── (app)/                # Authenticated role dashboards
│   ├── admin/
│   └── api/                  # Route handlers (REST + webhooks)
├── components/
│   ├── ui/                   # Design-system primitives (shadcn/ui base)
│   └── patterns/             # Composed patterns (EventCard, VaultStatus…)
├── lib/
│   ├── domain/               # Pure business logic (state machines, policies)
│   ├── ports/                # Vendor interfaces: paystack, chain, storage, mail
│   ├── db/                   # Prisma client + generated types
│   ├── auth/                 # Auth.js config, RBAC helpers
│   ├── env.ts                # zod-validated environment
│   └── utils/
├── services/
│   ├── events/  ├── escrow/  ├── payout/  ├── judging/
│   ├── profiles/ ├── media/  ├── trust/    └── career/
├── contracts/                # Hardhat project (PrizeVault)
├── db/
│   ├── migrations/  └── seeds/
├── tests/
│   ├── unit/  ├── integration/  └── e2e/   # mirrors source structure
├── public/images/
└── docs/                     # This plan + workflow specs
```

---

## 5. Architecture Decision Records

Each ADR records context → decision → trade-offs. Revisit only with a superseding ADR.

### ADR-001: Modular monolith (not microservices) with hard service boundaries
**Context**: README sketches an "escrow microservice". Solo/small team; event-day traffic is spiky but modest initially.
**Decision**: One Next.js deployment. `services/escrow` and `services/payout` are *hard boundaries* — callable only via their exported functions, owning their tables, with vendor access exclusively through `lib/ports/`. Extraction to a real service later is a deployment change, not a rewrite.
**Trade-offs**: ✅ one deploy pipeline, one DB transaction boundary (critical for escrow atomicity), zero service-mesh overhead. ❌ a bad actor *could* import across the boundary — mitigated by ESLint `no-boundary-imports` rule + code review (2 maintainer approvals per CONTRIBUTING).

### ADR-002: Next.js 15 App Router + React Server Components
**Context**: README specifies Next.js 14; SEO-optimized discovery is a core requirement; Kenya is mobile/low-bandwidth.
**Decision**: Next.js 15 (latest stable) App Router, RSC-first, route handlers for the REST surface, server actions for mutations where they reduce client JS. The "14" badge in README is cosmetic; 15 is API-compatible for everything we use.
**Trade-offs**: ✅ streaming, partial prerendering, less client JS, first-class metadata API for SEO. ❌ RSC mental-model cost; some libs are client-only (Paystack inline JS) — isolated in small client islands.

### ADR-003: PostgreSQL + Prisma
**Context**: Structured Proof-of-Work records, transactional escrow state, migrations required by CONTRIBUTING.
**Decision**: Postgres 16 (Neon serverless in prod, Docker locally) + Prisma ORM with migration workflow (`npm run db:migrate`), seeds for demo events.
**Trade-offs**: ✅ typed client, migration history, single source of schema truth, prisma-level transactions for escrow atomicity. ❌ Prisma adds a codegen step and mild cold-start weight on serverless — acceptable; Neon handles pooling.

### ADR-004: pg-boss for background jobs
**Context**: Payouts, retries, deadline watchers, and 3-month check-ins need durable scheduling. CONTRIBUTING forbids double-payouts — retries must be durable and inspectable.
**Decision**: pg-boss (Postgres-backed queue) inside the same Postgres. Job families: `payout.execute`, `payout.retry`, `escrow.attest`, `media.deadline-check` (cron), `legacy.checkin` (cron), `webhook.replay`.
**Trade-offs**: ✅ one fewer infra dependency (no Redis), transactional enqueue (a payout record and its job commit atomically), built-in retry/backoff/expiry. ❌ throughput ceiling vs Redis-based queues — irrelevant at our scale; migrate to BullMQ only if job lag becomes observable.

### ADR-005: Auth.js v5 (NextAuth) with database sessions + additive role model
**Context**: Need OAuth (Google/GitHub — developers expect it), email/password fallback, email verification, revocable sessions for security incidents.
**Decision**: Auth.js v5; providers: Google, GitHub, credentials (bcrypt via `@node-rs/argon2`… see note). **Database sessions** (not JWT) so admins can revoke. Roles stored on user + membership rows; sensitive server actions re-check roles from DB, never trust client.
**Trade-offs**: ✅ revocation, smaller attack surface than JWT-in-localStorage, simple model. ❌ a DB hit per request — fine at this scale.

### ADR-006: Paystack as the single fiat rail
**Context**: README mandates Paystack: deposits, M-Pesa + bank payouts, KYC/AML compliance layer (CBK requirements).
**Decision**:
- **Deposits**: Paystack Checkout (card/bank) with a per-event reference; webhook `charge.success` is the source of truth for money received.
- **Payouts**: Paystack **Transfers** to *transfer recipients* (bank account or M-Pesa mobile money). Winners pre-register a recipient during the event (before winners are announced).
- **Split disbursement**: modeled in our DB as two tranches per winner (instant/milestone) — we orchestrate sequential Transfers; Paystack Split Payments is used only if/when we need automatic multi-stakeholder splits at deposit time. (Spike in Phase 3 verifies current Split capabilities.)
- All writes carry idempotency keys; all webhooks HMAC-verified (`x-paystack-signature`).
**Trade-offs**: ✅ licensed Kenyan PSP, KYC/AML offloaded, M-Pesa native. ❌ payout speed bounded by Paystack/M-Pesa rails (typically seconds–minutes; our 1h Trust KPI absorbs this), single-vendor risk → the `lib/ports/paystack` interface keeps a swap possible.

### ADR-007: Polygon attestation contract — the chain is the *ledger*, not the custodian
**Context**: README shows fiat funds flowing Paystack-side while the smart contract "locks funds in PRIZE_VAULT state". Custodying stablecoins on-chain would add wallet onboarding friction (contradicts mobile-first) and bigger audit scope.
**Decision**: Solidity `PrizeVault` contract on Polygon PoS (Amoy testnet first): an **attestation state machine** — the backend signs state commitments (deposit locked, instant tranche paid, milestone settled, refunded) and emits public, tamper-proof events. Fiat custody remains with Paystack. `/trust` reads chain events (via RPC) and mirrors them in Postgres for fast UI.
**Trade-offs**: ✅ zero wallet friction for users, tiny audit surface, immutable contract possible. ❌ trust in the platform signer until DAO/multi-sig (v2.0 roadmap) — mitigated by: contract events include the Paystack references so anyone can cross-verify; signer key in env-only access; every attestation corresponds 1:1 with a DB record and webhook receipt. README's "Polygon/Solana" choice resolved to Polygon: EVM tooling (Hardhat/OpenZeppelin), audit ecosystem, low fees.

### ADR-008: Tailwind CSS v4 + shadcn/ui, tokens from brand
**Context**: Solo-friendly design system; brand = yellow `#FFED00` + ink `#222` (from logo).
**Decision**: Tailwind v4 with CSS-first config, shadcn/ui primitives restyled to tokens. See §13.
**Trade-offs**: ✅ a11y-tested primitives in-repo (copy, not dependency), fast iteration. ❌ Tailwind class soup risk — mitigated by `components/patterns/` composition layer and class-variance-authority variants.

### ADR-009: Cloudflare R2 for media & submission files
**Decision**: S3-compatible presigned uploads; images served via Next Image optimization with R2 as loader source. Public galleries served long-cache; originals retained for gallery download.
**Trade-offs**: ✅ zero egress fees (48h Media Vault is photo-heavy), S3 SDK compatibility. ❌ one more vendor — contained behind `lib/ports/storage`.

### ADR-010: Vitest + Playwright + Hardhat/Chai; MSW fixtures for Paystack
**Decision**: Unit/integration = Vitest; E2E = Playwright with a seeded local DB and mocked Paystack (recorded fixtures, no live calls in CI — CONTRIBUTING rule); contracts = Hardhat + Chai on local node. Coverage gate: `services/escrow` + `services/payout` ≥90% lines.
**Trade-offs**: ✅ fast, one assertion style, CONTRIBUTING-compliant. ❌ E2E setup cost — amortized by covering the 5 golden paths only (§15).

### ADR-011: Conventional Commits + commitlint + squash-merge, per CONTRIBUTING
No divergence; enforced with commitlint + GitHub squash-merge setting. Branch model: `main` protected, `develop` integration, `feature/*`, `fix/*`, `chore/*`, `docs/*`.

### ADR-012: Platform fee — 5% of prize pool, organizer-funded, charged at deposit
**Context**: Revenue model was the open §21.2 question blocking Phase 3 checkout amounts. Brand pillar: fees must never touch winner money.
**Decision**: The organizer's deposit is `gross = pool × 1.05` (`PLATFORM_FEE_BPS`, default 500). The vault locks the **pool portion only**; the fee is platform revenue recorded on the Deposit row (`feeKes`). Developers always receive 100% of announced prizes. Refunds for pre-live cancellations return the full gross (pool + fee).
**Trade-offs**: ✅ revenue aligned with the trust actually delivered; trivial math; payouts mathematically untouchable. ❌ organizers price-compare against "free" hackathons — countered by the Prize Verified value proposition; no subscription revenue stream (deliberate, pre-PMF).

### ADR-013: Payouts go to the team leader; intra-team splits declared at submission, settled off-platform (v1)
**Context**: Teams win prizes, but Paystack Transfers pay one verified recipient. Platform-managed multi-recipient splits would multiply recipient-verification ×N and add split-dispute surface to the highest-risk code path.
**Decision**: For v1.0, `Winner.userId` = the team **leader**; each tranche pays the leader's verified recipient **in full**. At submission time the team records a `splitDeclaration` (`[{userId, percent}]`, must sum to 100%, visible to every member, editable until the submission deadline). The declaration is informational in v1 — the platform does not enforce the split.
**Trade-offs**: ✅ one verified recipient per win = smallest payout risk surface; matches hackathon norms (leader distributes). ❌ platform can't enforce intra-team fairness — accepted for v1; Paystack multi-recipient split payouts from the declaration is a v1.1 candidate.

---

## 6. Data Model

Postgres via Prisma. 30 core models grouped by context. `⬤` = hard invariant enforced at schema level.

### 6.1 Identity

```prisma
User            id, email (unique), emailVerifiedAt, passwordHash?, name, handle (unique),
                avatarUrl, primaryRole (DEVELOPER|ORGANIZER), createdAt, updatedAt, deletedAt?
RoleGrant       id, userId → User, role (DEVELOPER|ORGANIZER|JUDGE|HIRING|ADMIN), grantedBy, grantedAt
Session         id, userId, expiresAt, ip, userAgent (Auth.js database sessions)
Organization    id, name, slug (unique), logoUrl, about, ownerId → User, kycStatus (NONE|PENDING|VERIFIED|FAILED),
                trustScore (int, default 100), createdAt
OrgMember       id, orgId, userId, role (OWNER|ADMIN|MEMBER), status (ACTIVE|REVOKED)
DeveloperProfile userId (pk), headline, bio, skills String[], githubLogin, linkedinUrl,
                location, payoutRecipientCode?, payoutMethod (MPESA|BANK)?, winRateCached, updatedAt
```

⬤ `PayoutRecipientCode` is required before a user can be marked a winner (app-level invariant, enforced in payout service).

### 6.2 Events

```prisma
Event           id, orgId, slug (unique), title, summary, problemStatement, rules, venueType (PHYSICAL|ONLINE|HYBRID),
                location, coverUrl, startsAt, endsAt, registrationDeadline, maxTeams, rolesWanted String[],
                status (DRAFT|PENDING_DEPOSIT|LIVE|IN_PROGRESS|JUDGING|WINNERS_ANNOUNCED|SETTLED|CANCELLED|DISPUTED),
                prizeVerifiedAt?, mediaDeadlineAt?, createdAt, updatedAt, publishedAt?
PrizeBreakdown   id, eventId, place (int), label, amountKes (int), milestoneRequired (bool)
EventRoleTag     id, eventId, tag (e.g. FRONTEND|AI|FINTECH|DESIGN)
Registration     id, eventId, userId, status (REGISTERED|WAITLISTED|CANCELLED), createdAt   ⬤ unique(eventId,userId)
Team             id, eventId, name, leaderId, inviteCode (unique), status (OPEN|LOCKED|DISBANDED), createdAt
TeamMember       id, teamId, userId, status (INVITED|JOINED|LEFT|DECLINED)  ⬤ unique(teamId,userId)
Submission       id, teamId, repoUrl, demoUrl?, description, submittedAt, updatedAt,
                splitDeclaration Json?   // [{userId, percent}] — must sum to 100; visible to all members (ADR-013)
```

⬤ **Payout recipients (ADR-013)**: `Winner.userId` is the team **leader**; `splitDeclaration` is the recorded intra-team split — informational in v1, the platform pays the leader in full.

### 6.3 Escrow

```prisma
Deposit         id, eventId, paystackReference (unique), grossAmountKes, poolAmountKes, feeKes, currency, channel,
                status (INITIATED|SUCCEEDED|FAILED|REVERSED), paidAt?, rawWebhook Json, createdAt
VaultState      id, eventId (unique), amountKes, contractAddress, chainState (AWAITING|LOCKED|HALF_RELEASED|SETTLED|REFUNDED),
                lockedAt?, halfReleasedAt?, settledAt?, refundedAt?, lastTxHash
LedgerEntry     id, eventId, type (DEPOSIT_LOCKED|INSTANT_PAYOUT|MILESTONE_PAYOUT|REFUND), payload Json,
                txHash, blockNumber, mirroredAt
```

⬤ An Event may transition to `LIVE` only via `VaultState.chainState == LOCKED` and Σ(poolAmountKes of SUCCEEDED deposits) ≥ declared pool (service-level check inside the same transaction). The fee (`feeKes`, ADR-012) is platform revenue — it never enters the pool and never reduces prizes.

### 6.4 Payout

```prisma
Winner          id, eventId, teamId, place, userId, amountKes, milestoneRequired, announcedAt
Payout          id, winnerId, tranche (INSTANT|MILESTONE), amountKes,
                idempotencyKey (unique), paystackTransferCode?, recipientCode,
                status (QUEUED|PROCESSING|SUCCEEDED|FAILED|REVERSED|MANUAL_REVIEW),
                attemptCount, lastError?, queuedAt, paidAt?
Milestone       id, winnerId, title, description, confirmedBy?, confirmedAt?, dueAt?
```

⬤ `Payout.idempotencyKey` = `{winnerId}:{tranche}` — unique constraint makes double-insert impossible even under race.

### 6.5 Judging

```prisma
JudgeAssignment id, eventId, userId, status (INVITED|ACTIVE|DECLINED), createdAt
Rubric          id, eventId (unique), criteria Json  // [{id,label,weight}]
Score           id, judgeId, teamId, criterionId, value  ⬤ unique(judgeId,teamId,criterionId)
Feedback        id, judgeId, teamId, point, kind (STRENGTH|IMPROVEMENT|NEXT_STEP)
JudgingProgress id, judgeId, teamId, feedbackCount, finalizedAt?   // ≥3 feedback → finalized unlock
```

### 6.6 ProofOfWork & Career

```prisma
Endorsement     id, judgeUserId, developerUserId, eventId, quote, createdAt
PortfolioItem   id, submissionId, developerUserId, title, summary, repoUrl, demoUrl,
                lifecycle (DEMO|IN_PRODUCTION|PIVOTED|ARCHIVED), updatedAt
InternshipTag   id, eventId, kind (INTERNSHIP|APPRENTICESHIP|MENTORSHIP), partnerName, slots
HiringPartner   id, orgId?, userId, companyName, verified
Introduction    id, partnerId, developerUserId, eventId, message, status (REQUESTED|ACCEPTED|DECLINED|EXPIRED)
```

### 6.7 Media, Trust, Legacy

```prisma
MediaAsset      id, eventId, r2Key, url, kind (PHOTO|VIDEO), uploadedBy, uploadedAt, status (PENDING|APPROVED|HIDDEN)
TrustEvent      id, orgId, type (MEDIA_PENALTY|PAYOUT_EXCELLENCE|MANUAL_ADJUST|APPEAL_GRANTED), delta, reason, actorId, createdAt
LegacyCheckin   id, submissionId, dueAt, completedAt?, outcome (STILL_DEMO|IN_PRODUCTION|PIVOTED|ABANDONED), notes
```

### 6.8 Platform

```prisma
Notification    id, userId, type, payload Json, readAt?, createdAt
AuditLog        id, actorId?, action, entity, entityId, meta Json, ip, createdAt   // append-only
WebhookEvent    id, source (PAYSTACK), eventId, signatureOk, payload Json, processedAt?  // replay guard
```

### 6.9 Derived metrics (cached, recomputed by jobs)

- `DeveloperProfile.winRateCached` = wins / events-participated (events with settled judging only).
- `Organization.trustScore` = 100 + Σ TrustEvents (floor 0). Media penalty: −10 per late event; payout excellence: +1 per event hitting the 1h KPI.
- Event card shows: pool size, team count, prize-verified state, organizer score.

---

## 7. Complete Page & Route Map

Route groups mirror the repo layout: `(marketing)` = public/SEO, `(auth)` = unauthenticated identity, `(app)` = authenticated role surfaces, plus `admin/`. Every route lists: **purpose · key elements · states to design**.

### 7.1 Marketing & Public Trust (SEO-critical, server-rendered, ISR)

| Route | Purpose | Key elements | States |
|---|---|---|---|
| `/` Landing | Convert within 60s; teach the trust model | Hero with dual CTA (developers/organizers) · live "Prize Verified" ticker of recent deposits · 3-phase How It Works (Setup→Engagement→Closing) · traditional-vs-HackVillage comparison table (from README) · featured events (3 cards) · payout stats band (total disbursed, median payout time) · organizer trust strip · testimonial section · final CTA · footer (repo, docs, socials) | Logged-in variant swaps hero CTAs for "Go to dashboard" · ticker empty-state shows skeleton |
| `/for-developers` | Developer value prop | Instant payout explainer with timeline · PoW profile mock · career brokering · CTA → `/signup?role=developer` | — |
| `/for-organizers` | Organizer value prop + fee model | Deposit flow diagram · trust benefits · fee card (see §21.2) · CTA → `/signup?role=organizer` | — |
| `/trust` | **Public ledger** — the radical-transparency page | Chain-verified table of all deposits/payouts (event, type, amount band, tx hash → Polygonscan link, timestamp) · filter by event/org · "How verification works" explainer · sync status indicator | Loading: skeleton rows · chain RPC down: DB mirror with "last synced" note |
| `/events` | Browse & filter | Filter bar (status, location, prize range, roles, date) · search · sort (deadline, prize) · EventCard grid (cover, Prize Verified badge, pool size, team count, organizer score, countdown chip) | Empty: "No events match — clear filters or host one" CTA |
| `/events/[slug]` | Event detail — the conversion page | Status timeline (Vault→Live→Judging→Winners→Settled with dates) · problem statement · prize breakdown table · roles wanted · judges · rules · venue/time · organizer card with trust score + past events · register CTA (or "Registered ✓" / "Join a team") · after event: winners strip + media gallery link | Not verified: amber banner "Prize pending verification" · ended: winner + payout status |
| `/developers` | Browse Proof-of-Work profiles | Filter by skill/event/win-status · profile cards (win rate, events, endorsements count) | Empty state for filters |
| `/developers/[handle]` | Public PoW profile | Verified metrics (win rate, events, GitHub contributions/event) · endorsements (attributed to judge+event) · portfolio items with lifecycle badges · "Request intro" button (hiring role) | Unclaimed metrics show "—"; no self-reported stats, platform-verified only |
| `/organizers/[slug]` | Org public trust page | Trust score + history (penalties/bonuses) · hosted events with payout performance · media timeliness record | — |
| `/about`, `/privacy`, `/terms`, `/conduct` | Legal & community | Static content pages | — |
| `not-found`, `error`, `global-error`, `loading` | System pages | Branded 404 (salamander mascot), error with retry + support link | Designed, on-brand |

### 7.2 Auth `(auth)`

| Route | Purpose | Key elements |
|---|---|---|
| `/signin` | Entry point | Email/password · Google · GitHub · forgot-password link · signup cross-link · inline validation · rate-limit error state |
| `/signup` | Register | Same providers · step 2: role picker (Developer / Organizer cards with icons) · step 3: handle reservation |
| `/verify-email` | Token verification | Success → route by role to onboarding · expired token → resend |
| `/forgot-password` / `/reset-password` | Recovery | Standard flows, throttled |

### 7.3 Onboarding (wizard, resumable — progress persists per step)

| Route | Steps |
|---|---|
| `/onboarding/developer` | 1) Profile basics (name, headline, skills chips) · 2) GitHub + LinkedIn connect · 3) Payout method setup (M-Pesa phone / bank — skippable but nudged before first event win) · 4) Interests (event types) → dashboard |
| `/onboarding/organizer` | 1) Create or join org (join via invite code) · 2) Org profile (name, logo, about) · 3) KYC intro ("required before your first deposit — we'll collect it at funding") · 4) → `/organizer/events/new` |

### 7.4 Developer App `(app)/dashboard`

| Route | Purpose | Key elements |
|---|---|---|
| `/dashboard` | Home | Active events (with status timeline) · pending team invites · payouts in flight (live status pills) · profile completeness meter · next deadlines |
| `/dashboard/events` | My events | Registered/upcoming/past tabs · per-event: team, submission, result |
| `/dashboard/teams` | Team hub | Invites (accept/decline) · my teams · team pages show members + invite-code share (copy/QR) |
| `/dashboard/profile` | Edit PoW profile | Same fields as public profile + privacy toggles (hide profile from browse) |
| `/dashboard/winnings` | Payout history | Per win: instant tranche + milestone tranche rows with status timeline (QUEUED→PROCESSING→PAID + timestamps) · M-Pesa receipt refs · total earned |
| `/dashboard/notifications` | Full list | Grouped by type, mark-read |
| `/settings` | Account | Email/password change · connected accounts · notification prefs · payout method manage · danger zone (deactivate → anonymize, payouts owed still process) |
| `/events/[slug]/workspace` | Event workspace (joined) | Team panel · submission form (repo, demo, description — validates repo URL) · milestone tracker · submitted state (edit until deadline) · judge feedback (revealed after judging) |

### 7.5 Organizer App `(app)/organizer`

| Route | Purpose | Key elements |
|---|---|---|
| `/organizer` | Command overview | My events with status chips · vault states · upcoming deadlines (judging, media 48h clock) · org trust score card · payout KPI per event |
| `/organizer/events/new` | 5-step creation wizard | 1) Basics (title, slug, cover, venue, dates) · 2) Problem statement + rules + roles tags · 3) Prize breakdown (places, amounts, milestone toggles) · 4) Registration settings (max teams, deadline) · 5) Review → creates `DRAFT` → routes to Vault |
| `/organizer/events/[slug]` | Event command center | Tabbed: Overview · Registrations (approve/waitlist) · Teams & Submissions (view all, download repos list) · Judges (invite by email, status) · Vault · Media · Winners · Milestones. Header shows status + next required action ("Deposit KES 500,000 to go live") |
| `…/vault` | **Funding gate** | Prize summary · "Fund the Prize Vault" → Paystack checkout modal · deposit status stepper (Initiated→Confirmed→Attested) · receipt download · refund policy note |
| `…/media` | 48h Media Vault | Countdown banner (endsAt + 48h) · drag-drop multi-upload with progress · gallery management (approve/hide) · post-deadline: locked + Trust Penalty notice |
| `…/winners` | Announce winners | Select winning team per prize place (from judge results or override with reason) · "Announce & pay 50%" confirm dialog → instant payout trigger · payout progress table per winner (live) |
| `…/milestones` | Final tranche | Per winner: milestone description · "Confirm handover" → releases final 50% · dispute link |
| `/organizer/organization` | Org settings | Members & roles · KYC status (start KYB flow) · trust history · invite admins |

### 7.6 Judge App `(app)/judge`

| Route | Purpose | Key elements |
|---|---|---|
| `/judge` | Assignments | My events with progress (teams judged / total) |
| `/judge/events/[slug]` | Team queue | Teams list with my-scoring status · rubric reference |
| `/judge/events/[slug]/teams/[teamId]` | Scoring screen | Repo/demo links open in new tab · rubric sliders (weighted) · **3-point structured feedback** (STRENGTH / IMPROVEMENT / NEXT_STEP) — finalize disabled until 3 points exist (enforced UI + API) · "Finalize score" |

### 7.7 Hiring Partner `(app)/hiring`

| Route | Purpose | Key elements |
|---|---|---|
| `/hiring` | Talent discovery | Winners browse by event/skill/role · verified metrics · "Request intro" (one-click) with message |
| `/hiring/requests` | Pipeline | Sent intros with status · accept/decline flows happen developer-side |

### 7.8 Admin `admin/` (platform staff, 2FA required)

| Route | Purpose |
|---|---|
| `/admin` | Metrics dashboard: Trust KPI, payout latencies, open failures |
| `/admin/users` | Search, role grants, deactivate |
| `/admin/events` | All events + lifecycle overrides (with mandatory reason → audit log) |
| `/admin/payments` | Deposit reconciliation · failed-payout ops queue (retry / manual-review / mark-paid-with-receipt) · reversed transfers |
| `/admin/disputes` | Milestone/dispute queue: evidence from both parties → force-release or refund (refund requires 2-admin approval) |
| `/admin/ledger` | Chain sync health · re-mirror tooling · verify attestation ↔ webhook ↔ DB three-way match |
| `/admin/trust` | Manual trust adjustments (reason required) + appeal rulings |

### 7.9 Cross-cutting navigation

- **Global top bar** (marketing): logo · Events · Developers · Trust · For Organizers · Sign in / Avatar menu.
- **App sidebar** (role-scoped): shows only the role surfaces the user holds; role switcher when multi-role.
- **Breadcrumbs** in all `/organizer/events/[slug]/*` and `/admin/*` depths.
- **Notification bell** (app shell): unread count, dropdown, → `/dashboard/notifications`.

---

## 8. Modals, Popups & System-State Inventory

Every asynchronous or interruptive surface, named up front so nothing ships as an afterthought. (Dialog primitive = accessible shadcn/ui `Dialog`; toasts = `sonner`; banners = `Alert` variants.)

### 8.1 Auth & identity
| Surface | Trigger | Behavior |
|---|---|---|
| Sign-in modal | Any CTA while signed out | Slide-over with OAuth + email/password; deep-links back to origin route after auth |
| Role-picker modal | Signup step 2 | Developer/Organizer cards; "you can add other roles later" reassurance |
| OAuth account-conflict modal | OAuth email matches existing credentials account | "Link accounts?" with password confirm |
| Session-expired modal | Server action 401 mid-flow | Non-destructive: re-auth restores in-progress form state |
| Email-verification toast | Signup complete | "Verification sent" + resend with cooldown timer |

### 8.2 Money surfaces (highest polish budget)
| Surface | Trigger | Behavior |
|---|---|---|
| Deposit checkout modal | "Fund the Prize Vault" | Paystack inline checkout in modal; on success → confetti-free (trustworthy, not playful) success panel with reference + "attesting to chain…" stepper |
| Payout status toasts (winner) | Payout state transitions | ARIA-live: "🎉 50% prize on its way — M-Pesa transfer initiated" → "Paid. Ref TX…" with receipt link |
| Announce-winners confirm dialog | Organizer selects winners | Full-screen review: place/team/amount table + "This triggers real payouts. Confirm." Typed-confirm for >KES 250k pools |
| Milestone-release confirm dialog | "Confirm handover" | Amount + recipient + "final 50%" statement; posts `MILESTONE_PAYOUT` attestation |
| Refund banner | Event cancelled pre-live | Full refund explainer + timeline |
| Dispute-entry modal | Milestone disagreement | Structured form: claim, evidence links; warns funds stay locked until resolution |
| Manual-review banner (admin) | Payout failed ×N | Alert + ops queue entry; never auto-retry beyond cap |
| KYC gate modal | Deposit without KYC | Explains CBK requirement → starts KYB flow, returns to deposit after |

### 8.3 Event lifecycle
| Surface | Trigger | Behavior |
|---|---|---|
| Register confirm dialog | Event CTA | Shows team preference (join existing vs. create) |
| Team-invite modal (recipient) | Bell + email | Event card + team name + leader + Accept/Decline; accepting joins team |
| Invite-share popup (leader) | Team page | Copy code, WhatsApp share link, QR |
| Submission confirm dialog | Submit project | Validates repo URL; "you can edit until deadline" note |
| Judge-unlock hint | Judge finalizes early | "3 feedback points required" inline explainer |
| Media countdown banner | Organizer < 24h to deadline | Sticky, amber, shows penalty consequence |
| Trust-penalty notice | Deadline missed | Red banner on org pages + score delta + appeal link |

### 8.4 System states (every list/view must design all four)
- **Loading**: skeletons matching final layout (no spinners on their own).
- **Empty**: mascot illustration + one-sentence explanation + single CTA. E.g. developer with no events: "Find your first verified event →".
- **Error**: human sentence + retry + "contact support" (pre-fills context).
- **Success**: receipt/confirmation with next-step affordance.
- **Partial/offline**: RSC streaming placeholders; stale-while-revalidate on `/trust` when RPC is slow.

### 8.5 Ambient
- Cookie/consent notice (minimal, Kenya DPA-friendly) · maintenance banner (env-driven) · announcement modal (changelog, once per user via `Notification` type) · onboarding tooltips (first 3 visits, dismissible) · "Prize Verified" badge micro-animation (subtle check-draw on hover — delight, not distraction) · org-invite modal (join org flow).

---

## 9. API Surface

REST via App Router route handlers (`app/api/*`). All mutations: zod-validated, session-checked, RBAC-checked server-side, rate-limited. Webhooks HMAC-verified. Naming: plural nouns; errors `{ ok: false, error, code, retryable }` (workflow contract).

### 9.1 Auth (Auth.js conventions)
`POST /api/auth/*` — signin, signup, OAuth callbacks, signout, verification, reset.

### 9.2 Identity & profiles
| Method + Path | Role | Purpose |
|---|---|---|
| `GET/PATCH /api/me` | any | Session user + profile update |
| `GET/PATCH /api/profiles/:handle` | owner/public | PoW profile read/update |
| `POST /api/me/payout-method` | developer | Create/verify Paystack transfer recipient (M-Pesa or bank) |
| `POST /api/orgs` · `PATCH /api/orgs/:slug` · `POST /api/orgs/:slug/members` | organizer | Org CRUD + member invites |
| `POST /api/orgs/:slug/kyc` | organizer | Start KYB (Paystack verification flow) |

### 9.3 Events
| Method + Path | Role | Purpose |
|---|---|---|
| `POST /api/events` (draft) · `PATCH /api/events/:slug` | organizer | Create/update while DRAFT |
| `POST /api/events/:slug/publish` | organizer | DRAFT→PENDING_DEPOSIT (publish gated on complete wizard) |
| `POST /api/events/:slug/register` · `DELETE …/registrations/:userId` | developer/organizer | Register / cancel / leave |
| `POST /api/teams` · `POST /api/teams/:id/invites` · `POST /api/invites/:id/accept|decline` · `POST /api/teams/:id/lock` | developer | Team lifecycle |
| `POST /api/teams/:id/submission` · `PATCH …` | developer team | Submit/update until deadline |
| `POST /api/events/:slug/judges` · `PATCH /api/judge/assignments/:id` | organizer / judge | Invite / accept |
| `POST /api/judge/teams/:teamId/scores` | judge | Score batch (transactional) |
| `POST /api/judge/teams/:teamId/feedback` | judge | 3-point feedback (min 3 enforced) |
| `POST /api/judge/teams/:teamId/finalize` | judge | Finalize (blocked until ≥3 feedback) |

### 9.4 Escrow & payout (hard-boundary services)
| Method + Path | Role | Purpose |
|---|---|---|
| `POST /api/events/:slug/deposits` | organizer | Initiate Paystack checkout for pool |
| `POST /api/webhooks/paystack` | Paystack | Deposit/transfer confirmation (HMAC; idempotent by reference) |
| `GET /api/events/:slug/vault` | any (public) | Vault state + on-chain reference |
| `POST /api/events/:slug/winners` | organizer | Announce winners → creates INSTANT payout jobs (idempotent) |
| `POST /api/winners/:id/milestone-confirm` | organizer | Release MILESTONE tranche |
| `GET /api/me/winnings` | developer | My payouts with statuses |
| `POST /api/admin/payouts/:id/retry` · `…/manual-review` | admin | Ops actions (reason → audit) |
| `POST /api/admin/refunds` | admin ×2 | Refund flow (pre-live events) |

### 9.5 Media, trust, career, legacy, notifications
`POST /api/events/:slug/media/upload-url` (presigned) · `POST …/media` (register uploaded assets) · `GET /api/organizers/:slug/trust` (public history) · `POST /api/hiring/intros` · `POST /api/intros/:id/accept|decline` · `POST /api/legacy/checkins/:id` · `GET /api/me/notifications` · `POST /api/me/notifications/:id/read`.

---

## 10. The Escrow & Payout Engine

The heart of the platform. Two orthogonal state machines (event lifecycle; vault/payout) plus three workflow trees, specified workflow-architect style: happy path, every failure mode, observable states, cleanup inventory.

### 10.1 Event lifecycle state machine

```
 DRAFT ──publish──► PENDING_DEPOSIT ──deposit locked+attested──► LIVE
                                                        │ startsAt
                                                        ▼
                                                    IN_PROGRESS
                                                        │ endsAt + judging opens
                                                        ▼
                                                      JUDGING
                                                        │ organizer announces (judge-locked results)
                                                        ▼
                                                WINNERS_ANNOUNCED ──(instant payouts pay)──►
                                                        │ all milestones confirmed (or N/A)
                                                        ▼
                                                     SETTLED   (terminal-good)
 Branches:
  DRAFT/PENDING_DEPOSIT ──cancel──► CANCELLED ──(if funds locked)──► REFUND flow → refunded vault state
  any pre-settled state ──admin hold──► DISPUTED ──resolution──► resume or refund
  MEDIA_OVERDUE is a *flag* on IN_PROGRESS+ events — it never blocks payouts (prize ≠ media)
```

**Invariants**: `LIVE` requires `VaultState.LOCKED` and deposits ≥ pool (same transaction). `WINNERS_ANNOUNCED` requires all judging finalized. `SETTLED` requires every payout `SUCCEEDED` or `MANUAL_REVIEW-closed` + milestone obligations cleared.

### 10.2 Vault (funds) state machine — mirrored 1:1 on-chain

```
AWAITING_DEPOSIT ──charge.success + ≥pool──► LOCKED
LOCKED ──winners announced + instant tranche attested──► HALF_RELEASED
HALF_RELEASED ──all milestone tranches attested──► SETTLED
LOCKED ──event cancelled pre-live──► REFUNDED
HALF_RELEASED ──admin refund (dispute, exceptional)──► REFUNDED (partial ledger entry; full audit trail)
```

### 10.3 WORKFLOW: Deposit → Lock → Attest → Go Live

**Trigger**: Organizer clicks "Fund the Prize Vault" (`POST /api/events/:slug/deposits`).

```
STEP 1  Create Deposit row (status INITIATED, unique paystackReference = HV-{eventId}-{uuid})
        FAIL validation → 400, no side effects.
STEP 2  Paystack Checkout initialization (gross = (pool − already-deposited pool) + 5% platform fee — ADR-012; the vault records the pool portion only)
        TIMEOUT/5xx → retry ×2 backoff → Deposit stays INITIATED, organizer sees
        "payment link expired, try again" — safe: no money moved.
STEP 3  Organizer pays (external). UI polls deposit status; modal shows stepper.
STEP 4  Webhook charge.success arrives → VERIFY HMAC → WebhookEvent row (replay guard,
        unique by reference+event type) → if pool portion ≥ remaining pool:
        TX{ Deposit→SUCCEEDED; VaultState→LOCKED; issue "Prize Verified" badge; Event→LIVE }
        FAIL: webhook processed before checkout matches → keep PENDING, replay-safe
        (unique constraint absorbs duplicates; manual reconcile job for >24h strays).
STEP 5  Chain attestation job: PrizeVault.lock(...) → LedgerEntry with txHash
        FAIL (RPC down): queue retry ×N; event is ALREADY live (fiat is custody);
        ledger shows "attestation pending" — never blocks payouts (ledger ≠ custody).
```

**Observable states**: organizer sees stepper Initiated→Paid→Verified→On-chain ✓ · developer sees badge appear on card · admin sees deposit reconciliation grid · `/trust` gains a row.
**Cleanup inventory**: INITIATED deposits expire after 24h (cron) — no orphans; Checkout sessions are Paystack-side.

### 10.4 WORKFLOW: Instant Payout (50%) — the KPI-critical path

**Trigger**: `POST /api/events/:slug/winners` with judge-locked results.

```
STEP 1  Validate: all judging finalized, winners ∈ participating teams, pool ≥ Σ prizes.
STEP 2  TX{ Winner rows; Payout rows (tranche=INSTANT, idempotencyKey={winnerId}:INSTANT,
        status=QUEUED) }  ⬤ UNIQUE constraint = double-announce impossible.
STEP 3  Announce: Event→WINNERS_ANNOUNCED; notify teams; publish winners strip.
STEP 4  For each payout, enqueue payout.execute (pg-boss, same TX as STEP 2 — atomic).
        Job: SELECT payout FOR UPDATE → recheck status=QUEUED → create Paystack Transfer
        (idempotency key header) → status=PROCESSING, save transferCode.
STEP 5  Webhook transfer.success → TX{ Payout→SUCCEEDED, paidAt } → attestation job →
        VaultState→HALF_RELEASED (after all winners' instant tranches) → toast + email.
        Webhook transfer.failed/REVERSED → status=FAILED (lastError) → auto-retry job
        with exponential backoff (cap 5 attempts / 30 min) → then MANUAL_REVIEW + admin
        alert + winner notification "we're on it" (funds remain locked — fail closed).
```

**Payout recipient (ADR-013)**: `Winner.userId` is the team leader; each tranche pays the leader's verified recipient **in full**. The team's `splitDeclaration` (recorded at submission, sums to 100%, member-visible) governs the intra-team split off-platform in v1.
**Race-condition guards**: pg-boss singleton per payout id · row lock before status check · webhook + retry job can interleave safely because both re-read status under lock.
**Cleanup**: none needed — no partial external state that isn't tracked by Paystack transfer status; reversal is a first-class state (`REVERSED`).
**Test cases** (each branch = one test): happy path <1h KPI · announce twice → second is 409, zero jobs · transfer webhook before our job → absorbed by lock+status check · duplicate webhook → replay guard · transfer.failed ×5 → MANUAL_REVIEW + no double transfer · manual retry after success → idempotency key → Paystack dedupes · concurrent team-member edits → unaffected (payouts are per-winner-user).

### 10.5 WORKFLOW: Milestone (final 50%)

Trigger: `POST /api/winners/:id/milestone-confirm`. Same shape as instant: MILESTONE tranche, unique idempotency key, transfer → webhook → attestation; on success VaultState→SETTLED, event→SETTLED (if last). Organizers confirm per winner; 30/60/90-day auto-reminders to organizer with nudge-copy; developer sees "awaiting organizer confirmation" with dispute button after 14 days → admin `DISPUTED` queue (both parties submit statements; force-release or refund, 2-admin rule).

### 10.6 WORKFLOW: 48-Hour Media Vault

Trigger: event `IN_PROGRESS` → endsAt. `mediaDeadlineAt = endsAt + 48h`. Cron (15-min): deadline passed with zero approved assets → `TrustEvent(MEDIA_PENALTY, −10)` + red banner + organizer email/appeal path. Uploaded-but-pending photos don't stop the clock — *approved* gallery is the bar. Appeal → admin grants/denies (reason logged). Never affects payouts.

### 10.7 WORKFLOW: Legacy Check-in (3-month)

Cron daily: LegacyCheckin dueAt reached → email + notification to team members with one-tap outcome capture (STILL_DEMO | IN_PRODUCTION | PIVOTED | ABANDONED + optional notes). Outcome updates PortfolioItem lifecycle badge (public profile shows real-world trajectory). Two reminders, then auto-mark UNRESPONSIVE (excluded from Legacy Rate numerator only).

---

## 11. Smart Contract Design

`contracts/` — Hardhat + Solidity ^0.8 + OpenZeppelin (AccessControl, ReentrancyGuard).

### 11.1 `PrizeVaultFactory.sol`
`createVault(string eventId, uint256 amountKes) onlyRole(ATTESTER) returns (address)` → deploys child vault, emits `VaultCreated(eventId, vault, amountKes)`. Registry `eventToVault` public. Factory address is the one pinned in `SMART_CONTRACT_ADDRESS` env — per-event vaults keep each event's attestation isolated and cheap.

### 11.2 `PrizeVault.sol` — per event

```solidity
enum State { AWAITING, LOCKED, HALF_RELEASED, SETTLED, REFUNDED }
State public state;                       // mirrors §10.2 exactly
string public eventId; uint256 public amountKes;
bytes32[] public paystackRefs;            // off-chain receipt hashes for cross-verification

function lock(bytes32 paystackRef)            external onlyRole(ATTESTER);
function recordInstantPayout(bytes32 winner, uint256 amount, bytes32 txRef) external onlyRole(ATTESTER); // → HALF_RELEASED
function recordMilestonePayout(bytes32 winner, uint256 amount, bytes32 txRef) external; // → SETTLED when sum ≥ pool
function refund(bytes32 refundRef)            external onlyRole(ATTESTER);
```
Every function reverts on illegal transition; every success emits a typed event (`DepositLocked`, `InstantPayoutRecorded`, `MilestonePayoutRecorded`, `VaultRefunded`) with all references — the public ledger's source. **Immutable** (no upgrade proxy) — upgrade = deploy new factory + mirror links; v2.0 DAO may add multi-sig ATTESTER role; key rotation story documented in `SECURITY.md`.

### 11.3 Ledger mirroring
`LedgerEntry` rows are written by the attestation job on receipt of on-chain event logs; a nightly reconciliation job verifies three-way match: Paystack webhook ⇄ DB rows ⇄ chain events. Mismatch = page + Sentry alert. `/trust` reads DB (fast) with "verified on-chain" badges.

### 11.4 Testing & deployment gates (per CONTRIBUTING)
Local Hardhat tests cover every legal/illegal transition + access control (unknown signer, double-attest, wrong-order) → Amoy testnet soak during Phases 3–8 → independent audit before mainnet → verified-contract link required in PR descriptions touching `contracts/`. Two maintainer approvals mandatory.

---

## 12. Background Jobs & Scheduled Workflows (pg-boss)

| Job | Schedule | What it does | Failure policy |
|---|---|---|---|
| `payout.execute` | on-enqueue | Create Paystack Transfer per payout | Retry ×5 exp-backoff → MANUAL_REVIEW |
| `payout.retry` | cron 5m | Re-drive FAILED payouts under attempt cap | Alert admin at cap |
| `escrow.attest` | on-enqueue | Post state transition to PrizeVault | Retry ×10 (chain RPC flaky is OK) |
| `ledger.mirror` | on-chain event sub + nightly | Mirror + three-way reconcile | Alert on mismatch |
| `media.deadline-check` | cron 15m | Enforce 48h vault deadline | Idempotent by (event, deadline) |
| `legacy.checkin` | cron daily | 3-month check-in due/reminder | Idempotent by (submission, dueAt) |
| `milestone.reminder` | cron daily | 30/60/90-day organizer nudges | — |
| `deposit.expire` | cron hourly | Expire INITIATED deposits >24h | — |
| `notifications.dispatch` | on-enqueue | Email (Resend) fan-out with templates | Retry ×3, dead-letter table |

All jobs idempotent (safe to re-run); all carry actor/event correlation IDs into structured logs.

---

## 13. Design System

Brand identity from the existing salamander mark: **yellow `#FFED00` + ink `#222`**. Positioning: *optimistic, credible, African*. The vibe: "a trusted community ledger, not a fintech dashboard" — warm, confident, honest.

### 13.1 Tokens

| Token | Value | Use |
|---|---|---|
| `--color-brand` | `#FFED00` | CTAs, badges, highlights, focus rings |
| `--color-ink` | `#222222` | Primary text, dark sections |
| `--color-paper` | `#FAFAF7` | Page background (warm off-white) |
| `--color-success` | `#0E9F6E` | Paid/verified states |
| `--color-warning` | `#D97706` | Pending/deadline states |
| `--color-danger` | `#DC2626` | Failed/penalty states |
| `--color-muted` | `#6B6B6B` | Secondary text (AA on paper) |
| `--font-display` | Space Grotesk | Headlines, numerals (KPI stats) |
| `--font-body` | Inter | Body, UI |
| `--radius` | 12px cards · 8px controls · full pills | — |
| `--shadow` | 2-tier (rest/hover) | Soft, never heavy |
| Spacing | 4px base grid, 8px rhythm | Section padding: 64–96px desktop / 32–48px mobile |

**Contrast rule (hard)**: yellow backgrounds always get ink text; yellow text only on ink backgrounds. Focus ring = 2px brand + 2px offset.

### 13.2 Core component inventory (components/ui + patterns)

- **Primitives** (shadcn/ui restyled): Button (primary=brand, secondary=outline, danger, ghost; loading state with spinner-in-button), Input, Textarea, Select, Chips (skills/roles), Dialog, Sheet/drawer, Tabs, Table, Toast (sonner), Tooltip, Popover, Skeleton, Progress, Avatar, DropdownMenu, Alert, Badge, Command palette (post-v1).
- **Patterns** (composed, project-specific):
  - `PrizeVerifiedBadge` — brand-yellow pill + check icon; hover draws the check (delight cue); tooltip "100% of pool locked in escrow — view ledger".
  - `EventCard` — cover, status chip, badge, pool amount (display font), team count, countdown chip, organizer mini-score.
  - `StatusTimeline` — horizontal stepper for event/vault/payout phases; used identically across event page, vault modal, winnings page (one mental model everywhere — P1).
  - `VaultPanel` — deposit stepper + ledger links.
  - `PayoutRow` — tranche pill (INSTANT/MILESTONE), amount, state, timestamps.
  - `FeedbackCard` — judge feedback triplets (strength/improvement/next-step chips).
  - `EmptyState` — mascot illustration + copy + CTA slot.
  - `StatBand` — display-font numerals for KPIs.
  - `TrustScoreDial` — org score with event history sparkline.
- **Iconography**: Lucide. **Illustration**: simple two-color (ink/yellow) line-art salamander scenes; no stock 3D people.

### 13.3 UX rules
- Mobile-first breakpoints; bottom-tab nav on mobile app views (Home/Events/Teams/Me), sidebar ≥ lg.
- Numbers: KES formatted `KES 150,000`; dates `dd MMM` + relative countdowns ("Ends in 3h 20m").
- Destructive/money actions: confirm dialog + typed confirmation over KES 250k.
- Motion: 150–250ms ease-out; badge-check draw 400ms; `prefers-reduced-motion` respected globally.
- Real content everywhere (P12): seeds produce a realistic Nairobi event (e.g., "Fintech for Matatu Culture — KES 500,000 pool").

### 13.4 Accessibility checklist (gates CI + manual)
Automated (axe in Playwright): zero critical violations/page. Manual: full keyboard traversal of money paths (deposit → payout), screen-reader pass on toasts (ARIA live), zoom 200% layout integrity, color-blind safe status pairs (never color-only — always icon+label).

---

## 14. Security & Compliance

### 14.1 RBAC matrix (server-enforced; UI hides, server denies)

| Resource | Developer | Organizer | Judge | Hiring | Admin |
|---|---|---|---|---|---|
| Event CRUD (own org) | — | ✅ | — | — | override |
| Deposit initiate (own org) | — | ✅ | — | — | — |
| Announce winners | — | ✅ (own) | — | — | override+audit |
| Scores/feedback | view (post-judging) | view (own event) | own only | — | view |
| Payout ops | — | — | — | — | ✅ (refund ×2) |
| Trust adjustments | — | — | — | — | ✅ reason-logged |
| Ledger/admin surfaces | — | — | — | — | ✅ 2FA enforced |

Additional rules: ownership checks always join through org membership; admin overrides require `reason` field → `AuditLog`; every webhook entry stored raw for forensics.

### 14.2 Application security
- Webhooks: Paystack HMAC-SHA512 verification, constant-time compare, raw-body reading; replay guard table.
- Idempotency: DB unique keys (§6) + Paystack idempotency keys + row locks (SELECT FOR UPDATE) — three independent layers (P3).
- Sessions: Auth.js database sessions; admin + organizer roles require re-auth for high-risk actions (announce winners, refunds) if session >8h old.
- Rate limits: auth routes 5/min/IP; mutations 60/min/user; webhook verification failures 3 → lockout alert.
- Input: zod at every boundary (forms, actions, handlers, webhooks, env).
- Secrets: `lib/env.ts` zod-validated; nothing client-exposed except `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY`; `.env.example` documents all.
- Headers: strict CSP (self + Paystack inline frame allowances), HSTS, frame-ancestors none.
- File uploads: presigned PUT with content-type+size limits; images re-processed; no SVG user uploads (XSS).
- Dependency security: `pnpm audit`/`npm audit` in CI weekly; lockfile-only installs.

### 14.3 Compliance
- **CBK / KYC-AML**: Paystack is the licensed PSP — deposits and transfers run through their KYB/KYC-verified rails. Organizer orgs complete KYB (Paystack verification) before first deposit; winners complete Paystack recipient verification before payouts (recipient creation = bank/M-Pesa ownership check). Manual-review queue for payouts > configurable threshold (default KES 500k) — SAR-style escalation documented in `SECURITY.md`.
- **Kenya Data Protection Act 2019**: consent-based onboarding, export-my-data + delete-my-account (with payout obligations preserved), data-retention policy (payout records 7y per financial-records norms; marketing data deleted on request), privacy policy page listing processors (Vercel, Neon, Paystack, Cloudflare, Resend, Polygon).
- **Financial product honesty**: copy everywhere says *escrow-attested, Paystack-custodied* — no "blockchain-secured funds" ambiguity.

---

## 15. Testing Strategy

| Layer | Tool | Scope & gates |
|---|---|---|
| Unit | Vitest | `lib/domain/*` state machines (every legal/illegal transition), escrow/payout service fns (**≥90% line gate** — CI fails below), fee/limit math |
| Integration | Vitest + local Postgres (Docker) | Route handlers with real DB: RBAC matrix, idempotency (parallel announce ×2), webhook processing with recorded Paystack fixtures — **no live network calls in CI** (CONTRIBUTING) |
| Contract | Hardhat + Chai (local node) | All vault transitions, access control, event emissions; PRs touching `contracts/` must show testnet deploy link (CONTRIBUTING) |
| E2E | Playwright | 5 golden paths: (1) dev signup→onboard→register→team→submit; (2) organizer signup→event→deposit(mocked)→live; (3) judge→score→feedback≥3→finalize; (4) announce winners→instant payout(mocked webhook)→winnings page; (5) milestone→confirm→final payout. Plus axe a11y sweep per page |
| Visual | Playwright screenshots | Key pages: landing, event detail, vault modal, winnings — diff-gated on PRs |
| Performance | Lighthouse CI | Landing ≥95 mobile perf budget; event detail ≥90 |

Fixtures strategy: record real Paystack test-mode webhook payloads once (Phase 3 spike), store under `tests/fixtures/paystack/`, replay through the real verification path with a test HMAC secret — the closest thing to real without network.

---

## 16. Infrastructure & DevOps

| Concern | Choice |
|---|---|
| Hosting | Vercel (preview per PR — e2e runs against preview) |
| DB | Neon Postgres (prod, branching for staging) · Docker for local/CI |
| Jobs | pg-boss on the same Postgres (see ADR-004) |
| Storage | Cloudflare R2 + custom domain |
| Email | Resend + react-email templates |
| Monitoring | Sentry (errors + traces) · Vercel Analytics · `health` endpoint (DB, queue, chain RPC) |
| Environments | `local` → `preview` (per-PR, Amoy testnet, Paystack test keys) → `production` (main only, Paystack live, mainnet post-audit) |
| CI (GitHub Actions) | PR: lint (eslint+prettier) → typecheck → unit → integration → build. main-merge: + e2e vs preview + Lighthouse. Nightly: dependency audit + contract soak |
| Migration policy | `db:migrate` expand-and-contract; never destructive on prod without paired release |
| Release | Conventional Commits → squash-merge → Vercel git integration; feature flags via env for risky paths (payout engine cutover) |
| Runbooks | `docs/runbooks/` — payout-failure triage, webhook replay, chain-RPC outage (ledger-pending mode), dispute handling |

---

## 17. Build Phases & Milestones

Estimates assume one experienced full-time builder; halve with a second dev. Each phase ends demoable (P11) with exit criteria you can verify by clicking. Phases 3+ depend on Paystack test account; Phase 9+ on audit.

### Phase 0 — Foundations (Week 1) · M0
**Scope**: Next.js 15 + TS strict scaffold, Tailwind v4 + tokens + shadcn/ui base, Prisma + baseline schema (identity), pg-boss wiring, ESLint/Prettier/commitlint, GitHub Actions CI, `.env.example`, `.gitignore`, `CODE_OF_CONDUCT.md`, `SECURITY.md`, repo housekeeping (fix README badge to 15 if desired), app shell layout (marketing + app), design-system primitives, deployed preview pipeline.
**Exit criteria**: CI green on hello-world route · landing shell renders on mobile with brand tokens · `npm run dev/db:migrate/lint/typecheck` all work · PR template live.

### Phase 1 — Identity & Profiles (Weeks 2–3) · M1
**Scope**: Auth.js (credentials + Google + GitHub), email verification (Resend), sessions, role grants, developer onboarding wizard, org creation + members, profile CRUD + public profile page, settings.
**Exit criteria**: sign up both roles end-to-end · roles re-checked server-side (test: forged role fails) · profile pages publicly shareable.

### Phase 2 — Events & Teams (Weeks 4–5) · M2
**Scope**: Event wizard (5 steps), DRAFT→PENDING_DEPOSIT, public browse/detail with filters, registration, teams + invites, submission form, basic admin (users/events), seeds (realistic Nairobi demo event).
**Exit criteria**: event publishes as *unverified* and is visibly "pending deposit" everywhere · dev joins team + submits repo · no money code yet anywhere.

### Phase 3 — Escrow Engine (Weeks 6–8) · M3 ⚠ *highest-risk phase*
**Scope**: Paystack port layer (checkout incl. gross = pool + 5% fee per ADR-012, webhooks, HMAC, replay guard), deposit flow + VaultState machine + unit tests (90% gate), PrizeVault contract + factory + full Hardhat suite, Amoy deploy, attestation job, `/trust` ledger page, deposit-expire cron, KYB gate for orgs.
**Exit criteria (this is the money milestone)**: test deposit → webhook → `LOCKED` → badge → event goes live → ledger row on Amoy with clickable tx · replaying the webhook 100× produces zero side effects · failed-deposit path leaves clean retryable state · CONTRACT: every illegal transition tested & reverting.
**Spike before phase**: 2-day Paystack API spike (checkout, transfers, recipient creation for M-Pesa — record fixtures, verify Split capabilities if we want deposit-time splits).

### Phase 4 — Judging (Weeks 9–10) · M4
**Scope**: Judge invitations/assignments, rubric builder, scoring UI (weighted), 3-point feedback enforcement (UI + API + DB constraint), finalization gate, results computation service.
**Exit criteria**: judge cannot finalize without 3 feedback points (server rejects forged finalization) · results table computes correct winners from rubric weights.

### Phase 5 — Payouts & Winners (Weeks 11–13) · M5 ⚠ *KPI-critical*
**Scope**: Winner announcement flow, INSTANT payout jobs (Paystack Transfers + M-Pesa recipients), webhook transfer handling, retry/backoff, MANUAL_REVIEW ops queue + admin retry tools, vault → HALF_RELEASED, Trust-KPI metrics, winners strip + payout statuses on event page.
**Exit criteria**: mocked-webhook e2e pays winners in <60s · announce-twice idempotency proven · transfer.failed path → retry → manual-review with funds never double-sent (integration test with forced failures) · Trust KPI visible in admin.
**Note**: milestone (final 50%) can land here or early Phase 6 — `MILESTONE` tranche + confirm flow + `SETTLED`.

### Phase 6 — Proof of Work & Career (Weeks 14–15) · M6
**Scope**: Public PoW profile (verified metrics), endorsements (judge post-judging), portfolio items + lifecycle badges, hiring-partner role + browse + one-click intros + accept/decline, internship tags on events.
**Exit criteria**: winner's profile shows win + endorsement from real judge · hiring partner requests intro → developer accepts → contact info exchanged (in-app message) · no self-reported stats anywhere.

### Phase 7 — Media Vault & Trust Scores (Week 16) · M7
**Scope**: R2 presigned uploads, gallery per event, 48h deadline cron, trust events + org score, penalty + appeal, notification system (email + in-app).
**Exit criteria**: seeded late upload produces penalty, appeal path works to resolution · gallery public on event page · score history visible on org page.

### Phase 8 — Legacy, Admin Hardening, Polish (Week 17) · M8
**Scope**: 3-month check-in jobs + outcome capture, milestone reminders, admin disputes queue + 2-admin refunds, full empty/error/skeleton state pass, a11y audit + fixes, performance pass (RSC audit, image pipeline), notification center polish.
**Exit criteria**: feature-complete v1.0 in staging · axe zero-critical · Lighthouse budgets met · every route in §7 exists with all four system states.

### Phase 9 — Hardening, Audit & Launch (Weeks 18–20+) · M9
**Scope**: independent contract audit (blocks mainnet), Paystack live-mode verification + go-live checklist, load test judging rush (500 concurrent judges — GitHub-class server actions), runbooks, incident drill (kill Paystack webhook in staging → ops queue absorbs), first production event partnership (Nairobi pilot), feedback loop into v1.1.
**Exit criteria**: audit findings resolved · mainnet factory deployed + verified · pilot event completes full cycle with >90% Trust Score · retro + v1.1 planning.

**Post-v1.0 backlog (v1.1/v2.0 from README)**: One-Click Internship automation depth · Legacy Tracker public stats · DAO multi-sig attestation (v2.0) · cross-border pools (NGN/RWF — Paystack multi-currency spike) · AI judging pre-screen co-pilot (v2.0).

---

## 18. Workflow Registry

Per workflow-architect methodology — every workflow has a status. Specs live in `docs/workflows/WORKFLOW-*.md`, authored in the phase that builds them (registry is the index; statuses update as reality lands).

| Workflow | Spec | Status | Phase | Trigger |
|---|---|---|---|---|
| User signup + verification | — | **Built (Phase 1)** | 1 | /signup |
| Onboarding (dev/org) | — | **Built (Phase 1)** | 1 | First login |
| Event creation wizard | — | **Built (Phase 2)** | 2 | /organizer/events/new |
| Team formation & invites | — | **Built (Phase 2)** | 2 | Registration |
| **Deposit → Lock → Attest** | WORKFLOW-deposit.md | Planned | 3 | Fund vault CTA |
| Go-live gating | WORKFLOW-golive.md | Planned | 3 | Deposit locked |
| Submission (edit window) | — | **Built (Phase 2)** | 2 | Workspace form |
| Judging + feedback gate | WORKFLOW-judging.md | Planned | 4 | Judge finalize |
| **Instant payout (50%)** | WORKFLOW-payout-instant.md | Planned | 5 | Announce winners |
| **Milestone payout (50%)** | WORKFLOW-payout-milestone.md | Planned | 5/6 | Organizer confirm |
| Payout failure ops | WORKFLOW-payout-failure.md | Planned | 5 | transfer.failed |
| Refund (pre-live cancel) | WORKFLOW-refund.md | Planned | 5 | Event cancel |
| Dispute resolution | WORKFLOW-dispute.md | Planned | 8 | Developer dispute |
| 48h media enforcement | WORKFLOW-media-deadline.md | Planned | 7 | Cron |
| Trust adjustment + appeal | — | Planned | 7 | Penalty |
| Legacy check-in | — | Planned | 8 | Cron +3mo |
| Introduction request/accept | — | Planned | 6 | Hiring CTA |
| Notification dispatch | — | Planned | 7 | All events above |
| Ledger reconcile (3-way) | — | Planned | 3/5 | Nightly |

---

## 19. Risk Register

| # | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| R1 | Double payout via retry/webhook race | Low | Critical | Three idempotency layers (§14.2) + integration tests that force races |
| R2 | Paystack transfer failures (M-Pesa rail issues) | Medium | High | Retry + manual-review ops + comms templates; funds never leave vault until confirmed |
| R3 | Contract bug on mainnet | Low (post-audit) | Critical | Immutable contract, audit gate, Amoy soak through all phases, mainnet only at Phase 9 |
| R4 | Ledger ≠ reality (attestation drift) | Medium | High (trust) | Nightly 3-way reconcile + public "synced" indicator + alerts |
| R5 | CBK/regulatory classification of escrow | Medium | High | Funds custodied by Paystack (licensed PSP) from deposit to payout; platform never holds float; legal review in Phase 9 |
| R6 | Solo-dev bandwidth / 20-week estimate slips | High | Medium | Phase gates allow pausing after any milestone; M2 alone is a demoable product |
| R7 | Marketplace cold-start (no events, no devs) | High | High | Nairobi pilot partnership in Phase 9; seeds show a full platform; hand-hold first 5 organizers (we run their deposits with them) |
| R8 | Judging rush load (event-day spikes) | Low | Medium | Server actions are stateless; Neon pooling; load test in Phase 9; queue absorbs webhook storms |
| R9 | KYB friction kills organizer signup | Medium | Medium | KYC deferred to first deposit; clear explainer modal; support-assisted path |
| R10 | Scope creep toward v2.0 (DAO, AI) during build | High | Medium | This plan freezes v1.0; changes go through ADR + issue-first (CONTRIBUTING) |

---

## 20. Decision Log

All v1.0 open questions are resolved (plan v1.1 — founder directive: *"use your recommendations"*). The recommendations were accepted as proposed:

| # | Question | Decision | Detail |
|---|---|---|---|
| D1 | Platform fee model | **Option B — 5% of pool, organizer-funded, charged at deposit** | ADR-012. Deposit gross = pool × 1.05; the vault locks the pool portion only. Developers always receive 100% of prizes. Pre-live cancellations refund the full gross (pool + fee). |
| D2 | Currency scope | **KES-only for v1.0** | NGN/RWF multi-currency deferred to the v2.0 Global Node spike. |
| D3 | Minimum prize pool | **KES 10,000** (`MIN_PRIZE_POOL_KES`) | Enforced in the event wizard and deposit validation. |
| D4 | Judging mode | **Organizer-defined rubric from a required platform template** | Template ships 5 default criteria (innovation, execution, impact, presentation, code quality); organizers tune labels/weights but must keep ≥3 criteria. |
| D5 | Winner payout identity | **Team-leader-receives (v1)** | ADR-013. The platform pays the leader's verified recipient in full; the team's `splitDeclaration` (recorded at submission, sums to 100%, member-visible) governs the intra-team split off-platform. Platform-managed multi-recipient splits = v1.1 candidate. |
| D6 | Mainnet timing | **Post-audit, post-pilot** | Amoy testnet through Phases 3–8; the mainnet factory deploys only after the independent audit and the Nairobi pilot complete. |
| D7 | Brand/legal on Paystack KYB | **Technetium Kenya (provisional)** | The existing legal entity carries KYB for v1.0; revisit on incorporation. Footer co-branding stays as the README has it. *(Provisional — confirm before Phase 3 KYB.)* |

**Change control**: reversals or new decisions require an ADR plus a plan PR (scope freeze per P10 / §19-R10).

---

## 21. Appendix

### 21.1 Environment variables (full contract for `.env.example`)

```env
# Core
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...          # Neon direct for migrations
NEXTAUTH_SECRET=...
NEXTAUTH_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Paystack
PAYSTACK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=pk_test_...
PAYSTACK_WEBHOOK_SECRET=...

# Chain (Polygon Amoy → mainnet)
SMART_CONTRACT_ADDRESS=0x...         # PrizeVaultFactory
CHAIN_ID=80002
RPC_URL=https://rpc.amoy.polygonscan.com
ATTESTER_PRIVATE_KEY=0x...           # platform signer (env-only, never in repo)
POLYGONSCAN_URL=https://amoy.polygonscan.com

# Storage / Email
R2_ACCOUNT_ID=... R2_ACCESS_KEY_ID=... R2_SECRET_ACCESS_KEY=... R2_BUCKET=hackvillage-media
RESEND_API_KEY=...

# Ops
SENTRY_DSN=...
PAYOUT_MANUAL_REVIEW_THRESHOLD_KES=500000
PLATFORM_FEE_BPS=500                        # 5% organizer-funded fee at deposit (ADR-012)
MIN_PRIZE_POOL_KES=10000
```

### 21.2 Fee model options (decision Q1)

| Option | Mechanics | Pros | Cons |
|---|---|---|---|
| A. Free (growth-first) | 0%; costs absorbed | Max adoption | No revenue signal |
| **B. Deposit percentage — ✅ ACCEPTED (ADR-012)** | 5% of pool at deposit (organizer pays KES 25k on 500k pool) | Aligned with trust delivered; simple; organizer-funded so developers always get 100% of prizes | Organizers price-compare vs "free" hackathons |
| C. Payout percentage | 5% deducted at payout | Revenue tied to actual disbursement | *Touching winner money — brand-toxic, rejected* |
| D. Organizer subscription | Monthly + 0% | Recurring revenue | SMB friction pre-PMF |

### 21.3 Definition of Done (every PR, reinforcing CONTRIBUTING)

- [ ] Conventional commit + scope · [ ] lint + typecheck + tests green · [ ] escrow/payout touched → 90% coverage on new lines + 2 approvals · [ ] contracts touched → testnet link in PR · [ ] new route → all four system states designed · [ ] money path → idempotency considered & tested · [ ] a11y pass on interactive elements · [ ] no secrets in diff · [ ] docs/workflows row updated if behavior changed.

---

*This plan is the build contract. Change it through PRs — it is versioned with the code it describes. — HackVillage Build Plan v1.0*
