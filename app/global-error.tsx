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
