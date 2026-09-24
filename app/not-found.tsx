import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 px-4 text-center">
      <p className="font-display text-8xl font-bold text-ink">
        4<span className="bg-brand px-2">0</span>4
      </p>
      <div>
        <h1 className="font-display text-2xl font-bold text-ink">This Page Took A Wrong Turn</h1>
        <p className="mt-2 text-muted">
          The page you are looking for does not exist — or is not built yet.
        </p>
      </div>
      <div className="flex gap-3">
        <Link href="/">
          <Button>Back Home</Button>
        </Link>
        <Link href="/events">
          <Button variant="secondary">Browse Events</Button>
        </Link>
      </div>
    </div>
  );
}
