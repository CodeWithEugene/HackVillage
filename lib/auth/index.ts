import NextAuth, { type DefaultSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import GitHub from "next-auth/providers/github";
import type { Provider } from "next-auth/providers";
import { verify } from "@node-rs/argon2";
import { z } from "zod";

import { HackVillageAdapter } from "@/lib/auth/adapter";
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
// functional (credentials flow) without them, e.g. in CI.
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(Google);
}
if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
  providers.push(GitHub);
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: HackVillageAdapter(prisma),
  // Auth.js v5 constraint: the Credentials provider requires JWT sessions.
  // Revocation is preserved in practice — the session callback re-reads the
  // user from the DB on every request and neuters deleted accounts (ADR-005
  // amended; documented in the session callback).
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 }, // 30 days
  pages: { signIn: "/signin", error: "/signin" },
  trustHost: true,
  providers,
  callbacks: {
    async jwt({ token, user }) {
      // First sign-in: capture the DB id so the session callback never has to
      // resolve by email (OAuth and credentials both provide it here).
      if (user?.id) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      const userId = token.id as string | undefined;
      if (!userId) return session;

      // Re-read our fields on EVERY request (the adapter types don't carry
      // them) and attach the role set. This is also the revocation check:
      // deleted accounts get a neutered session until sign-out is forced.
      const [dbUser, grants] = await Promise.all([
        prisma.user.findUnique({
          where: { id: userId },
          select: {
            handle: true,
            primaryRole: true,
            onboardingCompletedAt: true,
            emailVerified: true,
            deletedAt: true,
          },
        }),
        prisma.roleGrant.findMany({
          where: { userId },
          select: { role: true },
        }),
      ]);

      session.user.id = userId;
      if (!dbUser || dbUser.deletedAt) {
        session.user.handle = "";
        session.user.primaryRole = "DEVELOPER";
        session.user.roles = [];
        session.user.onboardingCompletedAt = null;
        session.user.emailVerified = null;
        return session;
      }

      session.user.handle = dbUser.handle;
      session.user.primaryRole = dbUser.primaryRole;
      session.user.roles = grants.map((grant) => grant.role);
      session.user.onboardingCompletedAt = dbUser.onboardingCompletedAt;
      session.user.emailVerified = dbUser.emailVerified;
      return session;
    },
  },
});
