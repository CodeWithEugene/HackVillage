import { getEnv } from "@/lib/env";

/**
 * Mail port (ADR-001 anti-corruption layer). One send function for the whole
 * platform, backed by Brevo's transactional email API. In dev (no
 * BREVO_API_KEY), mail "sends" to the console so flows are fully testable
 * without credentials.
 */
export interface MailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
  headers?: Record<string, string>;
}

export interface MailResult {
  delivered: boolean;
}

const BREVO_SEND_URL = "https://api.brevo.com/v3/smtp/email";

interface EmailAddress {
  email: string;
  name?: string;
}

/** Parses "Name <email@domain>" or a bare "email@domain" into Brevo's shape. */
function parseAddress(value: string): EmailAddress {
  const match = value.match(/^\s*(.*?)\s*<(.+)>\s*$/);
  if (!match) return { email: value.trim() };
  const [, name, email] = match;
  return name ? { email, name } : { email };
}

export async function sendMail(message: MailMessage): Promise<MailResult> {
  const env = getEnv();
  const from = env.EMAIL_FROM;

  if (!env.BREVO_API_KEY) {
    // Dev fallback — visible in the server log so verification/reset links
    // can be completed locally without an email provider.
    console.log(
      `[mail:dev] from=${from} to=${message.to} subject="${message.subject}"\n${message.text}`
    );
    return { delivered: false };
  }

  const response = await fetch(BREVO_SEND_URL, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      "api-key": env.BREVO_API_KEY,
    },
    body: JSON.stringify({
      sender: parseAddress(from),
      to: [parseAddress(message.to)],
      subject: message.subject,
      htmlContent: message.html,
      textContent: message.text,
      headers: message.headers,
    }),
  });

  if (!response.ok) {
    console.error("[mail] send failed", response.status, await response.text());
    return { delivered: false };
  }

  return { delivered: true };
}
