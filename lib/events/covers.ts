import { isCategory, type HackathonCategory } from "@/lib/events/categories";

export const DEFAULT_COVER = "/marketing/blog/team.webp";

/** Category-specific compositions work in both the 21:9 cards and 16:9 detail panel. */
const CATEGORY_COVERS: Record<HackathonCategory, string> = {
  ai: "/marketing/hackathons/ai.webp",
  web3: "/marketing/hackathons/web3.webp",
  fintech: "/marketing/hackathons/fintech.webp",
  health: "/marketing/hackathons/health.webp",
  agritech: "/marketing/hackathons/agritech.webp",
  climate: "/marketing/hackathons/climate.webp",
  edtech: "/marketing/hackathons/edtech.webp",
  civic: "/marketing/hackathons/civic.webp",
  mobility: "/marketing/hackathons/mobility.webp",
  security: "/marketing/hackathons/security.webp",
};

// Older seed records stored generic marketing photos as explicit covers. Resolve
// those placeholders here so existing databases get the new imagery too.
const LEGACY_STOCK_COVERS = new Set([
  ...["build", "judge", "launch", "reward"].map(
    (name) => `/marketing/how-it-works/${name}.webp`,
  ),
  ...[
    "center-developer",
    "coding-focus",
    "community",
    "event-arrival",
    "hackathon-pair",
    "speaker",
    "team-build",
  ].map((name) => `/marketing/hero/kenya/${name}.webp`),
]);

export function coverFor(event: { coverUrl: string | null; categories: string[] }): string {
  if (event.coverUrl && !LEGACY_STOCK_COVERS.has(event.coverUrl)) return event.coverUrl;
  const first = event.categories.find(isCategory);
  return first ? CATEGORY_COVERS[first] : DEFAULT_COVER;
}
