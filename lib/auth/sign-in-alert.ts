import { headers } from "next/headers";

import { signInAlertEmail, welcomeEmail } from "@/lib/auth/mail-templates";
import { describeSignIn, signInMethodLabel } from "@/lib/auth/sign-in-context";
import { sendMail, type MailMessage } from "@/lib/ports/mail";
import { appUrl } from "@/lib/url";

/**
 * How long a sign in waits for the mail provider. These emails used to go
 * out after the response with next/server `after()`, but in production those
 * callbacks never reached the provider, so they are sent inline now, capped
 * so a slow provider can only delay a sign in by this much, never break it.
 */
export const SIGN_IN_MAIL_TIMEOUT_MS = 4000;

/** Sends a sign in email; logs the outcome and never throws. */
export async function sendWithinLimit(
  label: string,
  message: MailMessage,
  send: (message: MailMessage) => Promise<{ delivered: boolean }> = sendMail,
  timeoutMs: number = SIGN_IN_MAIL_TIMEOUT_MS,
): Promise<"sent" | "not-sent" | "timeout" | "failed"> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const timeout = new Promise<"timeout">((resolve) => {
      timer = setTimeout(() => resolve("timeout"), timeoutMs);
    });
    const result = await Promise.race([send(message), timeout]);
    if (result === "timeout") {
      console.error(`[auth] ${label} timed out after ${timeoutMs}ms`);
      return "timeout";
    }
    if (result.delivered) {
      console.info(`[auth] ${label} sent`);
      return "sent";
    }
    // Without a mail key (dev and tests) the port prints the email instead.
    return "not-sent";
  } catch (error) {
    console.error(`[auth] ${label} failed to send`, error);
    return "failed";
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Emails the account owner about a successful sign in (security critical, so
 * it always sends and skips notification preferences).
 */
export async function sendSignInAlert({
  email,
  provider,
}: {
  email: string;
  provider?: string;
}): Promise<void> {
  let template;
  try {
    const context = describeSignIn({ headers: await headers(), provider });
    template = signInAlertEmail(context, appUrl("/forgot-password"));
  } catch (error) {
    // Outside a request (for example a script), there are no headers to describe.
    console.error("[auth] sign in alert skipped", error);
    return;
  }
  await sendWithinLimit("sign in alert", { to: email, ...template });
}

/**
 * Welcomes someone who just created an account with Google or GitHub (email
 * sign-ups get the verification email instead).
 */
export async function sendWelcomeEmail({
  email,
  name,
  provider,
}: {
  email: string;
  name?: string | null;
  provider?: string;
}): Promise<void> {
  const template = welcomeEmail({
    name: name ?? null,
    method: signInMethodLabel(provider),
    setupUrl: appUrl("/onboarding/choose"),
  });
  await sendWithinLimit("welcome email", { to: email, ...template });
}
