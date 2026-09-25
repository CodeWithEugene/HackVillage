"use client";

import { useEffect, useState } from "react";
import { signIn } from "next-auth/react";

import {
  OAUTH_POPUP_DONE_PATH,
  OAUTH_POPUP_NAME,
  parseOAuthProvider,
  type OAuthPopupMessage,
} from "@/lib/auth/oauth-popup";

const PROVIDER_NAMES = { google: "Google", github: "GitHub" } as const;

function PopupShell({ title, text }: { title: string; text: string }) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-paper px-6 text-center">
      {/* eslint-disable-next-line @next/next/no-img-element -- animated brand lockup, no static/SVG source */}
      <img src="/branding/HackVillage-Logo.gif" alt="HackVillage" className="h-12 w-auto" />
      <h1 className="font-display text-xl font-bold text-ink">{title}</h1>
      <p className="max-w-xs text-sm text-muted">{text}</p>
    </main>
  );
}

/** Tell the tab that opened the popup how it went, then close. */
export function reportToOpener(message: OAuthPopupMessage): boolean {
  if (!window.opener || window.name !== OAUTH_POPUP_NAME) return false;
  window.opener.postMessage(message, window.location.origin);
  window.close();
  return true;
}

export function OAuthPopupStart({ provider: raw }: { provider: string | null }) {
  const provider = parseOAuthProvider(raw);
  useEffect(() => {
    if (provider) void signIn(provider, { redirectTo: OAUTH_POPUP_DONE_PATH });
  }, [provider]);

  if (!provider) {
    return <PopupShell title="Unknown Sign In Method" text="Close this window and try again." />;
  }
  return (
    <PopupShell
      title={`Connecting To ${PROVIDER_NAMES[provider]}`}
      text="Finish signing in here. This window closes on its own when you are done."
    />
  );
}

export function OAuthPopupDone() {
  const [orphaned, setOrphaned] = useState(false);
  useEffect(() => {
    if (!reportToOpener({ type: OAUTH_POPUP_NAME, status: "success" })) {
      // Opened outside the popup flow (or the original tab was closed): carry on here.
      setOrphaned(true);
      window.location.replace("/dashboard");
    }
  }, []);
  return (
    <PopupShell
      title="You're Signed In"
      text={orphaned ? "Taking you to your dashboard." : "You can close this window."}
    />
  );
}

/**
 * Rendered on /signin: when a provider error lands inside the popup (Auth.js
 * sends errors to the sign in page), pass it back to the original tab.
 */
export function OAuthPopupErrorRelay({ error }: { error?: string }) {
  useEffect(() => {
    if (error) reportToOpener({ type: OAUTH_POPUP_NAME, status: "error", error });
  }, [error]);
  return null;
}
