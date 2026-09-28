// Conventional Commits per CONTRIBUTING.md — scopes from the documented set.
// Scope is optional for repo-level commits (docs:, chore:); when present it
// must come from the enum.
// Commits are authored by the maintainers alone: AI tools are never credited as
// co-authors (GitHub would list them as repo contributors), so the trailer an
// assistant suggests by default fails CI instead of slipping into a squash merge.
const AI_COAUTHOR = /^co-authored-by:.*(claude|anthropic)/im;

/** @type {import('@commitlint/types').UserConfig} */
export default {
  extends: ["@commitlint/config-conventional"],
  plugins: [
    {
      rules: {
        "no-ai-coauthor": ({ raw }) => [
          !AI_COAUTHOR.test(raw ?? ""),
          "remove the AI Co-authored-by trailer: maintainers are the only authors",
        ],
      },
    },
  ],
  rules: {
    "no-ai-coauthor": [2, "always"],
    "scope-enum": [
      2,
      "always",
      ["escrow", "payout", "profiles", "events", "auth", "db", "contracts", "ui", "api", "docs", "ci"],
    ],
    "scope-empty": [1, "never"], // warn: prefer a scope, allow repo-level commits without one
  },
};
