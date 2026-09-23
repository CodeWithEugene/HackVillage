import type { Metadata } from "next";
import Link from "next/link";

import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/db";

export const metadata: Metadata = { title: "Admin" };

export default async function AdminHomePage() {
  const [users, events, registrations, teams] = await Promise.all([
    prisma.user.count({ where: { deletedAt: null } }),
    prisma.event.count(),
    prisma.registration.count({ where: { status: "REGISTERED" } }),
    prisma.team.count({ where: { status: { not: "DISBANDED" } } }),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold text-ink">Platform snapshot</h1>
      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <p className="text-xs font-semibold uppercase text-muted">Users</p>
          <p className="mt-1 font-display text-3xl font-bold text-ink">{users}</p>
        </Card>
        <Card>
          <p className="text-xs font-semibold uppercase text-muted">Events</p>
          <p className="mt-1 font-display text-3xl font-bold text-ink">{events}</p>
        </Card>
        <Card>
          <p className="text-xs font-semibold uppercase text-muted">Registrations</p>
          <p className="mt-1 font-display text-3xl font-bold text-ink">{registrations}</p>
        </Card>
        <Card>
          <p className="text-xs font-semibold uppercase text-muted">Teams</p>
          <p className="mt-1 font-display text-3xl font-bold text-ink">{teams}</p>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link href="/admin/users">
          <Card className="transition-shadow hover:shadow-lg">
            <CardTitle>Users</CardTitle>
            <CardDescription>Search accounts, roles, and verification state.</CardDescription>
          </Card>
        </Link>
        <Link href="/admin/events">
          <Card className="transition-shadow hover:shadow-lg">
            <CardTitle>Events</CardTitle>
            <CardDescription>All events across organizations, with lifecycle status.</CardDescription>
          </Card>
        </Link>
      </div>
    </div>
  );
}
