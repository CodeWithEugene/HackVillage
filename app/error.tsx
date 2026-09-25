"use client";

import { useEffect } from "react";

import { ErrorState } from "@/components/patterns/error-state";

/** App wide error boundary: the designed error state, never a raw stack trace. */
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

  return <ErrorState error={error} reset={reset} />;
}
