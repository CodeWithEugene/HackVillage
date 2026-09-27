import { Skeleton, SkeletonCard } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Skeleton className="h-8 w-56" />
          <Skeleton className="mt-2 h-4 w-72" />
        </div>
        <div className="flex items-center gap-3">
          <Skeleton className="h-6 w-28 rounded-full" />
          <Skeleton className="h-6 w-32 rounded-full" />
        </div>
      </div>
      <SkeletonCard className="h-24" />
      <SkeletonCard className="h-24" />
      <SkeletonCard className="h-48" />
    </div>
  );
}
