export async function register(): Promise<void> {
  // Jobs (pg-boss + Prisma) only run on the Node.js runtime — never the edge.
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Never registered during `next build` collection passes.
    if (process.env.NEXT_PHASE !== "phase-production-build") {
      const { registerJobs } = await import("@/lib/jobs/handlers");
      await registerJobs();
    }
  }
}
