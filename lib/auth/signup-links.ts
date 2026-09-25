export type SignUpRole = "DEVELOPER" | "ORGANIZER";

/** Every "Host A Hackathon" link: sign up with Organizer already picked. */
export const HOST_HACKATHON_HREF = "/signup?role=organizer";

/** Reads `?role=` on /signup. Anything other than "organizer" means a developer account. */
export function parseSignUpRole(raw: string | string[] | undefined): SignUpRole {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return value?.toLowerCase() === "organizer" ? "ORGANIZER" : "DEVELOPER";
}
