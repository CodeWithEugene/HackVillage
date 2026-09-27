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
    // Report to Sentry only when a public DSN is configured; the SDK is
    // loaded lazily so error reporting never blocks the error UI itself.
    if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
      void import("@sentry/nextjs")
        .then((Sentry) => Sentry.captureException(error))
        .catch(() => undefined);
    }
    console.error("[app-error]", error);
  }, [error]);

  return <ErrorState error={error} reset={reset} />;
}
