import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "coverage/**",
    "next-env.d.ts",
    // Hardhat output (contracts carry their own toolchain).
    "artifacts/**",
    "cache/**",
    "typechain-types/**",
    "public/uploads/**",
  ]),
  {
    rules: {
      // Escrow/payout service boundaries are hard (ADR-001): vendor SDKs are
      // only reachable through lib/ports. Kept as a warning until the boundary
      // import lint rule lands in Phase 3.
      "no-restricted-imports": [
        "warn",
        {
          patterns: [
            {
              group: ["ethers"],
              message:
                "Vendor SDKs must be accessed via lib/ports — never imported directly (ADR-001).",
            },
          ],
        },
      ],
    },
  },
]);
