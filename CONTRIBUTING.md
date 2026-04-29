# Contributing to HackVillage

Thank you for your interest in contributing to HackVillage. This project is open-source at its core — the judging logic and escrow mechanics are public so the developer community can audit, trust, and improve them. Every contribution, from a bug report to a full feature, moves that mission forward.

Please read this document carefully before opening issues or submitting pull requests.

---

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Ways to Contribute](#ways-to-contribute)
- [Reporting Bugs](#reporting-bugs)
- [Suggesting Features](#suggesting-features)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Branching Strategy](#branching-strategy)
- [Commit Message Convention](#commit-message-convention)
- [Pull Request Process](#pull-request-process)
- [Code Style](#code-style)
- [Testing](#testing)
- [Working with the Escrow Layer](#working-with-the-escrow-layer)
- [Security Vulnerabilities](#security-vulnerabilities)
- [License](#license)

---

## Code of Conduct

By participating in this project you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md). We are committed to maintaining a welcoming and respectful community. Violations can be reported to the maintainers at the contact address listed in that document.

---

## Ways to Contribute

You do not need to write code to contribute meaningfully:

- **Bug reports** — Found something broken? Open a detailed issue.
- **Feature requests** — Have an idea that fits the roadmap? Start a discussion.
- **Code** — Fix a bug, implement a roadmap feature, or improve performance.
- **Documentation** — Improve the README, this guide, or inline code comments where the *why* is non-obvious.
- **Smart contract audits** — The escrow contract logic is public. Review it, flag concerns, and open an issue with findings.
- **Design & UX** — Propose UI improvements via issues with mockups or wireframes attached.
- **Testing** — Improve coverage, especially for edge cases in the escrow and payout engine.

---

## Reporting Bugs

Before filing a bug report, search existing issues to avoid duplicates.

When opening a new issue, use the **Bug Report** template and include:

1. **Steps to reproduce** — Precise, numbered steps.
2. **Expected behavior** — What should have happened.
3. **Actual behavior** — What actually happened, including any error messages or stack traces.
4. **Environment** — OS, Node.js version, browser (if frontend), and relevant environment variables (redact secrets).
5. **Severity** — Does this block a core flow (escrow, payout, judging) or is it cosmetic?

For escrow or payout bugs, always include the transaction reference or smart contract interaction hash if available.

---

## Suggesting Features

Open a **Feature Request** issue and describe:

1. **The problem** — What user need or gap does this address?
2. **The proposed solution** — A clear description of the behavior you want.
3. **Alternatives considered** — Other approaches you ruled out and why.
4. **Roadmap alignment** — Does this fit an existing roadmap item or is it a new direction?

Large features (new escrow flows, DAO mechanics, cross-border payment rails) should be discussed in an issue and reach rough consensus before any code is written.

---

## Development Setup

### Prerequisites

| Requirement | Minimum Version |
|---|---|
| Node.js | 18.x |
| npm | 9.x |
| PostgreSQL | 15.x |
| Git | 2.x |

You will also need:

- A **Paystack** account — test keys are sufficient for local development.
- An RPC endpoint for the target chain (Polygon Mumbai testnet or Solana Devnet) for escrow contract work.

### Installation

```bash
# 1. Fork the repository on GitHub, then clone your fork
git clone https://github.com/<your-username>/HackVillage.git
cd HackVillage

# 2. Add the upstream remote
git remote add upstream https://github.com/CodeWithEugene/HackVillage.git

# 3. Install dependencies
npm install

# 4. Copy the environment template and fill in your values
cp .env.example .env.local
```

### Environment Variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `PAYSTACK_SECRET_KEY` | Paystack secret key (`sk_test_...` for local) |
| `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` | Paystack public key (`pk_test_...` for local) |
| `SMART_CONTRACT_ADDRESS` | Deployed escrow contract address |
| `RPC_URL` | JSON-RPC endpoint for the target chain |
| `NEXTAUTH_SECRET` | Random secret for session signing |
| `NEXTAUTH_URL` | Base URL (`http://localhost:3000` locally) |

Never commit `.env.local` or any file containing real credentials.

### Running Locally

```bash
# Start the development server
npm run dev

# Run database migrations
npm run db:migrate

# (Optional) Seed demo data
npm run db:seed
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Project Structure

```
HackVillage/
├── app/                  # Next.js App Router — pages and layouts
├── components/           # Shared React components
├── lib/                  # Shared utilities, DB client, API helpers
├── services/
│   ├── escrow/           # Escrow microservice — Paystack + smart contract calls
│   └── payout/           # Split disbursement logic
├── contracts/            # Smart contract source and ABI
├── db/
│   ├── migrations/       # PostgreSQL migrations
│   └── seeds/            # Seed data for development
├── public/               # Static assets
└── tests/                # Unit and integration tests
```

Changes to `services/escrow/` and `contracts/` carry the highest risk and require the most thorough review. See [Working with the Escrow Layer](#working-with-the-escrow-layer) before touching those areas.

---

## Branching Strategy

| Branch | Purpose |
|---|---|
| `main` | Production-ready code. Protected. Merge via PR only. |
| `develop` | Integration branch for completed features. |
| `feature/<name>` | New features — branch from `develop`. |
| `fix/<name>` | Bug fixes — branch from `develop` (or `main` for hotfixes). |
| `chore/<name>` | Tooling, dependencies, non-functional changes. |
| `docs/<name>` | Documentation-only changes. |

```bash
# Start a feature branch
git checkout develop
git pull upstream develop
git checkout -b feature/your-feature-name
```

Never commit directly to `main` or `develop`.

---

## Commit Message Convention

HackVillage uses [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/). Every commit message must follow this format:

```
<type>(<scope>): <short summary>

[optional body]

[optional footer(s)]
```

### Types

| Type | When to use |
|---|---|
| `feat` | A new feature visible to end users |
| `fix` | A bug fix |
| `docs` | Documentation changes only |
| `style` | Formatting, whitespace — no logic change |
| `refactor` | Code restructure with no feature or bug change |
| `test` | Adding or updating tests |
| `chore` | Build process, dependency updates, tooling |
| `perf` | Performance improvements |
| `ci` | CI/CD configuration changes |

### Scopes

Use one of the following scopes where applicable: `escrow`, `payout`, `profiles`, `events`, `auth`, `db`, `contracts`, `ui`, `api`, `docs`.

### Examples

```
feat(escrow): lock prize pool on event publication

fix(payout): prevent duplicate disbursement on retry

docs(contributing): add escrow layer guidance

test(payout): add integration test for M-Pesa payout failure rollback
```

Breaking changes must include `BREAKING CHANGE:` in the commit footer.

---

## Pull Request Process

1. **Keep PRs focused** — One feature or fix per PR. Large PRs are hard to review and slow to merge.
2. **Fill out the PR template** — Every PR must include a summary, the motivation, and a test plan.
3. **Pass all checks** — CI must be green before review is requested: linting, type checks, and tests must all pass.
4. **Link related issues** — Use `Closes #<issue-number>` in the PR description to auto-close the issue on merge.
5. **Request a review** — Assign at least one maintainer as reviewer. Do not merge your own PR.
6. **Respond to feedback** — Address review comments or explain your reasoning. Unresolved threads block merge.
7. **Squash on merge** — Maintainers will squash commits on merge to keep the `develop` history clean.

### PR Checklist

Before marking your PR ready for review, confirm:

- [ ] Code follows the style guidelines in this document
- [ ] New and changed code is covered by tests
- [ ] All existing tests pass (`npm test`)
- [ ] No secrets, credentials, or `.env` files are included
- [ ] The PR description explains the *why*, not just the *what*
- [ ] Escrow/payout changes have been manually tested against the Paystack test environment
- [ ] Smart contract changes include updated ABI and have been tested on a testnet

---

## Code Style

### General

- **TypeScript everywhere** — No plain `.js` files in `app/`, `components/`, `lib/`, or `services/`.
- **Strict mode** — `"strict": true` in `tsconfig.json`. Do not disable strict checks.
- **No `any`** — Use proper types. If the type is genuinely unknown, use `unknown` and narrow it.
- **Named exports** — Prefer named exports over default exports for better refactoring support.

### Formatting & Linting

The project uses ESLint and Prettier. Run before committing:

```bash
npm run lint        # ESLint
npm run format      # Prettier
npm run typecheck   # tsc --noEmit
```

CI will fail on lint or type errors. Do not disable rules with `eslint-disable` without a comment explaining why.

### React / Next.js

- Prefer React Server Components. Use `"use client"` only when necessary (event handlers, browser APIs, hooks).
- Co-locate component-specific styles and helpers with the component file.
- Do not fetch data in client components. Use Server Components or Route Handlers.

### Backend / Services

- Each service function must have a single responsibility.
- All external API calls (Paystack, RPC) must be wrapped in try/catch with explicit error types.
- Payout and escrow operations must be idempotent — retrying a failed call must never cause a double disbursement.

---

## Testing

Tests live in the `tests/` directory, mirroring the source structure.

```bash
npm test              # Run all tests
npm run test:unit     # Unit tests only
npm run test:e2e      # End-to-end tests (requires running dev server)
```

### Requirements

- Every new function in `services/escrow/` and `services/payout/` must have unit tests.
- Payout failure and rollback paths must be covered — these are the highest-risk code paths.
- Integration tests for Paystack interactions must use Paystack's test mode with recorded fixtures; they must not make live network calls in CI.
- Smart contract tests must run against a local hardhat or anchor test node, not a public testnet.

---

## Working with the Escrow Layer

The escrow and payout engine (`services/escrow/`, `services/payout/`, `contracts/`) is the most sensitive part of the codebase. Bugs here can result in funds being locked permanently or paid out incorrectly. Before contributing to these areas:

1. **Read the architecture section** in the README in full.
2. **Open an issue first** for any non-trivial change, even if it looks like a fix. Describe the current behavior, the desired behavior, and your proposed approach. Wait for maintainer acknowledgment before writing code.
3. **Never remove or weaken rollback logic.** If a Paystack call fails or a network error occurs, funds must remain locked in the vault. This is a hard invariant.
4. **Smart contract changes require a testnet deployment** and a link to the verified contract in the PR description before review will begin.
5. **Two maintainer approvals** are required to merge any PR that touches `services/escrow/`, `services/payout/`, or `contracts/`.

---

## Security Vulnerabilities

**Do not open a public GitHub issue for security vulnerabilities.**

Report security issues directly to the maintainers by emailing the address listed in `SECURITY.md`. Include a clear description of the vulnerability, steps to reproduce, and the potential impact. We will acknowledge receipt within 48 hours and aim to release a fix within 14 days for critical issues.

---

## License

By contributing to HackVillage you agree that your contributions will be licensed under the [Apache License 2.0](./LICENSE) that covers this project. You retain copyright over your own contributions; by submitting a PR you grant the project a perpetual, irrevocable license to use, modify, and distribute your contribution under those terms.
