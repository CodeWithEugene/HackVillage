import { Skeleton, SkeletonCard } from "@/components/ui/skeleton";

/** Mirrors the listing's layout: hero with cover wall, stats row, filters and grid. */
export default function Loading() {
  return (
    <div className="lp">
      <section className="hk-hero">
        <div className="lp-frame hk-hero-frame">
          <div className="hk-hero-grid">
            <div>
              <Skeleton className="h-12 w-full max-w-lg" />
              <Skeleton className="mt-3 h-12 w-4/5 max-w-md" />
              <Skeleton className="mt-6 h-4 w-full max-w-sm" />
              <div className="mt-8 flex gap-3">
                <Skeleton className="h-11 w-40 rounded-full" />
                <Skeleton className="h-11 w-40 rounded-full" />
              </div>
            </div>
            <div className="hk-wall" aria-hidden="true">
              {[0, 1, 2].map((column) => (
                <div key={column} className={`hk-wall-col hk-wall-col-${column}`}>
                  <Skeleton className="aspect-[3/4] w-full rounded-card" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
      <section className="lp-section">
        <div className="lp-frame lp-block lp-divided">
          <Skeleton className="h-7 w-full max-w-xl" />
          <div className="hk-stats">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </div>
      </section>
      <section className="lp-section">
        <div className="lp-frame lp-block lp-divided">
          <div className="hk-directory-body">
            <div className="hk-sidebar flex flex-col gap-2">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-40 w-full" />
              ))}
            </div>
            <div>
              <Skeleton className="mb-5 h-10 w-full" />
              <div className="hk-grid">
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <SkeletonCard key={i} className="h-96 p-0" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
