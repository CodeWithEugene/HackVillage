"use client";

import { useEffect } from "react";

import "./globals.css";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[global-error]", error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <div className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-paper px-4 text-center">
          <div>
            <h1 className="font-display text-2xl font-bold text-ink">Something Went Wrong</h1>
            <p className="mt-2 max-w-md text-muted">
              The app hit an unexpected error and could not load. Your data is safe. Money
              operations fail closed on this platform. Try reloading, and if it persists, contact
              support with the reference below.
            </p>
            {error.digest ? (
              <p className="mt-2 font-mono text-xs text-muted">Ref: {error.digest}</p>
            ) : null}
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={reset}
              className="rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-ink"
            >
              Try Again
            </button>
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- this boundary replaces the root layout, so a plain reload is the safest recovery path */}
            <a
              href="/"
              className="rounded-full bg-ink/5 px-5 py-2.5 text-sm font-semibold text-ink-soft"
            >
              Back Home
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
