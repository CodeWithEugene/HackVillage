import { Skeleton, SkeletonCard } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="site-container py-16">
      <div className="mx-auto max-w-3xl">
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="mt-2 h-4 w-40" />
        <div className="mt-3 flex gap-1.5">
          <Skeleton className="h-6 w-40 rounded-full" />
          <Skeleton className="h-6 w-28 rounded-full" />
        </div>
        <Skeleton className="mt-6 h-20 w-full rounded-2xl" />
        <Skeleton className="mt-10 h-7 w-48" />
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <SkeletonCard key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="mt-10 h-7 w-36" />
        <div className="mt-4 space-y-3">
          {[0, 1, 2].map((i) => (
            <SkeletonCard key={i} className="h-20" />
          ))}
        </div>
      </div>
    </div>
  );
}
