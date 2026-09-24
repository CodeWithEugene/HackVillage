"use client";

import { useEffect } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

/**
 * System error state (plan §8.4): human sentence + retry + a path to support.
 * Never a raw stack trace in the user's face.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Sentry wiring lands in Phase 9 (plan §16); console for now.
    console.error("[app-error]", error);
  }, [error]);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 px-4 text-center">
      <div>
        <h1 className="font-display text-2xl font-bold text-ink">Something Went Wrong</h1>
        <p className="mt-2 max-w-md text-muted">
          The page hit an unexpected error. Your data is safe — money operations
          fail closed on this platform. Try again, and if it persists, contact
          support with the reference below.
        </p>
        {error.digest ? (
          <p className="mt-2 font-mono text-xs text-muted">Ref: {error.digest}</p>
        ) : null}
      </div>
      <div className="flex gap-3">
        <Button onClick={reset}>Try Again</Button>
        <Link href="/">
          <Button variant="secondary">Back Home</Button>
        </Link>
      </div>
    </div>
  );
}
