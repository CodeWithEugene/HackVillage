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
  session: { strategy: "database", maxAge: 30 * 24 * 60 * 60 }, // 30 days
  pages: { signIn: "/signin", error: "/signin" },
  trustHost: true,
  providers,
  callbacks: {
    async session({ session, user }) {
      // Database strategy: re-read our fields (the adapter types don't carry
      // them) and attach the role set. One small indexed query per session.
      const [dbUser, grants] = await Promise.all([
        prisma.user.findUnique({
          where: { id: user.id },
          select: {
            handle: true,
            primaryRole: true,
            onboardingCompletedAt: true,
            emailVerified: true,
            deletedAt: true,
          },
        }),
        prisma.roleGrant.findMany({
          where: { userId: user.id },
          select: { role: true },
        }),
      ]);

      if (!dbUser || dbUser.deletedAt) {
        // Deleted accounts keep a neutered session until sign-out is forced.
        session.user.id = user.id;
        session.user.handle = "";
        session.user.primaryRole = "DEVELOPER";
        session.user.roles = [];
        session.user.onboardingCompletedAt = null;
        session.user.emailVerified = null;
        return session;
      }

      session.user.id = user.id;
      session.user.handle = dbUser.handle;
      session.user.primaryRole = dbUser.primaryRole;
      session.user.roles = grants.map((grant) => grant.role);
      session.user.onboardingCompletedAt = dbUser.onboardingCompletedAt;
      session.user.emailVerified = dbUser.emailVerified;
      return session;
    },
  },
});
