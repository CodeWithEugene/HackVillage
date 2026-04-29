<div align="center">
  <img src="https://www.technetium.co.ke/assets/images/logo.webp" alt="Technetium Kenya" height="60" />
  &nbsp;&nbsp;&nbsp;&nbsp;
  <img src="./public/images/salamander-logo-yellow.svg" alt="HackVillage" height="60" />
</div>

<br />

<div align="center">

# HackVillage

**The Open-Source Infrastructure for High-Impact Tech Events**

_Trust-as-a-Service for Developers. Innovation-as-a-Service for Organizations._

[![License](https://img.shields.io/github/license/CodeWithEugene/HackVillage?style=flat-square)](./LICENSE)
[![Open Source](https://img.shields.io/badge/open--source-core-brightgreen?style=flat-square)](https://github.com/CodeWithEugene/HackVillage)
[![Built with Next.js](https://img.shields.io/badge/Next.js-14-black?style=flat-square&logo=next.js)](https://nextjs.org)
[![Backend](https://img.shields.io/badge/Node.js-TypeScript-3178c6?style=flat-square&logo=typescript)](https://www.typescriptlang.org)
[![Database](https://img.shields.io/badge/PostgreSQL-structured-336791?style=flat-square&logo=postgresql)](https://www.postgresql.org)

</div>

---

## Table of Contents

- [Mission](#mission)
- [The Problem](#the-problem)
- [The HackVillage Standard](#the-hackvillage-standard)
- [How It Works](#how-it-works)
- [Key Features](#key-features)
- [Technical Architecture](#technical-architecture)
- [Escrow & Payout Engine](#escrow--payout-engine)
- [Success Metrics](#success-metrics)
- [Roadmap](#roadmap)
- [Getting Started](#getting-started)
- [Contributing](#contributing)
- [License](#license)

---

## Mission

HackVillage bridges the gap between developers and stakeholders through **financial escrow**, **career-pathing**, and **high-speed feedback loops** that ensure every tech event delivers immediate and long-term value.

We are building the primary infrastructure for the African tech ecosystem — professionalizing the hackathon and tech event experience from the ground up.

---

## The Problem

| Pain Point | Traditional Hackathon | HackVillage |
|---|---|---|
| **Payment** | Weeks or months of waiting | 50% on the day, 50% on follow-up |
| **Outcome** | A trophy and a LinkedIn post | Internships, credits & verified portfolio |
| **Media** | Photos surface two weeks later | 48-hour high-res gallery delivery |
| **Engagement** | "Eat and go home" | Structured feedback & career pathing |

Organizers ghost winners. Submissions vanish into the void. Brilliant prototypes die on flash drives. HackVillage exists to fix all three.

---

## The HackVillage Standard

HackVillage enforces a **Developer Bill of Rights** and an **Organizer Performance Guarantee** through three non-negotiable pillars:

### 1. The Instant Reward Protocol
Organizers deposit **100% of the prize pool upfront** before an event goes live. Winners receive **50% instantly** on the day of the event; the remaining 50% is released automatically upon verified milestone completion. No escrow, no live event.

### 2. Developer Value Beyond the Prize
Every event builds a verifiable **Proof of Work** profile — win rates, GitHub contributions per event, and judge endorsements. Events are audition stages for real internships, apprenticeships, and mentorships brokered directly through the platform.

### 3. The Stakeholder Quality Guarantee
By enforcing professional standards and instant rewards, HackVillage attracts top-tier talent. Organizations receive **production-ready solutions** and **actionable data** — not polished pitches with no follow-through.

---

## How It Works

HackVillage operates as a three-phase engine:

```
┌─────────────────────────────────────────────────────────────────────┐
│                        PHASE 1 — SETUP                              │
│  Organizer: Deposit funds · Upload problem statement · Tag roles    │
│  Developer: Browse verified events · Form teams                     │
│  Platform:  Escrow validation · "Prize Verified" badge              │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────────────┐
│                      PHASE 2 — ENGAGEMENT                           │
│  Organizer: Monitor submissions · Manage mentors                    │
│  Developer: Build · Submit code · Document the project              │
│  Platform:  Project management · Real-time judging tools            │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────────────┐
│                       PHASE 3 — CLOSING                             │
│  Organizer: Announce winners · Upload photos within 48 hours        │
│  Developer: Receive 50% instantly · Get structured judge feedback   │
│  Platform:  Instant Loop · QA enforcement · Public ledger record    │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Key Features

### A. Escrow & Payout Engine

- **Prize Vault** — A secure holding area for prize pools. Only events marked "Prize Verified" are permitted to go live on the platform.
- **Split Disbursement API** — Automated fund release via M-Pesa and bank APIs: 50% at win, 50% at milestone handover.
- **Public Ledger** — Every deposit and payout is recorded on a blockchain ledger and exposed via a public link, fulfilling the open-source integrity requirement.

### B. Proof of Work Portfolio

- **Dynamic Developer Profiles** — Searchable profiles displaying hackathon win rates, per-event GitHub contributions, and judge endorsements.
- **Project Gallery** — A permanent home for every submission with lifecycle status tags: `Demo`, `In-Production`, `Pivoted to Startup`.

### C. Career & Operational Excellence

- **One-Click Internship** — A tagging system for "Value Add-ons" that automates introductions between winners and hiring managers or HR teams.
- **48-Hour Media Vault** — Organizers must upload high-resolution event photos within 48 hours. Failure results in a **Trust Penalty** on their organizer score.
- **Automatic Feedback Loop** — Judges must submit a minimum of three structured feedback points per team before scores can be finalized.
- **Legacy Tracker** — Automated 3-month check-ins track whether prototypes have evolved into products, capturing the real-world impact of every event.

---

## Technical Architecture

```
┌───────────────────────────────────────────────────────┐
│                    CLIENT LAYER                        │
│           Next.js 14 (SEO-optimized,                  │
│           server components, App Router)              │
└────────────────────────┬──────────────────────────────┘
                         │
┌────────────────────────▼──────────────────────────────┐
│                    API LAYER                           │
│     Node.js / TypeScript — scalable for high-          │
│     concurrency event days (judging rushes,           │
│     simultaneous payout triggers)                     │
└──────────┬─────────────────────────┬──────────────────┘
           │                         │
┌──────────▼──────────┐   ┌──────────▼──────────────────┐
│   PostgreSQL DB     │   │     Escrow Microservice      │
│  Structured Proof   │   │  Paystack + Smart Contract   │
│  of Work tracking   │   │  (Polygon / Solana layer)    │
└─────────────────────┘   └─────────────────────────────┘
```

| Layer | Technology | Purpose |
|---|---|---|
| Frontend | Next.js 14 | SEO-optimized project discovery |
| Backend | Node.js / TypeScript | High-concurrency event-day API |
| Database | PostgreSQL | Structured Proof of Work records |
| Payments | Paystack | Fiat deposits, M-Pesa & bank payouts |
| Ledger | Smart Contract (Polygon/Solana) | Transparent, tamper-proof transaction log |
| Open Source Core | GitHub | Judging logic & escrow mechanics are public |

---

## Escrow & Payout Engine

The financial layer is the heart of Trust-as-a-Service and is held to a **90% Trust Score KPI** — meaning 90% of all prizes must be disbursed within one hour of event conclusion.

### Phase 1 — Fund Security (Setup)

```
Organizer                  Paystack              Smart Contract
    │                          │                       │
    │── Deposit 100% prize ───►│                       │
    │                          │── Confirm receipt ───►│
    │                          │                       │── Lock funds in
    │                          │                       │   Prize Vault state
    │◄── "Prize Verified" badge issued ────────────────│
```

1. The organizer transfers 100% of the prize pool via Paystack (card or bank).
2. The backend service records the deposit and triggers the smart contract.
3. The smart contract creates a verifiable ledger entry and locks funds in `PRIZE_VAULT` state.
4. The event is issued a **"Prize Verified"** badge and permitted to go live.

### Phase 2 — Split Disbursement (Closing)

```
Judging finalized
    │
    ▼
Backend Service ──── calls Smart Contract ──── authorizes 50% release
    │
    ▼
Paystack Split API ──── M-Pesa / Bank transfer ──── Winner receives funds
    │
    ▼
Public Ledger entry recorded
    │
    ▼  (organizer confirms handover)
Backend Service ──── calls Smart Contract ──── authorizes final 50%
    │
    ▼
Paystack API ──── Final transfer ──── Public Ledger entry recorded
```

### Error Handling & Compliance

- **Rollback Logic** — If a Paystack call fails or a network error occurs, funds remain locked in the vault until a successful transaction is confirmed. No partial or ambiguous states.
- **KYC / AML Compliance** — All large payouts comply with Central Bank of Kenya requirements via Paystack's verified compliance layer.
- **Idempotent Operations** — Every disbursement call is idempotent; duplicate triggers from retries cannot result in a double payout.

---

## Success Metrics

| KPI | Description | Goal |
|---|---|---|
| **Trust Score** | % of prizes disbursed within 1 hour of event conclusion | > 90% |
| **Conversion Rate** | % of winners landing an interview or internship via the platform | Tracked per cohort |
| **Media Momentum** | Average time for event photos to be available post-event | < 48 hours |
| **Legacy Rate** | % of submitted prototypes that evolve into active products (3-month check-in) | Tracked per cohort |

---

## Roadmap

| Phase | Feature | Status |
|---|---|---|
| v1.0 | Prize Vault & Escrow Engine | In Development |
| v1.0 | Developer Proof of Work Profiles | In Development |
| v1.0 | Paystack Split Disbursement | In Development |
| v1.1 | 48-Hour Media Vault + Trust Penalty | Planned |
| v1.1 | One-Click Internship Matching | Planned |
| v1.2 | Legacy Tracker (3-month check-ins) | Planned |
| v2.0 | **HackVillage DAO** — Community-driven Elite Organizer rankings | Moonshot |
| v2.0 | **Global Node** — Nigeria, Rwanda, cross-border prize handling | Moonshot |
| v2.0 | **AI Judging Co-pilot** — Pre-screen repos for quality & plagiarism | Moonshot |

---

## Getting Started

### Prerequisites

- Node.js >= 18
- PostgreSQL >= 15
- A Paystack account (test keys sufficient for local development)

### Installation

```bash
git clone https://github.com/CodeWithEugene/HackVillage.git
cd HackVillage
npm install
```

### Environment Variables

Create a `.env.local` file at the project root:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/hackvillage
PAYSTACK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=pk_test_...
SMART_CONTRACT_ADDRESS=0x...
RPC_URL=https://...
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Database

```bash
npm run db:migrate
npm run db:seed   # optional — seeds demo events and profiles
```

---

## Contributing

HackVillage is open-source at its core. The judging logic and escrow mechanics are public so the developer community can audit, trust, and improve them.

1. Fork the repository.
2. Create a feature branch: `git checkout -b feature/your-feature-name`
3. Commit your changes following [Conventional Commits](https://www.conventionalcommits.org).
4. Open a pull request with a clear description of what you've changed and why.

Please read `CONTRIBUTING.md` before submitting a PR. All contributors are expected to uphold the [Code of Conduct](CODE_OF_CONDUCT.md).

---

## License

This project is licensed under the terms of the [LICENSE](./LICENSE) file included in this repository.

---

<div align="center">

Built with intention for the African developer community.

**[technetium.co.ke](https://www.technetium.co.ke)** &nbsp;·&nbsp; **[github.com/CodeWithEugene/HackVillage](https://github.com/CodeWithEugene/HackVillage)**

</div>
