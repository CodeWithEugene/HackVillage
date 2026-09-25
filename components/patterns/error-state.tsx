"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Copy } from "lucide-react";

import { ErrorIllustration } from "@/components/patterns/error-illustration";
import { Button } from "@/components/ui/button";

interface ErrorStateProps {
  error: Error & { digest?: string };
  reset: () => void;
  /**
   * The root error boundary replaces the whole layout, so its "Back Home" is a
   * full page load instead of a client side navigation.
   */
  fullReloadHome?: boolean;
}

/**
 * The designed error state (plan: empty and error states are designed, not
 * left to whoever hits them first). A friendly sentence, a way forward, and a
 * reference support can look up. In development it also shows the real
 * message, so a stale dev server or a bad query is obvious at a glance.
 */
export function ErrorState({ error, reset, fullReloadHome = false }: ErrorStateProps) {
  const [copied, setCopied] = useState(false);
  const reference = error.digest;

  async function copyReference() {
    if (!reference) return;
    try {
      await navigator.clipboard.writeText(reference);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard can be blocked; the reference is still visible to copy by hand.
    }
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-paper px-4 py-12 text-center">
      <ErrorIllustration className="w-full max-w-md" />
      <div>
        <h1 className="font-display text-2xl font-bold text-ink sm:text-3xl">
          Something Broke On Our Side
        </h1>
        <p className="mx-auto mt-2 max-w-md text-muted">
          This page hit an unexpected error. Nothing you did caused it, and your account and any
          prize money are safe. Try again, or head back home.
        </p>
      </div>

      <div className="flex flex-wrap justify-center gap-3">
        <Button onClick={reset}>Try Again</Button>
        {fullReloadHome ? (
          // eslint-disable-next-line @next/next/no-html-link-for-pages -- the root layout is gone, so reload fully
          <a href="/">
            <Button variant="secondary" arrow>
              Back Home
            </Button>
          </a>
        ) : (
          <Link href="/">
            <Button variant="secondary" arrow>
              Back Home
            </Button>
          </Link>
        )}
      </div>

      {reference ? (
        <p className="max-w-md text-xs text-muted">
          If it keeps happening, email{" "}
          <a href="mailto:info@hackvillage.xyz" className="font-semibold text-ink underline">
            info@hackvillage.xyz
          </a>{" "}
          with reference{" "}
          <button
            type="button"
            onClick={() => void copyReference()}
            className="inline-flex items-center gap-1 rounded-full bg-ink/5 px-2 py-0.5 font-mono text-ink hover:bg-ink/10"
            aria-label={`Copy reference ${reference}`}
          >
            {reference}
            {copied ? (
              <Check aria-hidden className="size-3" />
            ) : (
              <Copy aria-hidden className="size-3" />
            )}
          </button>
          .
        </p>
      ) : null}

      {process.env.NODE_ENV === "development" ? (
        <details className="w-full max-w-xl rounded-card bg-surface p-4 text-left text-xs shadow-card">
          <summary className="cursor-pointer font-semibold text-ink">
            Error Details (development only)
          </summary>
          <p className="mt-2 font-mono break-words text-danger">{error.message}</p>
          {error.stack ? (
            <pre className="mt-2 max-h-64 overflow-auto font-mono whitespace-pre-wrap text-muted">
              {error.stack}
            </pre>
          ) : null}
        </details>
      ) : null}
    </div>
  );
}
