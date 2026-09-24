// Conventional Commits per CONTRIBUTING.md — scopes from the documented set.
// Scope is optional for repo-level commits (docs:, chore:); when present it
// must come from the enum.
/** @type {import('@commitlint/types').UserConfig} */
export default {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "scope-enum": [
      2,
      "always",
      ["escrow", "payout", "profiles", "events", "auth", "db", "contracts", "ui", "api", "docs", "ci"],
    ],
    "scope-empty": [1, "never"], // warn: prefer a scope, allow repo-level commits without one
  },
};
