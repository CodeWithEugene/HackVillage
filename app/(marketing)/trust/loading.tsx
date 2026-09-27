import { Skeleton, SkeletonCard } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="site-container py-16">
      <header className="mb-10 text-center">
        <Skeleton className="mx-auto h-10 w-72" />
        <Skeleton className="mx-auto mt-3 h-4 w-full max-w-2xl" />
        <Skeleton className="mx-auto mt-2 h-4 w-2/3 max-w-xl" />
      </header>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <SkeletonCard key={i} className="h-32" />
        ))}
      </div>
      <Skeleton className="mt-10 h-7 w-40" />
      <SkeletonCard className="mt-4 h-72 p-0" />
    </div>
  );
}
