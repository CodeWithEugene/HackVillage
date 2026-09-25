import { headers } from "next/headers";
import { after } from "next/server";

import { signInAlertEmail, welcomeEmail } from "@/lib/auth/mail-templates";
import { describeSignIn, signInMethodLabel } from "@/lib/auth/sign-in-context";
import { sendMail } from "@/lib/ports/mail";
import { appUrl } from "@/lib/url";

/**
 * Emails the account owner about a successful sign in (security critical, so
 * it always sends and skips notification preferences). Headers are read now,
 * while the request is live; the email goes out after the response so a slow
 * or failing mail provider never delays or breaks signing in.
 */
export async function queueSignInAlert({
  email,
  provider,
}: {
  email: string;
  provider?: string;
}): Promise<void> {
  try {
    const context = describeSignIn({ headers: await headers(), provider });
    const template = signInAlertEmail(context, appUrl("/forgot-password"));
    after(async () => {
      try {
        await sendMail({ to: email, ...template });
      } catch (error) {
        console.error("[auth] sign in alert failed to send", error);
      }
    });
  } catch (error) {
    // Outside a request (for example a script), there are no headers to describe.
    console.error("[auth] sign in alert skipped", error);
  }
}

/**
 * Welcomes someone who just created an account with Google or GitHub (email
 * sign-ups get the verification email instead). Sent after the response, like
 * the sign in alert, so the mail provider never slows the sign-up down.
 */
export function queueWelcomeEmail({
  email,
  name,
  provider,
}: {
  email: string;
  name?: string | null;
  provider?: string;
}): void {
  const template = welcomeEmail({
    name: name ?? null,
    method: signInMethodLabel(provider),
    setupUrl: appUrl("/onboarding/choose"),
  });
  try {
    after(async () => {
      try {
        await sendMail({ to: email, ...template });
      } catch (error) {
        console.error("[auth] welcome email failed to send", error);
      }
    });
  } catch (error) {
    console.error("[auth] welcome email skipped", error);
  }
}
