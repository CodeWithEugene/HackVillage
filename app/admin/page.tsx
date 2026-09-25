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
      <h1 className="font-display text-2xl font-bold text-ink">Platform Snapshot</h1>
      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <p className="text-xs font-semibold uppercase text-muted">Users</p>
          <p className="mt-1 font-display text-3xl font-bold text-ink">{users}</p>
        </Card>
        <Card>
          <p className="text-xs font-semibold uppercase text-muted">Hackathons</p>
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

      <div className="grid gap-4 sm:grid-cols-3">
        <Link href="/admin/users">
          <Card className="transition-shadow hover:shadow-lg">
            <CardTitle>Users</CardTitle>
            <CardDescription>Search accounts, roles, and verification state.</CardDescription>
          </Card>
        </Link>
        <Link href="/admin/hackathons">
          <Card className="transition-shadow hover:shadow-lg">
            <CardTitle>Hackathons</CardTitle>
            <CardDescription>All hackathons across organizations, with lifecycle status.</CardDescription>
          </Card>
        </Link>
        <Link href="/admin/kyb">
          <Card className="transition-shadow hover:shadow-lg">
            <CardTitle>KYB Review</CardTitle>
            <CardDescription>Business verification queue that gates first deposits.</CardDescription>
          </Card>
        </Link>
        <Link href="/admin/organizations">
          <Card className="transition-shadow hover:shadow-lg">
            <CardTitle>Organizations</CardTitle>
            <CardDescription>Fill in or correct organizer profiles, with an audit trail.</CardDescription>
          </Card>
        </Link>
        <Link href="/admin/payments">
          <Card className="transition-shadow hover:shadow-lg">
            <CardTitle>Payment Ops</CardTitle>
            <CardDescription>Failed payouts, retries, and manual receipts.</CardDescription>
          </Card>
        </Link>
        <Link href="/admin/trust">
          <Card className="transition-shadow hover:shadow-lg">
            <CardTitle>Trust Ledger</CardTitle>
            <CardDescription>Penalties, appeals, and manual adjustments.</CardDescription>
          </Card>
        </Link>
        <Link href="/admin/disputes">
          <Card className="transition-shadow hover:shadow-lg">
            <CardTitle>Disputes</CardTitle>
            <CardDescription>Milestone disputes: release or reject with audit.</CardDescription>
          </Card>
        </Link>
      </div>
    </div>
  );
}
