"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";

import { subscribeAction, type SubscribeState } from "@/lib/newsletter/actions";

/** Email capture for the CTA banner — a real, working newsletter signup. */
export function NewsletterForm() {
  const [state, action, pending] = useActionState<SubscribeState, FormData>(subscribeAction, {});

  if (state.message === "subscribed") {
    return (
      <p className="newsletter-success" role="status">
        You&apos;re on the list. Check your inbox for a welcome note.
      </p>
    );
  }

  return (
    <form action={action} className="newsletter-form" noValidate>
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
