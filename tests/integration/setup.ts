/**
 * Integration environment: loads .env when present (local dev) — CI provides
 * DATABASE_URL directly. Missing env skips nothing: the tests themselves
 * fail loudly if no DATABASE_URL is reachable.
 */
try {
  process.loadEnvFile?.();
} catch {
  // No .env in CI — env comes from the workflow.
}
