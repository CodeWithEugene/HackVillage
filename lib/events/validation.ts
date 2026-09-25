import { z } from "zod";

/**
 * Event wizard validation (server-authoritative). The wizard is a 5-step
 * client stepper over ONE form — this schema is the whole contract.
 */

export const eventBasicsSchema = z.object({
  title: z.string().trim().min(4, "Titles need at least 4 characters.").max(120),
  summary: z.string().trim().max(300).optional(),
  venueType: z.enum(["PHYSICAL", "ONLINE", "HYBRID"]),
  location: z
    .string()
    .trim()
    .max(160)
    .optional()
    .or(z.literal(""))
    .transform((v) => (v === "" ? undefined : v)),
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date(),
  registrationDeadline: z.coerce.date(),
});

export const eventProblemSchema = z.object({
  problemStatement: z
    .string()
    .trim()
    .min(40, "Describe the problem in at least 40 characters, since builders need context.")
    .max(8000),
  rules: z.string().trim().max(8000).optional(),
  rolesWanted: z
    .string()
    .trim()
    .max(300)
    .optional()
    .transform((value) =>
      (value ?? "")
        .split(",")
        .map((tag) => tag.trim().toLowerCase())
        .filter(Boolean)
        .slice(0, 8)
    ),
});

export const prizePlaceSchema = z.object({
  place: z.coerce.number().int().min(1).max(20),
  label: z.string().trim().min(2).max(60),
  amountKes: z.coerce.number().int().min(1_000, "Each prize must be at least KES 1,000."),
  milestoneRequired: z.coerce.boolean().default(true),
});

export const eventPrizesSchema = z.object({
  prizes: z.array(prizePlaceSchema).min(1, "Add at least one prize place.").max(10),
});

export const eventSettingsSchema = z.object({
  maxTeams: z.coerce.number().int().min(2).max(200).default(20),
});

export const eventWizardSchema = eventBasicsSchema
  .merge(eventProblemSchema)
  .merge(eventPrizesSchema)
  .merge(eventSettingsSchema)
  .refine((data) => data.registrationDeadline < data.startsAt, {
    message: "Registration must close before the hackathon starts.",
    path: ["registrationDeadline"],
  })
  .refine((data) => data.startsAt < data.endsAt, {
    message: "The hackathon must end after it starts.",
    path: ["endsAt"],
  });

export type EventWizardInput = z.infer<typeof eventWizardSchema>;

/** Sum of prize places = the pool the organizer must fund (ADR-012). */
export function poolFromPrizes(prizes: { amountKes: number }[]): number {
  return prizes.reduce((total, prize) => total + prize.amountKes, 0);
}

/** Places must be unique (unique(eventId, place) is a DB constraint too). */
export function placesAreUnique(prizes: { place: number }[]): boolean {
  return new Set(prizes.map((p) => p.place)).size === prizes.length;
}

const RESERVED_EVENT_SLUGS = new Set([
  "admin", "api", "auth", "dashboard", "developers", "events", "hackathons", "hiring",
  "judge", "new", "organizer", "settings", "signin", "signup", "trust", "workspace",
]);

export function eventSlugStem(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

export function eventSlugCandidates(title: string): string[] {
  const stem = eventSlugStem(title);
  if (stem.length >= 3 && !RESERVED_EVENT_SLUGS.has(stem)) {
    return [stem, ...Array.from({ length: 20 }, (_, i) => `${stem}-${i + 2}`)];
  }
  return Array.from({ length: 20 }, (_, i) => `event-${Date.now().toString(36)}-${i + 2}`.slice(0, 40));
}
