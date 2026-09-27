import { Skeleton, SkeletonCard } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Skeleton className="h-8 w-56" />
          <Skeleton className="mt-2 h-4 w-72" />
        </div>
        <Skeleton className="h-6 w-28 rounded-full" />
      </div>
      <SkeletonCard className="h-24" />
      <SkeletonCard className="h-56" />
      <SkeletonCard className="h-44" />
      <SkeletonCard className="h-40" />
    </div>
  );
}
