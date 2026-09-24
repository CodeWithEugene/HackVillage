export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

/**
 * Every rendered email carries this marker in its footer. sendNotification()
 * replaces it with a real unsubscribe link for non critical categories, or
 * strips it for security/money critical mail. Templates never need to know
 * which category they belong to.
 */
export const UNSUBSCRIBE_MARKER = "<!--unsubscribe-slot-->";

const LOGO_URL = "https://www.hackvillage.xyz/branding/HackVillage-Logo.gif";
const TITLE_COLOR = "#01a2f1";
const INK = "#000092";
const MUTED = "#6b6b6b";
const PAPER = "#fafbf7";

export interface EmailSection {
  heading: string;
  bodyHtml: string;
  ctaUrl?: string;
  ctaLabel?: string;
  details?: { label: string; value: string }[];
}

function detailsHtml(details?: { label: string; value: string }[]): string {
  if (!details || details.length === 0) return "";
  const rows = details
    .map(
      (row) =>
        `<p style="margin:0 0 6px;text-align:center;"><span style="color:${MUTED};font-size:13px;">${row.label}</span><br/><span style="color:${INK};font-size:16px;font-weight:700;">${row.value}</span></p>`
    )
    .join("");
  return `<div style="margin:20px 0;padding:16px;background-color:${PAPER};border-radius:8px;">${rows}</div>`;
}

function buttonHtml(url: string, label: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px auto;">
    <tr>
      <td style="background-color:${TITLE_COLOR};border-radius:8px;">
        <a href="${url}" style="display:inline-block;padding:12px 28px;color:#ffffff;font-weight:700;text-decoration:none;font-size:15px;">${label}</a>
      </td>
    </tr>
  </table>
  <p style="margin:0 0 8px;color:${MUTED};font-size:12px;text-align:center;">Or paste this link into your browser.<br/><a href="${url}" style="color:${INK};word-break:break-all;">${url}</a></p>`;
}

/** Renders the shared HackVillage email shell around one content section. */
export function renderEmail(options: { preheader: string; section: EmailSection }): string {
  const { preheader, section } = options;

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8"/>
    <meta name="viewport" content="width=device-width, initial-scale=1"/>
  </head>
  <body style="margin:0;padding:0;background-color:${PAPER};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <div style="display:none;max-height:0;overflow:hidden;">${preheader}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${PAPER};padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background-color:#ffffff;border:1px solid #e5e5e0;border-radius:12px;overflow:hidden;">
            <tr>
              <td style="padding:28px 32px 8px;text-align:center;">
                <img src="${LOGO_URL}" alt="HackVillage" width="180" style="display:block;margin:0 auto;height:auto;max-width:180px;"/>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 32px 0;text-align:center;">
                <h1 style="margin:0;color:${TITLE_COLOR};font-size:22px;font-weight:800;">${section.heading}</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 32px 32px;color:${INK};font-size:15px;line-height:24px;text-align:center;">
                ${section.bodyHtml}
                ${detailsHtml(section.details)}
                ${section.ctaUrl && section.ctaLabel ? buttonHtml(section.ctaUrl, section.ctaLabel) : ""}
              </td>
            </tr>
            <tr>
              <td style="padding:0 32px 28px;text-align:center;">
                <p style="margin:0;color:${MUTED};font-size:12px;line-height:18px;">
                  You are receiving this because an account exists on
                  <a href="https://www.hackvillage.xyz" style="color:${INK};">HackVillage</a>.
                  If this was not you, you can safely ignore it.
                </p>
                ${UNSUBSCRIBE_MARKER}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

/** Builds a plain text fallback matching a section's content, since some clients render text only. */
export function renderText(lines: string[]): string {
  return lines.filter(Boolean).join("\n\n");
}
