/**
 * Google and GitHub sign in run in a small popup window so the page the
 * person is on stays put. Pure helpers shared by the opener and the popup.
 */

export type OAuthProvider = "google" | "github";

/** window.name of the popup, and the `type` of every message it posts. */
export const OAUTH_POPUP_NAME = "hv-oauth";

/** Where the popup lands after the provider sends it back. */
export const OAUTH_POPUP_DONE_PATH = "/oauth/done";

const POPUP_WIDTH = 500;
const POPUP_HEIGHT = 640;

export function parseOAuthProvider(value: string | null | undefined): OAuthProvider | null {
  return value === "google" || value === "github" ? value : null;
}

export function popupFeatures(parent: {
  screenX: number;
  screenY: number;
  outerWidth: number;
  outerHeight: number;
}): string {
  const left = Math.max(0, Math.round(parent.screenX + (parent.outerWidth - POPUP_WIDTH) / 2));
  const top = Math.max(0, Math.round(parent.screenY + (parent.outerHeight - POPUP_HEIGHT) / 2));
  return `popup=yes,width=${POPUP_WIDTH},height=${POPUP_HEIGHT},left=${left},top=${top}`;
}

export type OAuthPopupMessage =
  | { type: typeof OAUTH_POPUP_NAME; status: "success" }
  | { type: typeof OAUTH_POPUP_NAME; status: "error"; error?: string };

export function isOAuthPopupMessage(data: unknown): data is OAuthPopupMessage {
  if (typeof data !== "object" || data === null) return false;
  const message = data as { type?: unknown; status?: unknown };
  return (
    message.type === OAUTH_POPUP_NAME &&
    (message.status === "success" || message.status === "error")
  );
}
