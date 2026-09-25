"use client";

import { useEffect, useRef, useState } from "react";
import { signIn } from "next-auth/react";

import { GithubIcon } from "@/components/icons/github-icon";
import { GoogleIcon } from "@/components/icons/google-icon";
import { Button } from "@/components/ui/button";
import {
  isOAuthPopupMessage,
  OAUTH_POPUP_NAME,
  popupFeatures,
  type OAuthProvider,
} from "@/lib/auth/oauth-popup";

interface OAuthButtonsProps {
  googleEnabled: boolean;
  githubEnabled: boolean;
  /** Where to go once signed in. */
  redirectTo: string;
}

/**
 * Google and GitHub sign in, in a popup so the page stays put. The popup
 * reports back with postMessage (see app/oauth/*); if the browser blocks the
 * popup we fall back to the normal full page redirect.
 */
export function OAuthButtons({ googleEnabled, githubEnabled, redirectTo }: OAuthButtonsProps) {
  const [pending, setPending] = useState<OAuthProvider | null>(null);
  const popupRef = useRef<Window | null>(null);

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin) return;
      if (event.source !== popupRef.current) return;
      if (!isOAuthPopupMessage(event.data)) return;
      popupRef.current = null;
      if (event.data.status === "success") {
        // A full load so every server component sees the new session cookie.
        window.location.assign(redirectTo);
      } else {
        const code = encodeURIComponent(event.data.error ?? "OAuthSignin");
        window.location.assign(`/signin?error=${code}`);
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [redirectTo]);

  // If the person closes the popup themselves, let them try again.
  useEffect(() => {
    if (!pending) return;
    const timer = window.setInterval(() => {
      if (popupRef.current?.closed) {
        popupRef.current = null;
        setPending(null);
      }
    }, 500);
    return () => window.clearInterval(timer);
  }, [pending]);

  function start(provider: OAuthProvider) {
    setPending(provider);
    // Opened synchronously in the click handler so popup blockers allow it.
    const popup = window.open(
      `/oauth/start?provider=${provider}`,
      OAUTH_POPUP_NAME,
      popupFeatures(window),
    );
    if (!popup) {
      void signIn(provider, { redirectTo });
      return;
    }
    popupRef.current = popup;
    popup.focus();
  }

  if (!googleEnabled && !githubEnabled) return null;

  return (
    <>
      <p className="mt-6 text-center text-sm font-semibold text-ink">Continue with:</p>
      <div
        className={`mt-2 grid gap-2 ${googleEnabled && githubEnabled ? "grid-cols-2" : "grid-cols-1"}`}
      >
        {googleEnabled && (
          <Button
            type="button"
            variant="secondary"
            loading={pending === "google"}
            disabled={pending !== null}
            onClick={() => start("google")}
          >
            {pending !== "google" && <GoogleIcon className="size-4" />} Google
          </Button>
        )}
        {githubEnabled && (
          <Button
            type="button"
            variant="secondary"
            loading={pending === "github"}
            disabled={pending !== null}
            onClick={() => start("github")}
          >
            {pending !== "github" && <GithubIcon className="size-4" />} GitHub
          </Button>
        )}
      </div>
      <div className="my-5 flex items-center gap-3 text-xs text-muted">
        <span className="h-px flex-1 bg-ink/10" /> or with email{" "}
        <span className="h-px flex-1 bg-ink/10" />
      </div>
    </>
  );
}
