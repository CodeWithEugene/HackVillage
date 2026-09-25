/**
 * Auth email templates: verification, welcome (Google and GitHub sign-ups),
 * sign in alerts, password reset, password changed, and the account
 * deactivation notice. These are security critical, so they
 * always send and never carry an unsubscribe link.
 */
import type { SignInContext } from "@/lib/auth/sign-in-context";
import { renderEmail, renderText, type EmailTemplate } from "@/lib/notifications/layout";
import { html } from "@/lib/notifications/html";

export type { EmailTemplate };

export function verificationEmail(url: string): EmailTemplate {
  return {
    subject: "Verify Your HackVillage Email",
    html: renderEmail({
      preheader: "One click to verify your email.",
      section: {
        heading: "Welcome To HackVillage",
        bodyHtml: html`<p style="margin:0;">Confirm your email address to finish creating your account.</p>`,
        ctaUrl: url,
        ctaLabel: "Verify My Email",
      },
    }),
    text: renderText(["Welcome to HackVillage.", `Confirm your email address: ${url}`]),
  };
}

/**
 * Sent when someone creates an account with Google or GitHub. Email sign-ups
 * get verificationEmail instead, so every new account hears from us once.
 */
export function welcomeEmail(input: { name: string | null; method: string; setupUrl: string }): EmailTemplate {
  const greeting = input.name ? `Welcome, ${input.name.split(" ")[0]}` : "Welcome";
  return {
    subject: "Welcome To HackVillage",
    html: renderEmail({
      preheader: "Your account is ready. Finish setting up in a minute.",
      section: {
        heading: "Welcome To HackVillage",
        bodyHtml: html`<p style="margin:0;">${greeting}. Your HackVillage account was created with ${input.method}.</p>
          <p style="margin:12px 0 0;">Pick how you'll use HackVillage to finish setting up: join hackathons as a builder, or host them as an organizer.</p>
          <p style="margin:12px 0 0;">If you didn't create this account, contact us at info@hackvillage.xyz.</p>`,
        ctaUrl: input.setupUrl,
        ctaLabel: "Finish Setting Up",
      },
    }),
    text: renderText([
      `${greeting}. Your HackVillage account was created with ${input.method}.`,
      `Finish setting up: ${input.setupUrl}`,
      "If you didn't create this account, contact us at info@hackvillage.xyz.",
    ]),
  };
}

export function passwordResetEmail(url: string): EmailTemplate {
  return {
    subject: "Reset Your HackVillage Password",
    html: renderEmail({
      preheader: "A password reset was requested for your account.",
      section: {
        heading: "Reset Your Password",
        bodyHtml: html`<p style="margin:0;">We got a request to reset your password. This link expires in one hour.</p>`,
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
        bodyHtml: html`<p style="margin:0;">Your HackVillage password was just changed. If this was you, there is nothing else to do.</p>
          <p style="margin:12px 0 0;">If you did not make this change, reset your password right away and contact us at info@hackvillage.xyz.</p>`,
      },
    }),
    text: renderText([
      "Your HackVillage password was just changed.",
      "If this was not you, reset your password right away and contact info@hackvillage.xyz.",
    ]),
  };
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
      preheader: `New sign in from ${context.device} in ${context.location}.`,
      section: {
        heading: "New Sign In",
        bodyHtml: html`<p style="margin:0;">Your HackVillage account was just signed in to. Here are the details we saw.</p>
          <p style="margin:12px 0 0;">If this was you, there is nothing else to do. If it wasn't, reset your password right away and contact us at info@hackvillage.xyz.</p>`,
        details,
        ctaUrl: resetUrl,
        ctaLabel: "Reset My Password",
      },
      footerHtml: html`You are receiving this because your HackVillage account was signed in to. We send it for every sign in, and it can't be turned off.`,
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
        bodyHtml: html`<p style="margin:0;">Your HackVillage account has been deactivated, as you asked.</p>
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
