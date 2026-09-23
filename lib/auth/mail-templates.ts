/**
 * Branded transactional email templates (Phase 1: verification + password
 * reset). Kept dependency-free: tables/inline styles, ink-on-paper, one
 * yellow button. Values are interpolated by the callers.
 */

export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

function layout(preheader: string, bodyHtml: string): string {
  return `<!doctype html>
<html lang="en">
  <body style="margin:0;padding:0;background-color:#fafbf7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <div style="display:none;max-height:0;overflow:hidden;">${preheader}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#fafbf7;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background-color:#ffffff;border:1px solid #e5e5e0;border-radius:12px;overflow:hidden;">
            <tr>
              <td style="background-color:#222222;padding:24px 32px;color:#ffffff;font-size:18px;font-weight:700;">
                Hack<span style="color:#ffed00;">Village</span>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;color:#222222;font-size:15px;line-height:24px;">
                ${bodyHtml}
              </td>
            </tr>
            <tr>
              <td style="padding:0 32px 32px;">
                <p style="margin:0;color:#6b6b6b;font-size:12px;line-height:18px;">
                  You received this email because an account exists on
                  <a href="https://hackvillage.app" style="color:#222222;">HackVillage</a>.
                  If this wasn't you, you can safely ignore it.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function button(url: string, label: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;">
    <tr>
      <td style="background-color:#ffed00;border-radius:8px;">
        <a href="${url}" style="display:inline-block;padding:12px 28px;color:#222222;font-weight:700;text-decoration:none;">${label}</a>
      </td>
    </tr>
  </table>
  <p style="margin:0 0 8px;color:#6b6b6b;font-size:12px;">Or paste this link into your browser:<br><a href="${url}" style="color:#222222;word-break:break-all;">${url}</a></p>`;
}

export function verificationEmail(url: string): EmailTemplate {
  return {
    subject: "Verify your HackVillage email",
    html: layout(
      "One click to verify your email.",
      `<p style="margin:0 0 8px;">Welcome aboard 👋</p>
       <p style="margin:0;">Confirm your email address to finish creating your HackVillage account.</p>
       ${button(url, "Verify my email")}`
    ),
    text: `Welcome aboard. Confirm your email address: ${url}`,
  };
}

export function passwordResetEmail(url: string): EmailTemplate {
  return {
    subject: "Reset your HackVillage password",
    html: layout(
      "A password reset was requested for your account.",
      `<p style="margin:0;">We received a request to reset your password. This link expires in 1 hour.</p>
       ${button(url, "Choose a new password")}`
    ),
    text: `We received a request to reset your password (expires in 1 hour): ${url}`,
  };
}
