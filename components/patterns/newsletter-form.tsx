"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";

import { subscribeAction, type SubscribeState } from "@/lib/newsletter/actions";

/**
 * A real, working newsletter signup. `tone="light"` is for light backgrounds
 * (the footer); the default suits the navy CTA banner.
 */
export function NewsletterForm({ tone = "dark" }: { tone?: "dark" | "light" }) {
  const toneClass = tone === "light" ? " newsletter-light" : "";
  const [state, action, pending] = useActionState<SubscribeState, FormData>(subscribeAction, {});

  if (state.message === "subscribed") {
    return (
      <p className={`newsletter-success${toneClass}`} role="status">
        You&apos;re on the list. Check your inbox for a welcome note.
      </p>
    );
  }

  return (
    <form action={action} className={`newsletter-form${toneClass}`} noValidate>
      <div className="newsletter-field">
        <input
          type="email"
          name="email"
          required
          placeholder="Enter your email"
          aria-label="Email address"
          className="newsletter-input"
        />
        {/* Honeypot: hidden from real visitors, bots fill every field they can find. */}
        <input
          type="text"
          name="company"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          className="newsletter-honeypot"
        />
        <button type="submit" className="newsletter-submit" disabled={pending}>
          {pending ? <Loader2 aria-hidden className="size-4 animate-spin" /> : "Subscribe"}
        </button>
      </div>
      {state.error ? (
        <p className="newsletter-error" role="alert">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
