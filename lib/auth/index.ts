import NextAuth, { type DefaultSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import GitHub from "next-auth/providers/github";
import type { Provider } from "next-auth/providers";
import { verify } from "@node-rs/argon2";
import { z } from "zod";

import { HackVillageAdapter } from "@/lib/auth/adapter";
import { pickVerifiedGithubEmail } from "@/lib/auth/github-email";
import { oauthSignInAllowed } from "@/lib/auth/oauth-linking";
import { MAX_IDLE_SECONDS, sessionAge, sessionLimitsFor } from "@/lib/auth/session-policy";
import { isSessionCurrent } from "@/lib/auth/session-version";
import { sendSignInAlert, sendWelcomeEmail } from "@/lib/auth/sign-in-alert";
import type { PrimaryRole, Role } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      handle: string;
      primaryRole: PrimaryRole;
      roles: Role[];
      onboardingCompletedAt: Date | null;
      emailVerified: Date | null;
    } & DefaultSession["user"];
  }
}

/** Fresh per-request account state, re-read in the jwt callback. */
interface SessionProfile {
  handle: string;
  primaryRole: PrimaryRole;
  roles: Role[];
  onboardingCompletedAt: string | null;
  emailVerified: string | null;
}

/** Our fields on the Auth.js JWT (typed loosely by the library). */
interface HackVillageToken {
  id?: string;
  /** User.sessionVersion this token was issued under (see session-version.ts). */
  sv?: number;
  /** When the user signed in (ms), for the overall session limit. */
  authTime?: number;
  /** The user's last request (ms), for the inactivity limit. */
  lastActive?: number;
  profile?: SessionProfile;
}

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const providers: Provider[] = [
  Credentials({
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    async authorize(credentials) {
      const parsed = credentialsSchema.safeParse(credentials);
      if (!parsed.success) return null;

      const { email, password } = parsed.data;
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user?.passwordHash || user.deletedAt) return null;

      const valid = await verify(user.passwordHash, password).catch(() => false);
      if (!valid) return null;

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.avatarUrl,
        emailVerified: user.emailVerified,
      };
    },
  }),
];

// OAuth providers activate only when configured — the app runs fully
// functional (credentials flow) without them, e.g. in CI. Called explicitly
// with clientId/clientSecret: this project's env vars are GOOGLE_CLIENT_ID /
// GITHUB_CLIENT_ID, not Auth.js's auto-detected AUTH_GOOGLE_ID / AUTH_GITHUB_ID.
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      // Joins the existing HackVillage account with the same email instead of
      // failing with OAuthAccountNotLinked. Safe only because the signIn
      // callback refuses Google profiles whose email Google hasn't verified.
      allowDangerousEmailAccountLinking: true,
    })
  );
}
if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
  providers.push(
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      // A GitHub sign-in joins the existing HackVillage account with the same
      // email instead of failing with OAuthAccountNotLinked. Safe only because
      // userinfo below takes the email from GitHub's verified addresses.
      allowDangerousEmailAccountLinking: true,
      userinfo: {
        url: "https://api.github.com/user",
        async request({ tokens }: { tokens: { access_token?: string } }) {
          const auth = {
            Authorization: `Bearer ${tokens.access_token}`,
            "User-Agent": "hackvillage",
          };
          const profile = await fetch("https://api.github.com/user", { headers: auth }).then(
            (res) => res.json(),
          );
          const emails = await fetch("https://api.github.com/user/emails", { headers: auth })
            .then((res) => (res.ok ? res.json() : []))
            .catch(() => []);
          // Replace whatever GitHub put on the profile with a verified address.
          return { ...profile, email: pickVerifiedGithubEmail(emails) };
        },
      },
    })
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: HackVillageAdapter(prisma),
  // Auth.js v5 constraint: the Credentials provider requires JWT sessions.
  // Revocation still works: every token carries User.sessionVersion, and the
  // jwt callback ends any session whose version is stale or whose account is
  // gone (ADR-005 amended; see lib/auth/session-version.ts).
  // The cookie lives as long as the longest inactivity window and slides on
  // every request (middleware.ts refreshes it). The exact per-role idle and
  // overall limits are enforced in the jwt callback (lib/auth/session-policy).
  session: { strategy: "jwt", maxAge: MAX_IDLE_SECONDS },
  pages: { signIn: "/signin", error: "/signin" },
  trustHost: true,
  providers,
  events: {
    // Security alert for every sign in, whichever method was used. A brand
    // new Google or GitHub account gets a welcome email instead: that "sign
    // in" is the account being created.
    async signIn({ user, account, isNewUser }) {
      if (!user.email) return;
      if (isNewUser) {
        await sendWelcomeEmail({ email: user.email, name: user.name, provider: account?.provider });
        return;
      }
      await sendSignInAlert({ email: user.email, provider: account?.provider });
    },
  },
  callbacks: {
    // Google and GitHub sign-ins join existing accounts by email, so the email
    // must be one the provider verified. Otherwise the sign-in is refused
    // (shown as AccessDenied).
    async signIn({ user, account, profile }) {
      return oauthSignInAllowed({ provider: account?.provider, email: user.email, profile });
    },
    async jwt({ token: rawToken, user }) {
      const token = rawToken as typeof rawToken & HackVillageToken;
      const now = Date.now();
      // First sign-in: capture the DB id so later requests never resolve by
      // email (OAuth and credentials both provide it here), and start both
      // session clocks.
      if (user?.id) {
        token.id = user.id;
        token.authTime = now;
        token.lastActive = now;
      }
      const userId = token.id;
      if (!userId) return null;

      // Every request re-reads the account (roles, onboarding, deletion) and
      // checks the session version. Returning null ends the session: Auth.js
      // treats the visitor as signed out and clears the cookie.
      const [dbUser, grants] = await Promise.all([
        prisma.user.findUnique({
          where: { id: userId },
          select: {
            handle: true,
            primaryRole: true,
            onboardingCompletedAt: true,
            emailVerified: true,
            deletedAt: true,
            sessionVersion: true,
          },
        }),
        prisma.roleGrant.findMany({ where: { userId }, select: { role: true } }),
      ]);

      // A fresh sign-in adopts the account's current version.
      if (user?.id && dbUser) token.sv = dbUser.sessionVersion;
      if (!dbUser || !isSessionCurrent(token.sv, dbUser)) return null;

      // Inactivity and overall limits (stricter for admins). Past either one
      // the session ends and the user signs in again.
      const roles = grants.map((grant) => grant.role);
      if (sessionAge(token, sessionLimitsFor(roles), now) !== "active") return null;
      token.lastActive = now;

      token.profile = {
        handle: dbUser.handle,
        primaryRole: dbUser.primaryRole,
        roles,
        onboardingCompletedAt: dbUser.onboardingCompletedAt?.toISOString() ?? null,
        emailVerified: dbUser.emailVerified?.toISOString() ?? null,
      };
      return token;
    },
    session({ session, token: rawToken }) {
      const token = rawToken as typeof rawToken & HackVillageToken;
      const profile = token.profile;
      if (!token.id || !profile) return session;

      session.user.id = token.id;
      session.user.handle = profile.handle;
      session.user.primaryRole = profile.primaryRole;
      session.user.roles = profile.roles;
      session.user.onboardingCompletedAt = profile.onboardingCompletedAt
        ? new Date(profile.onboardingCompletedAt)
        : null;
      session.user.emailVerified = profile.emailVerified ? new Date(profile.emailVerified) : null;
      return session;
    },
  },
});
