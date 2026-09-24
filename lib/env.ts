import { z } from "zod";

/**
 * Validated server environment (plan §9 error contract, P9 type safety).
 *
 * Lazy by design: importing this module never throws — only calling
 * `getEnv()` does — so `next build` does not require real secrets. CI passes
 * dummies (see .github/workflows/ci.yml); production misconfiguration fails
 * loudly at the first runtime use instead of silently defaulting.
 *
 * New variables: add them here with a sensible default when optional, or
 * required when a money path depends on them.
 */
const serverEnvSchema = z.object({
  DATABASE_URL: z.string().min(1),
  NEXTAUTH_SECRET: z.string().min(16),
  NEXTAUTH_URL: z.string().url(),
  NEXT_PUBLIC_APP_URL: z.string().url(),

  // Ops defaults (Decision D1/D3, ADR-012)
  PLATFORM_FEE_BPS: z.coerce.number().int().min(0).max(1000).default(500),
  MIN_PRIZE_POOL_KES: z.coerce.number().int().positive().default(10_000),
  PAYOUT_MANUAL_REVIEW_THRESHOLD_KES: z.coerce.number().int().positive().default(500_000),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

let cached: ServerEnv | null = null;

export function getEnv(): ServerEnv {
  if (cached) return cached;

  const parsed = serverEnvSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .join("; ");
    throw new Error(`Invalid environment configuration — ${issues}`);
  }

  cached = parsed.data;
  return cached;
}

/** Test helper — clears the memoized env (used by future unit tests). */
export function resetEnvCache(): void {
  cached = null;
}
