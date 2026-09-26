import type { Metadata } from "next";

/**
 * Private surface — not search-facing. Crawlers that follow links here should
 * not spend index budget on it (sign-in, dashboards, admin). The robots.txt
 * disallow list covers the app surfaces; this meta tag covers pages we still
 * want crawlable-but-not-indexable (auth pages linked from the header/footer).
 */
export const metadata: Metadata = { robots: { index: false, follow: false } };

import { notFound } from "next/navigation";

import { requireSurface } from "@/lib/auth/guards";
import { ThemeSwitcher } from "@/components/patterns/theme-switcher";

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
      <header className="sticky top-0 z-50 shrink-0 bg-inverse text-on-inverse">
        <div className="site-container flex h-16 items-center justify-between">
          <span className="font-display text-lg font-bold">
            Hack<span className="text-brand">Village</span>{" "}
            <span className="text-xs font-medium tracking-widest text-on-inverse/50 uppercase">
              admin
            </span>
          </span>
          <div className="admin-header-actions flex items-center gap-3">
            <span className="text-xs text-on-inverse/60">signed in as @{user.handle}</span>
            <ThemeSwitcher />
          </div>
        </div>
      </header>
      <main className="site-container flex-1 py-8">{children}</main>
    </div>
  );
}
