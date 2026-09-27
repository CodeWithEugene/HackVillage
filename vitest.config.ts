import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const rootDir = fileURLToPath(new URL("./", import.meta.url));

export default defineConfig({
  test: {
    include: ["tests/unit/**/*.test.ts", "tests/unit/**/*.test.tsx", "tests/integration/**/*.test.ts"],
    environment: "node",
    setupFiles: ["tests/integration/setup.ts"],
    testTimeout: 30_000,
    coverage: {
      provider: "v8",
      // Coverage gate is scoped to the money paths (audit); `pnpm test` stays
      // fast and coverage-free, `pnpm test:coverage` (CI) enforces the gate.
      include: ["services/escrow/**", "services/payout/**"],
      thresholds: {
        // ratchet toward 90 (plan §14) — floor measured 2026-09-27:
        // lines 77.5, functions 97.4, statements 77.5
        lines: 75,
        functions: 95,
        statements: 75,
      },
    },
  },
  resolve: {
    alias: {
      "@": rootDir,
    },
  },
});
