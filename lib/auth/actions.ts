"use server";

import { createHash, randomBytes } from "node:crypto";

import { hash } from "@node-rs/argon2";
import { redirect } from "next/navigation";
import { z } from "zod";

import { signIn, signOut } from "@/lib/auth";
import { passwordResetEmail, verificationEmail } from "@/lib/auth/mail-templates";
import { candidateHandles, firstAvailableHandle, validateHandle } from "@/lib/auth/handles";
import { passwordSchema } from "@/lib/auth/password-policy";
import { getEnv } from "@/lib/env";
import { sendMail } from "@/lib/ports/mail";
import { prisma } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";

/**
 * Auth server actions (Phase 1). Every mutation is zod-validated and
 * rate-limited. Verification/reset tokens are stored as SHA-256 hashes — a
 * database leak must not leak usable links.
 */

export interface AuthActionState {
  error?: string;
  message?: string;
}

// ── Tokens ────────────────────────────────────────────────────────────────

const VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000; // 24h
const RESET_TTL_MS = 60 * 60 * 1000; // 1h

function newRawToken(): string {
  return randomBytes(32).toString("hex");
}

function tokenHash(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

function appUrl(path: string): string {
  return `${getEnv().NEXT_PUBLIC_APP_URL.replace(/\/$/, "")}${path}`;
}

async function issueToken(email: string, ttlMs: number): Promise<string> {
  const raw = newRawToken();
  await prisma.verificationToken.deleteMany({ where: { identifier: email } });
  await prisma.verificationToken.create({
    data: {
      identifier: email.toLowerCase(),
      token: tokenHash(raw),
      expires: new Date(Date.now() + ttlMs),
    },
  });
  return raw;
}

// ── Password policy ──────────────────────────────────────────────────────
// (see lib/auth/password-policy.ts — "use server" files export async
// functions only)

// ── Sign up (credentials) ────────────────────────────────────────────────

const signUpSchema = z.object({
  name: z.string().trim().min(2, "Tell us your name.").max(80),
  email: z.string().email("That email doesn't look right."),
  password: passwordSchema,
  role: z.enum(["DEVELOPER", "ORGANIZER"]),
  handle: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value === "" ? undefined : value)),
});

export async function signUpAction(
  _prev: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const parsed = signUpSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  }
  const { name, email, password, role, handle } = parsed.data;
  const emailNormalized = email.toLowerCase();

  const limit = rateLimit(`signup:${emailNormalized}`, 5, 60 * 60 * 1000);
  if (!limit.ok) return { error: "Too many attempts — try again later." };

  const existing = await prisma.user.findFirst({
    where: { email: emailNormalized, deletedAt: null },
    select: { id: true },
  });
  if (existing) {
    return { error: "An account with that email already exists — sign in instead." };
  }

  let finalHandle: string;
  if (handle) {
    const handleError = validateHandle(handle);
    if (handleError) return { error: handleError };
    const taken = await prisma.user.findFirst({
      where: { handle: { equals: handle, mode: "insensitive" } },
      select: { id: true },
    });
    if (taken) return { error: "That handle is taken — try another." };
    finalHandle = handle;
  } else {
    const candidates = candidateHandles(emailNormalized.split("@")[0] ?? "developer");
    const taken = await prisma.user.findMany({
      where: { handle: { in: candidates, mode: "insensitive" } },
      select: { handle: true },
    });
    finalHandle = firstAvailableHandle(candidates, taken.map((t) => t.handle)) ?? `dev-${Date.now().toString(36)}`;
  }

  const user = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: {
        name,
        email: emailNormalized,
        passwordHash: await hash(password),
        handle: finalHandle,
        primaryRole: role,
      },
    });
    await tx.roleGrant.create({ data: { userId: created.id, role } });
    if (role === "DEVELOPER") {
      await tx.developerProfile.create({ data: { userId: created.id } });
    }
    return created;
  });

  const token = await issueToken(user.email, VERIFICATION_TTL_MS);
  const template = verificationEmail(appUrl(`/verify-email?token=${token}`));
  await sendMail({ to: user.email, ...template });

  redirect("/signin?registered=1");
}

// ── Sign in / out (credentials) ─────────────────────────────────────────

const signInSchema = z.object({
  email: z.string().email("That email doesn't look right."),
  password: z.string().min(1, "Enter your password."),
});

export async function signInAction(
  _prev: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const parsed = signInSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  }
  const { email, password } = parsed.data;
  const emailNormalized = email.toLowerCase();

  const limit = rateLimit(`signin:${emailNormalized}`, 10, 15 * 60 * 1000);
  if (!limit.ok) {
    return { error: "Too many attempts — wait a few minutes and try again." };
  }

  const user = await prisma.user.findUnique({ where: { email: emailNormalized } });
  if (!user || user.deletedAt) {
    return { error: "Invalid email or password." };
  }
  if (!user.emailVerified) {
    return { error: "EMAIL_NOT_VERIFIED" };
  }

  try {
    await signIn("credentials", {
      email: emailNormalized,
      password,
      redirectTo: user.onboardingCompletedAt ? "/dashboard" : "/onboarding/choose",
    });
  } catch (error) {
    // NEXT_REDIRECT must bubble; everything else is a failed sign-in.
    if (error instanceof Error && error.message === "NEXT_REDIRECT") throw error;
    if ((error as { digest?: string })?.digest?.startsWith("NEXT_REDIRECT")) throw error;
    return { error: "Invalid email or password." };
  }
  return {};
}

export async function signOutAction(): Promise<void> {
  await signOut({ redirectTo: "/" });
}

// ── Email verification ───────────────────────────────────────────────────

export async function verifyEmailAction(token: string): Promise<AuthActionState> {
  if (!/^[a-f0-9]{64}$/.test(token)) return { error: "That verification link is malformed." };

  const record = await prisma.verificationToken.findUnique({ where: { token: tokenHash(token) } });
  if (!record) return { error: "That verification link is invalid or already used." };
  if (record.expires.getTime() <= Date.now()) {
    return { error: "That verification link has expired." };
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { email: record.identifier },
      data: { emailVerified: new Date() },
    }),
    prisma.verificationToken.delete({ where: { token: record.token } }),
  ]);

  return { message: "verified" };
}

export async function resendVerificationAction(
  _prev: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const email = z.string().email().safeParse(String(formData.get("email") ?? ""));
  if (!email.success) return { error: "Enter the email you signed up with." };
  const emailNormalized = email.data.toLowerCase();

  const limit = rateLimit(`verify-resend:${emailNormalized}`, 3, 60 * 60 * 1000);
  if (!limit.ok) return { error: "Verification emails are limited — try again in a while." };

  const user = await prisma.user.findUnique({ where: { email: emailNormalized } });
  if (!user || user.deletedAt || user.emailVerified) {
    // Never reveal account existence.
    return { message: "sent" };
  }

  const token = await issueToken(user.email, VERIFICATION_TTL_MS);
  const template = verificationEmail(appUrl(`/verify-email?token=${token}`));
  await sendMail({ to: user.email, ...template });
  return { message: "sent" };
}

// ── Password reset ───────────────────────────────────────────────────────

export async function requestPasswordResetAction(
  _prev: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const email = z.string().email().safeParse(String(formData.get("email") ?? ""));
  if (!email.success) return { error: "That email doesn't look right." };
  const emailNormalized = email.data.toLowerCase();

  const limit = rateLimit(`reset:${emailNormalized}`, 3, 60 * 60 * 1000);
  if (!limit.ok) return { error: "Reset emails are limited — try again in a while." };

  const user = await prisma.user.findUnique({ where: { email: emailNormalized } });
  if (user && !user.deletedAt && user.passwordHash) {
    const token = await issueToken(user.email, RESET_TTL_MS);
    const template = passwordResetEmail(appUrl(`/reset-password?token=${token}`));
    await sendMail({ to: user.email, ...template });
  }

  // Always the same response — no account enumeration.
  return { message: "sent" };
}

export async function resetPasswordAction(
  _prev: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const parsed = z
    .object({ token: z.string().regex(/^[a-f0-9]{64}$/), password: passwordSchema })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  }

  const record = await prisma.verificationToken.findUnique({
    where: { token: tokenHash(parsed.data.token) },
  });
  if (!record || record.expires.getTime() <= Date.now()) {
    return { error: "That reset link is invalid or has expired." };
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { email: record.identifier },
      data: { passwordHash: await hash(parsed.data.password) },
    }),
    prisma.verificationToken.deleteMany({ where: { identifier: record.identifier } }),
  ]);

  redirect("/signin?reset=1");
}
