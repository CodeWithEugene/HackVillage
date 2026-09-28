import type { ListingStats as Stats } from "@/lib/events/listing";

const compactKes = new Intl.NumberFormat("en-KE", {
  notation: "compact",
  maximumFractionDigits: 1,
});

/**
 * Live figures, computed from the same listing the page renders, so every
 * number here is one a visitor can check by scrolling down.
 */
export function ListingStats({ stats }: { stats: Stats }) {
  const items = [
    {
      value: `KES ${compactKes.format(stats.escrowedKes)}`,
      label: "locked in escrow for live and upcoming hackathons",
    },
    { value: String(stats.openForRegistration), label: "hackathons open for registration" },
    {
      value: String(stats.teamsRegistered),
      label: "teams registered for live and upcoming hackathons",
    },
    { value: String(stats.completed), label: "hackathons completed, results on the record" },
  ];
  return (
    <section className="lp-section" aria-labelledby="hk-stats-heading">
      <div className="lp-frame lp-block lp-divided">
        <h2 id="hk-stats-heading" className="lp-statement lp-statement-sm">
          Live on HackVillage right now.{" "}
          <span>Every figure below comes from the hackathons listed on this page.</span>
        </h2>
        <ul className="hk-stats">
          {items.map((item) => (
            <li key={item.label}>
              <span className="hk-stats-value">{item.value}</span>
              <span className="hk-stats-label">{item.label}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
