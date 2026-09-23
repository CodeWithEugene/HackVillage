import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BadgeCheck, MapPin } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/db";

interface ProfilePageProps {
  params: Promise<{ handle: string }>;
}

export async function generateMetadata({ params }: ProfilePageProps): Promise<Metadata> {
  const { handle } = await params;
  return {
    title: `@${handle}`,
    description: `The verified Proof-of-Work profile for @${handle} on HackVillage.`,
  };
}

export default async function DeveloperProfilePage({ params }: ProfilePageProps) {
  const { handle } = await params;
  const user = await prisma.user.findFirst({
    where: { handle: { equals: handle, mode: "insensitive" }, deletedAt: null },
    select: {
      name: true,
      handle: true,
      createdAt: true,
      profile: {
        select: {
          headline: true,
          bio: true,
          location: true,
          skills: true,
          githubLogin: true,
          linkedinUrl: true,
        },
      },
    },
  });

  if (!user?.profile) notFound();

  const profile = user.profile;

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-16">
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-bold text-ink">
              {user.name ?? `@${user.handle}`}
            </h1>
            <p className="mt-1 flex items-center gap-2 text-sm text-muted">
              @{user.handle}
              <span aria-hidden>·</span>
              joined {user.createdAt.toLocaleDateString("en-KE", { month: "long", year: "numeric" })}
            </p>
          </div>
          <Badge variant="brand">
            <BadgeCheck aria-hidden className="size-3.5" /> Proof-of-Work verified
          </Badge>
        </div>

        {profile.headline ? (
          <p className="mt-4 text-lg font-medium text-ink-soft">{profile.headline}</p>
        ) : null}

        {profile.location ? (
          <p className="mt-2 flex items-center gap-1.5 text-sm text-muted">
            <MapPin aria-hidden className="size-4" /> {profile.location}
          </p>
        ) : null}

        {profile.bio ? <p className="mt-4 leading-7 text-muted">{profile.bio}</p> : null}

        {profile.skills?.length ? (
          <div className="mt-5 flex flex-wrap gap-1.5">
            {profile.skills.map((skill) => (
              <Badge key={skill}>{skill}</Badge>
            ))}
          </div>
        ) : null}

        {profile.githubLogin || profile.linkedinUrl ? (
          <div className="mt-6 flex flex-wrap gap-4 text-sm">
            {profile.githubLogin ? (
              <a
                href={`https://github.com/${profile.githubLogin}`}
                className="font-semibold text-ink underline hover:no-underline"
                rel="me noreferrer"
                target="_blank"
              >
                GitHub · {profile.githubLogin}
              </a>
            ) : null}
            {profile.linkedinUrl ? (
              <a
                href={profile.linkedinUrl}
                className="font-semibold text-ink underline hover:no-underline"
                rel="me noreferrer"
                target="_blank"
              >
                LinkedIn
              </a>
            ) : null}
          </div>
        ) : null}
      </Card>

      <Card className="mt-6">
        <CardTitle>Verified record</CardTitle>
        <CardDescription>
          Event history, win rates, GitHub contributions per event, and judge endorsements appear
          here as soon as the first Prize Verified events conclude.
        </CardDescription>
        <p className="mt-4 rounded-control border border-dashed border-ink/15 bg-paper p-4 text-center text-sm text-muted">
          First events are on the runway — this profile starts writing its record the day judging
          closes.
        </p>
      </Card>
    </div>
  );
}
