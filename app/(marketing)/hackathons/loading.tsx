import { Skeleton, SkeletonCard } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="site-container py-16">
      <header className="mb-8 text-center">
        <Skeleton className="mx-auto h-10 w-96 max-w-full" />
        <Skeleton className="mx-auto mt-3 h-4 w-full max-w-xl" />
      </header>
      <div className="mb-8 flex flex-wrap justify-center gap-2">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-8 w-24 rounded-full" />
        ))}
      </div>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <SkeletonCard key={i} className="h-64 p-0" />
        ))}
      </div>
    </div>
  );
}
