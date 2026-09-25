/**
 * What a hackathon is about, for tags on cards and the category filter.
 * Keys are stored on Event.categories; labels are what people read.
 */
export const HACKATHON_CATEGORIES = [
  { key: "ai", label: "AI" },
  { key: "web3", label: "Web3" },
  { key: "fintech", label: "Fintech" },
  { key: "health", label: "HealthTech" },
  { key: "agritech", label: "AgriTech" },
  { key: "climate", label: "ClimateTech" },
  { key: "edtech", label: "EdTech" },
  { key: "civic", label: "Civic Tech" },
  { key: "mobility", label: "Mobility" },
  { key: "security", label: "Security" },
] as const;

export type HackathonCategory = (typeof HACKATHON_CATEGORIES)[number]["key"];

/** Enough to say what a hackathon is about without every one claiming every tag. */
export const MAX_CATEGORIES = 3;

export function isCategory(value: unknown): value is HackathonCategory {
  return HACKATHON_CATEGORIES.some((category) => category.key === value);
}

export function categoryLabel(key: HackathonCategory): string {
  return HACKATHON_CATEGORIES.find((category) => category.key === key)?.label ?? key;
}

/** "fintech,ai" from the wizard → known, unique keys, at most MAX_CATEGORIES. */
export function parseCategoryList(raw: string | undefined): HackathonCategory[] {
  const keys = (raw ?? "").split(",").map((value) => value.trim());
  const valid = keys.filter(isCategory);
  return [...new Set(valid)].slice(0, MAX_CATEGORIES);
}
