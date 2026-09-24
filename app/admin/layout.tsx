import { notFound } from "next/navigation";

import { requireSurface } from "@/lib/auth/guards";

/**
 * Basic admin (Phase 2 scope — plan §7.8). ADMIN is a DB-granted role; there
 * is deliberately no self-service path to it. 2FA + full admin console
 * arrive with Phase 9 hardening.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireSurface("admin");
  if (!user.roles.includes("ADMIN")) notFound();

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-ink/10 bg-ink text-paper">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-4">
          <span className="font-display text-lg font-bold">
            Hack<span className="text-brand">Village</span>{" "}
            <span className="text-xs font-medium uppercase tracking-widest text-paper/50">
              admin
            </span>
          </span>
          <span className="text-xs text-paper/60">signed in as @{user.handle}</span>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>
    </div>
  );
}
