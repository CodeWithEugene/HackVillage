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

// Tests must never send real email. A local .env holds a live Brevo key, and
// every test run was mailing (and bouncing off) @hackvillage.test addresses,
// which hurts the sender's reputation. Without a key the mail port logs instead.
process.env.BREVO_API_KEY = "";
