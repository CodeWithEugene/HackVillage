const SECTION_NUMBER = /^\s*\d+\.\s*/;

/** "10. International Data Transfers" → "International Data Transfers" */
export function tocLabel(heading: string): string {
  return heading.replace(SECTION_NUMBER, "").trim();
}

/** Stable, unique anchor ids for a document's section headings, in order. */
export function headingSlugs(headings: string[]): string[] {
  const seen = new Map<string, number>();
  return headings.map((heading, index) => {
    const base =
      tocLabel(heading)
        .toLowerCase()
        .replace(/['’]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "") || `section-${index + 1}`;
    const count = (seen.get(base) ?? 0) + 1;
    seen.set(base, count);
    return count === 1 ? base : `${base}-${count}`;
  });
}
