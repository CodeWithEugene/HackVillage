"use client";

import { useEffect } from "react";

import { ErrorState } from "@/components/patterns/error-state";

import "./globals.css";

/** Last resort boundary: the root layout itself failed, so render our own html shell. */
export default function GlobalError({
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
    console.error("[global-error]", error);
  }, [error]);

  return (
    <html lang="en">
      <body className="bg-paper">
        <ErrorState error={error} reset={reset} fullReloadHome />
      </body>
    </html>
  );
}
