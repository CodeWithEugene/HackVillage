import { Resend } from "resend";

import { getEnv } from "@/lib/env";

/**
 * Mail port (ADR-001 anti-corruption layer). One send function for the whole
 * platform. In dev (no RESEND_API_KEY), mail "sends" to the console so flows
 * are fully testable without credentials.
 */
export interface MailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export interface MailResult {
  delivered: boolean;
}

let cachedClient: Resend | null = null;

function client(): Resend | null {
  const env = getEnv();
  if (!env.RESEND_API_KEY) return null;
  cachedClient ??= new Resend(env.RESEND_API_KEY);
  return cachedClient;
}

export async function sendMail(message: MailMessage): Promise<MailResult> {
  const resend = client();
  const from = getEnv().EMAIL_FROM;

  if (!resend) {
    // Dev fallback — visible in the server log so verification/reset links
    // can be completed locally without an email provider.
    console.log(
      `[mail:dev] from=${from} to=${message.to} subject="${message.subject}"\n${message.text}`
    );
    return { delivered: false };
  }

  const { error } = await resend.emails.send({
    from,
    to: message.to,
    subject: message.subject,
    html: message.html,
    text: message.text,
  });

  if (error) {
    console.error("[mail] send failed", error);
    return { delivered: false };
  }

  return { delivered: true };
}
