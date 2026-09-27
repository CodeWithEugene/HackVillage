import { Skeleton, SkeletonCard } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-8 w-56" />
        <Skeleton className="mt-2 h-4 w-80 max-w-full" />
      </div>
      <SkeletonCard>
        <ul className="space-y-3">
          {[0, 1, 2].map((i) => (
            <li key={i} className="flex flex-wrap items-center justify-between gap-3 py-2">
              <div className="space-y-2">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-4 w-32" />
              </div>
              <Skeleton className="h-9 w-24 rounded-full" />
            </li>
          ))}
        </ul>
      </SkeletonCard>
    </div>
  );
}
