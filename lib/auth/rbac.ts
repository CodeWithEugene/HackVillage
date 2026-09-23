/**
 * Pure role/permission logic (Phase 1). Everything the server enforces must
 * flow through these decisions — UI hiding is a courtesy, these are the law.
 * Keep free of DB/server imports so the matrix stays unit-testable.
 */

export type Role = "DEVELOPER" | "ORGANIZER" | "JUDGE" | "HIRING" | "ADMIN";
export type PrimaryRole = "DEVELOPER" | "ORGANIZER";

export type Surface =
  | "developer" // dashboard, profile, teams (Phase 2+)
  | "organizer" // org management, events
  | "judge"
  | "hiring"
  | "admin";

export interface SessionUserLike {
  id: string;
  primaryRole: PrimaryRole;
  roles: Role[];
  onboardingCompletedAt?: Date | null;
  deletedAt?: Date | null;
}

export function hasRole(user: SessionUserLike, role: Role): boolean {
  return user.roles.includes(role);
}

/**
 * Which role unlocks a surface. ADMIN is a super-role for every surface.
 * The user's primaryRole also unlocks its matching surface so an account
 * created as DEVELOPER (OAuth default) can still onboard as an organizer
 * before the grant ceremony — no: the ORGANIZER surface requires the
 * ORGANIZER *grant*, which onboarding issues when the user picks the role.
 */
const SURFACE_ROLES: Record<Surface, Role[]> = {
  developer: ["DEVELOPER", "ADMIN"],
  organizer: ["ORGANIZER", "ADMIN"],
  judge: ["JUDGE", "ADMIN"],
  hiring: ["HIRING", "ADMIN"],
  admin: ["ADMIN"],
};

export function canAccessSurface(user: SessionUserLike, surface: Surface): boolean {
  if (user.deletedAt) return false;
  return SURFACE_ROLES[surface].some((role) => hasRole(user, role));
}

/**
 * Actions inside a surface additionally require completed onboarding —
 * an organizer grant without an organization would strand the user.
 */
export function isOnboarded(user: SessionUserLike): boolean {
  return user.onboardingCompletedAt != null;
}

/** Login eligibility: deleted accounts can never authenticate. */
export function canAuthenticate(user: SessionUserLike): boolean {
  return user.deletedAt == null;
}
