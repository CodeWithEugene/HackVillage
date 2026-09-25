import { isCategory, type HackathonCategory } from "@/lib/events/categories";

const PHOTOS = {
  build: "/marketing/how-it-works/build.webp",
  judge: "/marketing/how-it-works/judge.webp",
  launch: "/marketing/how-it-works/launch.webp",
  reward: "/marketing/how-it-works/reward.webp",
  codingFocus: "/marketing/hero/kenya/coding-focus.webp",
  community: "/marketing/hero/kenya/community.webp",
  eventArrival: "/marketing/hero/kenya/event-arrival.webp",
  hackathonPair: "/marketing/hero/kenya/hackathon-pair.webp",
  speaker: "/marketing/hero/kenya/speaker.webp",
  teamBuild: "/marketing/hero/kenya/team-build.webp",
} as const;

export const DEFAULT_COVER = PHOTOS.teamBuild;

/** Until an organizer uploads a cover, a hackathon shows a photo that fits its category. */
const CATEGORY_COVERS: Record<HackathonCategory, string> = {
  ai: PHOTOS.codingFocus,
  web3: PHOTOS.hackathonPair,
  fintech: PHOTOS.launch,
  health: PHOTOS.judge,
  agritech: PHOTOS.community,
  climate: PHOTOS.build,
  edtech: PHOTOS.speaker,
  civic: PHOTOS.eventArrival,
  mobility: PHOTOS.reward,
  security: PHOTOS.codingFocus,
};

export function coverFor(event: { coverUrl: string | null; categories: string[] }): string {
  if (event.coverUrl) return event.coverUrl;
  const first = event.categories.find(isCategory);
  return first ? CATEGORY_COVERS[first] : DEFAULT_COVER;
}
