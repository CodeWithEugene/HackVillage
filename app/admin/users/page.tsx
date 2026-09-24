import type { Metadata } from "next";

import { Badge } from "@/components/ui/badge";
import { Card, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/db";

export const metadata: Metadata = { title: "Admin · Users" };

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const where = q
    ? {
        OR: [
          { email: { contains: q, mode: "insensitive" as const } },
          { handle: { contains: q, mode: "insensitive" as const } },
          { name: { contains: q, mode: "insensitive" as const } },
        ],
      }
    : {};

  const users = await prisma.user.findMany({
    where,
    select: {
      id: true,
      name: true,
      handle: true,
      email: true,
      emailVerified: true,
      deletedAt: true,
      roleGrants: { select: { role: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl font-bold text-ink">Users</h1>

      <form className="flex gap-2" role="search">
        <input
          name="q"
          defaultValue={q ?? ""}
          placeholder="Search name, handle, email…"
          aria-label="Search users"
          className="h-11 flex-1 rounded-control border border-ink/15 bg-surface px-3 text-ink"
        />
        <button
          type="submit"
          className="h-11 rounded-control bg-brand px-5 text-sm font-bold text-ink"
        >
          Search
        </button>
      </form>

      <Card>
        <CardTitle>Results ({users.length})</CardTitle>
        <ul className="mt-3 divide-y divide-ink/5">
          {users.map((user) => (
            <li key={user.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
              <span>
                <strong className="text-ink">{user.name ?? `@${user.handle}`}</strong>{" "}
                <span className="text-muted">@{user.handle}</span>
                <span className="block text-xs text-muted">{user.email}</span>
              </span>
              <span className="flex flex-wrap items-center gap-1.5">
                {user.deletedAt ? <Badge variant="danger">deleted</Badge> : null}
                <Badge variant={user.emailVerified ? "success" : "warning"}>
                  {user.emailVerified ? "verified" : "unverified"}
                </Badge>
                {user.roleGrants.map((grant) => (
                  <Badge key={grant.role}>{grant.role.toLowerCase()}</Badge>
                ))}
              </span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
