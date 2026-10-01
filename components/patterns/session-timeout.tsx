"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";

/** Shared across tabs, so activity in one tab keeps the others signed in. */
const ACTIVITY_KEY = "hv:last-activity";
const ACTIVITY_EVENTS = ["pointerdown", "keydown", "scroll", "touchstart"] as const;
/** How often activity is reported to the server (keeps its idle clock within a minute). */
const PING_EVERY_MS = 60 * 1000;
const WARN_BEFORE_MS = 2 * 60 * 1000;
const CHECK_EVERY_MS = 10 * 1000;
const SIGNED_OUT_URL = "/signin?expired=1";

function readSharedActivity(): number {
  try {
    return Number(window.localStorage.getItem(ACTIVITY_KEY)) || 0;
  } catch {
    return 0;
  }
}

function writeSharedActivity(at: number): void {
  try {
    window.localStorage.setItem(ACTIVITY_KEY, String(at));
  } catch {
    // Private mode or blocked storage: this tab still tracks its own activity.
  }
}

/** Reading the session refreshes it server-side; an empty answer means it already ended. */
async function pingSession(): Promise<boolean> {
  try {
    const response = await fetch("/api/auth/session", { cache: "no-store" });
    if (!response.ok) return true; // A failed request isn't proof the session ended.
    const session: unknown = await response.json();
    return typeof session === "object" && session !== null && "user" in session;
  } catch {
    return true;
  }
}

/**
 * Inactivity sign-out for the signed-in app (limits in lib/auth/session-policy).
 * The server enforces the limit on its own; this keeps it informed while the
 * user is active, warns two minutes before an idle sign-out, and moves an
 * unattended screen to the sign-in page so account details don't stay up.
 */
export function SessionTimeout({ idleMs }: { idleMs: number }) {
  const lastActivity = useRef(0);
  const lastPing = useRef(0);
  const [warning, setWarning] = useState(false);

  const signOutForInactivity = useCallback(() => {
    window.location.assign(SIGNED_OUT_URL);
  }, []);

  const recordActivity = useCallback(() => {
    const now = Date.now();
    lastActivity.current = now;
    writeSharedActivity(now);
    setWarning(false);
    if (now - lastPing.current < PING_EVERY_MS) return;
    lastPing.current = now;
    void pingSession().then((alive) => {
      if (!alive) signOutForInactivity();
    });
  }, [signOutForInactivity]);

  useEffect(() => {
    const now = Date.now();
    lastActivity.current = now;
    lastPing.current = now; // The page load itself just refreshed the session.
    writeSharedActivity(now);

    for (const name of ACTIVITY_EVENTS) {
      window.addEventListener(name, recordActivity, { passive: true });
    }
    const timer = window.setInterval(() => {
      const latest = Math.max(lastActivity.current, readSharedActivity());
      const remaining = latest + idleMs - Date.now();
      if (remaining <= 0) signOutForInactivity();
      else setWarning(remaining <= WARN_BEFORE_MS);
    }, CHECK_EVERY_MS);

    return () => {
      for (const name of ACTIVITY_EVENTS) window.removeEventListener(name, recordActivity);
      window.clearInterval(timer);
    };
  }, [idleMs, recordActivity, signOutForInactivity]);

  if (!warning) return null;

  return (
    <div role="alert" className="session-timeout">
      <p>You&apos;ve been inactive for a while, so you&apos;ll be signed out in two minutes.</p>
      <Button size="sm" onClick={recordActivity}>
        Stay Signed In
      </Button>
    </div>
  );
}
