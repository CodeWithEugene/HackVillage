/**
 * Handle policy (Phase 1). Handles are the public identity on the platform:
 * /developers/[handle]. Pure functions — no DB access here; the caller
 * (adapter/actions) resolves candidates against the database.
 */

/** Lowercase alphanumeric + inner hyphens, 3–30 chars total. */
export const HANDLE_PATTERN = /^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$/;

/** Paths reserved by the app — never assignable as handles. */
export const RESERVED_HANDLES: ReadonlySet<string> = new Set([
  "admin",
  "administrator",
  "api",
  "auth",
  "billing",
  "dashboard",
  "developers",
  "docs",
  "events",
  "hackvillage",
  "hiring",
  "invite",
  "invites",
  "judge",
  "login",
  "main",
  "me",
  "onboarding",
  "organizer",
  "orgs",
  "profiles",
  "root",
  "settings",
  "signin",
  "signup",
  "support",
  "system",
  "trust",
  "null",
  "undefined",
  "support",
]);

/** Returns a human error string, or null when the handle is well-formed. */
export function validateHandle(handle: string): string | null {
  if (handle.length < 3) return "Handles need at least 3 characters.";
  if (handle.length > 30) return "Handles can be at most 30 characters.";
  if (handle !== handle.toLowerCase()) return "Handles are lowercase.";
  if (!HANDLE_PATTERN.test(handle)) {
    return "Handles use letters, numbers and hyphens — no leading or trailing hyphens.";
  }
  if (RESERVED_HANDLES.has(handle)) return "That handle is reserved.";
  return null;
}

/** Coerce arbitrary input (name/email) toward a legal handle stem. */
export function sanitizeHandleStem(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Derive the base handle stem from an email local part. */
export function stemFromEmail(email: string): string {
  const local = email.split("@")[0] ?? "";
  return sanitizeHandleStem(local).slice(0, 24) || "developer";
}

/**
 * Ordered candidate list for collision resolution: base, base-2, base-3, …
 * base-99. Callers take the first candidate that is valid + unused.
 */
export function candidateHandles(base: string, limit = 99): string[] {
  const stem = sanitizeHandleStem(base);
  const candidates: string[] = [];
  if (HANDLE_PATTERN.test(stem) && !RESERVED_HANDLES.has(stem)) {
    candidates.push(stem);
  }
  for (let i = 2; i <= limit && candidates.length < 20; i += 1) {
    const candidate = `${stem}-${i}`.slice(0, 30);
    if (HANDLE_PATTERN.test(candidate) && !RESERVED_HANDLES.has(candidate)) {
      candidates.push(candidate);
    }
  }
  if (candidates.length === 0) candidates.push(`dev-${Date.now().toString(36)}`);
  return candidates;
}

/** Pick the first candidate not present in `taken` (case-insensitive). */
export function firstAvailableHandle(candidates: string[], taken: Iterable<string>): string | null {
  const takenSet = new Set(
    [...taken].map((h) => h.toLowerCase())
  );
  for (const candidate of candidates) {
    if (!takenSet.has(candidate.toLowerCase())) return candidate;
  }
  return null;
}
