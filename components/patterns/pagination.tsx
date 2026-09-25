import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { pageItems } from "@/lib/blog/pagination";
import { cn } from "@/lib/utils";

type PaginationProps = {
  page: number;
  pageCount: number;
  /** Names the nav landmark, e.g. "Blog pages". */
  label: string;
} & (
  | { hrefFor: (page: number) => string; onSelect?: never }
  | { onSelect: (page: number) => void; hrefFor?: never }
);

const CONTROL =
  "inline-flex h-10 min-w-10 items-center justify-center gap-1 rounded-full px-3 text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:outline-none";
const IDLE = "bg-surface text-ink shadow-card hover:bg-brand/15 hover:text-brand-ink";
const CURRENT = "bg-brand text-brand-ink shadow-card";
const DISABLED = "bg-surface text-muted opacity-50 shadow-card";

/**
 * Numbered page controls: links when the page lives in the URL (the blog
 * index), buttons when it is local state (Keep Reading on a post).
 */
export function Pagination({ page, pageCount, label, hrefFor, onSelect }: PaginationProps) {
  if (pageCount <= 1) return null;

  function control(
    target: number,
    children: ReactNode,
    options: { ariaLabel?: string; isCurrent?: boolean } = {},
  ) {
    const disabled = target < 1 || target > pageCount;
    const className = cn(CONTROL, options.isCurrent ? CURRENT : disabled ? DISABLED : IDLE);
    const ariaCurrent = options.isCurrent ? ("page" as const) : undefined;

    if (disabled) {
      return (
        <span className={className} aria-label={options.ariaLabel} aria-disabled="true">
          {children}
        </span>
      );
    }
    if (hrefFor) {
      return (
        <Link
          href={hrefFor(target)}
          className={className}
          aria-label={options.ariaLabel}
          aria-current={ariaCurrent}
        >
          {children}
        </Link>
      );
    }
    return (
      <button
        type="button"
        onClick={() => onSelect(target)}
        className={className}
        aria-label={options.ariaLabel}
        aria-current={ariaCurrent}
      >
        {children}
      </button>
    );
  }

  return (
    <nav aria-label={label} className="mt-10 flex justify-center">
      <ul className="flex flex-wrap items-center justify-center gap-2">
        <li>
          {control(
            page - 1,
            <>
              <ChevronLeft aria-hidden className="size-4" />
              <span className="hidden sm:inline">Previous</span>
            </>,
            { ariaLabel: "Previous page" },
          )}
        </li>
        {pageItems(page, pageCount).map((item, index) =>
          item === "gap" ? (
            <li key={`gap-${index}`} aria-hidden className="px-1 text-muted">
              …
            </li>
          ) : (
            <li key={item}>
              {control(item, item, { ariaLabel: `Page ${item}`, isCurrent: item === page })}
            </li>
          ),
        )}
        <li>
          {control(
            page + 1,
            <>
              <span className="hidden sm:inline">Next</span>
              <ChevronRight aria-hidden className="size-4" />
            </>,
            { ariaLabel: "Next page" },
          )}
        </li>
      </ul>
    </nav>
  );
}
