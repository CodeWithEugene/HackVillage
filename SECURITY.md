# Security Policy

HackVillage handles data that matters to real communities — participant registrations, event records, and organizational information. We take the security of the platform seriously and appreciate the efforts of security researchers and community members who help keep it safe.

## Supported Versions

HackVillage is under active development. Security fixes are applied to the latest code on the `main` branch. If you are running a fork or an older snapshot, please update to the latest version before reporting an issue that may already be fixed.

| Version | Supported |
| ------------------ | ------------------ |
| Latest (`main`) | ✅ |
| Older snapshots | ❌ |

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub issues, discussions, or pull requests.**

Instead, use one of these private channels:

1. **GitHub Security Advisories (preferred):** Use the ["Report a vulnerability"](https://github.com/CodeWithEugene/HackVillage/security/advisories/new) feature on this repository. This keeps the report private while we work on a fix.
2. **Email:** Send details to **cyberuhurultd@gmail.com** with the subject line `[SECURITY] HackVillage`.

### What to include

To help us triage and resolve the issue quickly, please include as much of the following as you can:

- A description of the vulnerability and its potential impact
- The affected component (frontend, backend/API, database layer, deployment configuration, etc.)
- Step-by-step instructions to reproduce the issue
- A proof-of-concept, if available
- Any suggested remediation or mitigation

### What to expect

- **Acknowledgement** of your report within **72 hours**
- An initial **assessment and severity triage** within **7 days**
- Regular updates on our progress until the issue is resolved
- Credit in the release notes or advisory once the fix ships, if you would like to be acknowledged

## Scope

The following are in scope:

- The HackVillage application code in this repository (frontend, backend, and API)
- Authentication, authorization, and session handling
- Data exposure or injection issues (XSS, SQL injection, SSRF, etc.)
- Vulnerabilities in deployment or configuration files committed to this repository

The following are **out of scope**:

- Vulnerabilities in third-party dependencies without a demonstrated impact on HackVillage (please report those upstream)
- Denial-of-service attacks, rate-limiting issues, or volumetric attacks
- Social engineering, phishing, or physical attacks against maintainers or users
- Issues requiring physical access to a user's device

## Responsible Disclosure

We ask that you:

- Give us a reasonable amount of time to fix the issue before any public disclosure (we aim for a fix within 90 days of triage)
- Avoid accessing, modifying, or deleting data that does not belong to you while researching
- Avoid actions that could degrade the service for other users
- Act in good faith — we will not pursue legal action against researchers who follow this policy

## Security Best Practices for Contributors

If you contribute to HackVillage, please follow the guidelines in [CONTRIBUTING.md](./CONTRIBUTING.md), in particular:

- Never commit `.env.local` or any file containing real credentials
- Never commit API keys, tokens, or secrets — use environment variables
- Validate and sanitize all user input on the server side
- Keep dependencies up to date and review dependency changes in pull requests

Thank you for helping keep HackVillage and its community safe.
