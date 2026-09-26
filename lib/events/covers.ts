import { isCategory, type HackathonCategory } from "@/lib/events/categories";
import { RENAMED_IMAGES } from "@/lib/seo/renamed-images";

export const DEFAULT_COVER = "/marketing/blog/kenyan-developers-building-together.webp";

/** Category-specific compositions work in both the 21:9 cards and 16:9 detail panel. */
const CATEGORY_COVERS: Record<HackathonCategory, string> = {
  ai: "/marketing/hackathons/ai-hackathon-kenya.webp",
  web3: "/marketing/hackathons/web3-hackathon-kenya.webp",
  fintech: "/marketing/hackathons/fintech-hackathon-kenya.webp",
  health: "/marketing/hackathons/health-tech-hackathon-kenya.webp",
  agritech: "/marketing/hackathons/agritech-hackathon-kenya.webp",
  climate: "/marketing/hackathons/climate-tech-hackathon-kenya.webp",
  edtech: "/marketing/hackathons/edtech-hackathon-kenya.webp",
  civic: "/marketing/hackathons/civic-tech-hackathon-kenya.webp",
  mobility: "/marketing/hackathons/mobility-hackathon-kenya.webp",
  security: "/marketing/hackathons/cybersecurity-hackathon-kenya.webp",
};

// Older seed records stored generic marketing photos as explicit covers. Resolve
// those placeholders here so existing databases get the new imagery too. Both
// the original paths (what databases store) and the renamed ones count.
const LEGACY_STOCK_FOLDERS = ["/marketing/how-it-works/", "/marketing/hero/kenya/"];
const LEGACY_STOCK_COVERS = new Set(
  Object.entries(RENAMED_IMAGES)
    .filter(([oldPath]) => LEGACY_STOCK_FOLDERS.some((folder) => oldPath.startsWith(folder)))
    .flat(),
);

export function coverFor(event: { coverUrl: string | null; categories: string[] }): string {
  if (event.coverUrl && !LEGACY_STOCK_COVERS.has(event.coverUrl)) return event.coverUrl;
  const first = event.categories.find(isCategory);
  return first ? CATEGORY_COVERS[first] : DEFAULT_COVER;
}
