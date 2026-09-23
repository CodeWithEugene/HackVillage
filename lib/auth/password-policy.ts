import { z } from "zod";

/**
 * Password policy (shared by signup and password change/reset actions).
 * Lives outside "use server" files because those may only export async
 * functions — zod schemas are runtime values.
 */
export const passwordSchema = z
  .string()
  .min(10, "Passwords need at least 10 characters.")
  .max(200, "Passwords can be at most 200 characters.")
  .refine((p) => /[a-zA-Z]/.test(p) && /[0-9]/.test(p), {
    message: "Passwords need at least one letter and one number.",
  });
