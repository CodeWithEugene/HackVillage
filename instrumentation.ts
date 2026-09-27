export async function register(): Promise<void> {
  // Sentry: DSN-gated, so a boot without SENTRY_DSN never even loads the SDK.
  if (process.env.SENTRY_DSN) {
    if (process.env.NEXT_RUNTIME === "nodejs") {
      await import("./sentry.server.config");
    }
    if (process.env.NEXT_RUNTIME === "edge") {
      await import("./sentry.edge.config");
    }
  }

  // Jobs (pg-boss + Prisma) only run on the Node.js runtime — never the edge.
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Never registered during `next build` collection passes.
    if (process.env.NEXT_PHASE !== "phase-production-build") {
      const { registerJobs } = await import("@/lib/jobs/handlers");
      // A transient DB connection failure here (e.g. a Neon reset at cold
      // start) must never fail server boot — Next.js awaits this hook before
      // serving any request, so an uncaught throw would 500 every route.
      // registerJobs() is safe to retry on the next request/instance.
      await registerJobs().catch((error: unknown) => {
        console.error("[instrumentation] job registration failed — will retry later", error);
      });
    }
  }
}
