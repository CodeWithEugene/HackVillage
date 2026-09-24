/**
 * Seed entrypoint. Demo data (a realistic Nairobi event, teams, profiles —
 * plan §17 Phase 2) arrives with Phase 2. Phase 0 ships the wiring so
 * `npm run db:seed` runs and exits cleanly.
 */
async function main(): Promise<void> {
  console.log("Seeding: no demo data yet — arrives in Phase 2 (docs/BUILD_PLAN.md §17).");
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
