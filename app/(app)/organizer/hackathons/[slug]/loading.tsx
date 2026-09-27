import { Skeleton, SkeletonCard } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-8 w-72" />
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Skeleton className="h-6 w-28 rounded-full" />
          <Skeleton className="h-6 w-24 rounded-full" />
          <Skeleton className="h-4 w-40" />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <SkeletonCard key={i} className="h-28" />
        ))}
      </div>
      <SkeletonCard className="h-20" />
      <SkeletonCard className="h-72" />
    </div>
  );
}
