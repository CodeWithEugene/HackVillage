/** Two rows of cards on a wide screen. */
export const BLOG_PAGE_SIZE = 6;

/** One row of cards under a post. */
export const KEEP_READING_PAGE_SIZE = 3;

export type PageItem = number | "gap";

export function pageCount(total: number, perPage: number): number {
  return Math.max(1, Math.ceil(total / perPage));
}

/** Reads `?page=` leniently: anything missing or invalid is page 1, overshoots clamp to the last page. */
export function parsePage(raw: string | string[] | undefined, count: number): number {
  const value = Array.isArray(raw) ? raw[0] : raw;
  const page = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(page) || page < 1) return 1;
  return Math.min(page, count);
}

export function pageSlice<T>(items: readonly T[], page: number, perPage: number): T[] {
  const start = (page - 1) * perPage;
  return items.slice(start, start + perPage);
}

/**
 * The numbered controls to show: always the first and last page, the pages
 * around the current one, and a gap wherever pages are skipped.
 * pageItems(5, 9) → [1, "gap", 4, 5, 6, "gap", 9]
 */
export function pageItems(current: number, count: number, siblings = 1): PageItem[] {
  const pages = new Set<number>([1, count]);
  for (let page = current - siblings; page <= current + siblings; page += 1) {
    if (page >= 1 && page <= count) pages.add(page);
  }
  const sorted = [...pages].sort((a, b) => a - b);
  return sorted.flatMap((page, index): PageItem[] => {
    const previous = sorted[index - 1];
    if (previous === undefined || page === previous + 1) return [page];
    // A gap of exactly one page shows that page rather than an ellipsis.
    return page === previous + 2 ? [previous + 1, page] : ["gap", page];
  });
}
