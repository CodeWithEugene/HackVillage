"use client";

import { Building2, Code2 } from "lucide-react";

import { chooseRoleAction } from "@/lib/onboarding/actions";

const CHOICES = [
  {
    role: "DEVELOPER" as const,
    icon: Code2,
    title: "Developer",
    description:
      "Join Prize Verified events, build with a team, submit projects, and receive instant payouts when you win.",
  },
  {
    role: "ORGANIZER" as const,
    icon: Building2,
    title: "Organizer",
    description:
      "Create an organization, run events with escrowed prize pools, and prove your credibility with the Prize Verified badge.",
  },
];

export function RoleChoiceCards({ currentRole }: { currentRole?: "DEVELOPER" | "ORGANIZER" }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {CHOICES.map((choice) => (
        <form key={choice.role} action={() => void chooseRoleAction(choice.role)}>
          <button
            type="submit"
            className={`h-full w-full rounded-card border-2 bg-surface p-6 text-left shadow-card transition-colors ${
              currentRole === choice.role ? "border-brand" : "border-ink/10 hover:border-ink/25"
            }`}
          >
            <span className="flex size-12 items-center justify-center rounded-control bg-brand">
              <choice.icon aria-hidden className="size-6 text-ink" />
            </span>
            <p className="mt-4 font-display text-lg font-bold text-ink">{choice.title}</p>
            <p className="mt-2 text-sm leading-6 text-muted">{choice.description}</p>
            <span className="mt-4 inline-block text-sm font-semibold text-ink underline">
              Continue as {choice.title} →
            </span>
          </button>
        </form>
      ))}
    </div>
  );
}
