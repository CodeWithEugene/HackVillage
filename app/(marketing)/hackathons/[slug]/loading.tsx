import { Skeleton, SkeletonCard } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="site-container py-12">
      <div className="text-center">
        <Skeleton className="mx-auto h-6 w-32 rounded-full" />
        <Skeleton className="mx-auto mt-4 h-10 w-3/4 max-w-2xl" />
        <Skeleton className="mx-auto mt-2 h-5 w-full max-w-2xl" />
      </div>
      <div className="mt-10 grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <SkeletonCard className="h-64" />
          <SkeletonCard className="h-40" />
        </div>
        <div className="space-y-6">
          <SkeletonCard className="h-48" />
          <SkeletonCard className="h-56" />
        </div>
      </div>
    </div>
  );
}
