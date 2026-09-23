import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import type { Role, SessionUserLike, Surface } from "@/lib/auth/rbac";
import { canAccessSurface, isOnboarded } from "@/lib/auth/rbac";

/**
 * Server-side guards (Phase 1). Layouts and server actions call these —
 * enforcement NEVER lives in the client. Middleware is deliberately unused:
 * database sessions + Prisma don't belong on the edge runtime; the layout
 * tree is the single, stronger gate.
 */

export interface CurrentUser extends SessionUserLike {
  name?: string | null;
  email: string;
  handle: string;
  emailVerified: Date | null;
}

export async function currentUser(): Promise<CurrentUser | null> {
  const session = await auth();
  const user = session?.user;
  if (!user?.id || !user.email) return null;

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    handle: user.handle,
    primaryRole: user.primaryRole,
    roles: user.roles as Role[],
    onboardingCompletedAt: user.onboardingCompletedAt,
    emailVerified: user.emailVerified,
    deletedAt: null,
  };
}

export async function requireUser(): Promise<CurrentUser> {
  const user = await currentUser();
  if (!user) redirect("/signin");
  return user;
}

export async function requireOnboardedUser(): Promise<CurrentUser> {
  const user = await requireUser();
  if (!isOnboarded(user)) redirect("/onboarding/choose");
  return user;
}

export async function requireSurface(surface: Surface): Promise<CurrentUser> {
  const user = await requireOnboardedUser();
  if (!canAccessSurface(user, surface)) redirect("/dashboard");
  return user;
}
