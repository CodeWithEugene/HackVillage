/**
 * Team policy (Phase 2) — pure decisions. The cap is a platform policy, not a
 * schema constraint: leader + 4 members.
 */

export const MAX_TEAM_MEMBERS = 5;

export interface TeamSnapshot {
  status: "OPEN" | "LOCKED" | "DISBANDED";
  joinedCount: number;
}

export function canJoinTeam(
  team: TeamSnapshot,
  userAlreadyMember: boolean,
  eventRegistrationOpen: boolean
): { ok: boolean; reason?: string } {
  if (!eventRegistrationOpen) return { ok: false, reason: "Registration for this event has closed." };
  if (team.status === "DISBANDED") return { ok: false, reason: "This team has disbanded." };
  if (team.status === "LOCKED") return { ok: false, reason: "This team is locked and not accepting members." };
  if (userAlreadyMember) return { ok: false, reason: "You are already on this team." };
  if (team.joinedCount >= MAX_TEAM_MEMBERS) {
    return { ok: false, reason: `Teams hold at most ${MAX_TEAM_MEMBERS} members.` };
  }
  return { ok: true };
}

/** Team names: readable, 3–40 chars. */
export function validTeamName(name: string): string | null {
  const trimmed = name.trim();
  if (trimmed.length < 3) return "Team names need at least 3 characters.";
  if (trimmed.length > 40) return "Team names can be at most 40 characters.";
  return null;
}
