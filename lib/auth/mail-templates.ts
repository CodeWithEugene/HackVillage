/**
 * Auth email templates: verification, password reset, password changed, and
 * the account deactivation notice. These are security critical, so they
 * always send and never carry an unsubscribe link.
 */
import type { SignInContext } from "@/lib/auth/sign-in-context";
import { renderEmail, renderText, type EmailTemplate } from "@/lib/notifications/layout";

export type { EmailTemplate };

export function verificationEmail(url: string): EmailTemplate {
  return {
    subject: "Verify Your HackVillage Email",
    html: renderEmail({
      preheader: "One click to verify your email.",
      section: {
        heading: "Welcome To HackVillage",
        bodyHtml: `<p style="margin:0;">Confirm your email address to finish creating your account.</p>`,
        ctaUrl: url,
        ctaLabel: "Verify My Email",
      },
    }),
    text: renderText(["Welcome to HackVillage.", `Confirm your email address: ${url}`]),
  };
}

export function passwordResetEmail(url: string): EmailTemplate {
  return {
    subject: "Reset Your HackVillage Password",
    html: renderEmail({
      preheader: "A password reset was requested for your account.",
      section: {
        heading: "Reset Your Password",
        bodyHtml: `<p style="margin:0;">We got a request to reset your password. This link expires in one hour.</p>`,
        ctaUrl: url,
        ctaLabel: "Choose A New Password",
      },
    }),
    text: renderText([
      "We got a request to reset your password. This link expires in one hour.",
      url,
    ]),
  };
}

export function passwordChangedEmail(): EmailTemplate {
  return {
    subject: "Your HackVillage Password Was Changed",
    html: renderEmail({
      preheader: "Your password was just changed.",
      section: {
        heading: "Password Changed",
        bodyHtml: `<p style="margin:0;">Your HackVillage password was just changed. If this was you, there is nothing else to do.</p>
          <p style="margin:12px 0 0;">If you did not make this change, reset your password right away and contact us at info@hackvillage.xyz.</p>`,
      },
    }),
    text: renderText([
      "Your HackVillage password was just changed.",
      "If this was not you, reset your password right away and contact info@hackvillage.xyz.",
    ]),
  };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Sent on every successful sign in so the owner spots one that wasn't them. */
export function signInAlertEmail(context: SignInContext, resetUrl: string): EmailTemplate {
  const details = [
    { label: "Time", value: context.time },
    { label: "Device", value: context.device },
    { label: "Browser", value: context.browser },
    { label: "Approximate location", value: context.location },
    { label: "IP address", value: context.ip },
    { label: "Signed in with", value: context.method },
  ];
  return {
    subject: "New Sign In To Your HackVillage Account",
    html: renderEmail({
      preheader: `New sign in from ${escapeHtml(context.device)} in ${escapeHtml(context.location)}.`,
      section: {
        heading: "New Sign In",
        bodyHtml: `<p style="margin:0;">Your HackVillage account was just signed in to. Here are the details we saw.</p>
          <p style="margin:12px 0 0;">If this was you, there is nothing else to do. If it wasn't, reset your password right away and contact us at info@hackvillage.xyz.</p>`,
        details: details.map((row) => ({ label: row.label, value: escapeHtml(row.value) })),
        ctaUrl: resetUrl,
        ctaLabel: "Reset My Password",
      },
      footerHtml:
        "You are receiving this because your HackVillage account was signed in to. We send it for every sign in, and it can't be turned off.",
    }),
    text: renderText([
      "Your HackVillage account was just signed in to.",
      ...details.map((row) => `${row.label}: ${row.value}`),
      "If this was you, there is nothing else to do.",
      `If it wasn't you, reset your password right away and contact info@hackvillage.xyz: ${resetUrl}`,
    ]),
  };
}

export function accountDeactivatedEmail(): EmailTemplate {
  return {
    subject: "Your HackVillage Account Was Deactivated",
    html: renderEmail({
      preheader: "Your account has been deactivated.",
      section: {
        heading: "Account Deactivated",
        bodyHtml: `<p style="margin:0;">Your HackVillage account has been deactivated, as you asked.</p>
          <p style="margin:12px 0 0;">Any payout you are still owed remains protected and will still be paid out on schedule. If you did not request this, contact us right away at info@hackvillage.xyz.</p>`,
      },
    }),
    text: renderText([
      "Your HackVillage account has been deactivated, as you asked.",
      "Any payout you are still owed remains protected and will still be paid out on schedule.",
      "If you did not request this, contact info@hackvillage.xyz right away.",
    ]),
  };
}
