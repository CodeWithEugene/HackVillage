import type { Metadata } from "next";
import { notFound } from "next/navigation";

/**
 * Private surface — not search-facing. Crawlers that follow links here should
 * not spend index budget on it (sign-in, dashboards, admin). The robots.txt
 * disallow list covers the app surfaces; this meta tag covers pages we still
 * want crawlable-but-not-indexable (auth pages linked from the header/footer).
 */
export const metadata: Metadata = { robots: { index: false, follow: false } };

import { AppSidebar, AppTopBar, type AppNavSection } from "@/components/patterns/app-sidebar";
import { requireSurface } from "@/lib/auth/guards";

/** The admin surfaces (plan §7.8), one section in the shared shell. */
const ADMIN_SECTIONS: AppNavSection[] = [
  {
    title: "Platform",
    items: [
      { href: "/admin", label: "Snapshot" },
      { href: "/admin/users", label: "Users" },
      { href: "/admin/hackathons", label: "Hackathons" },
      { href: "/admin/kyb", label: "KYB Review" },
      { href: "/admin/organizations", label: "Organizations" },
      { href: "/admin/payments", label: "Payment Ops" },
      { href: "/admin/trust", label: "Trust" },
      { href: "/admin/disputes", label: "Disputes" },
    ],
  },
];

/**
 * Admin (plan §7.8) on the same ruled sidebar shell as the (app) surfaces.
 * ADMIN is a DB-granted role; there is deliberately no self-service path to
 * it. 2FA + full admin console arrive with Phase 9 hardening.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireSurface("admin");
  if (!user.roles.includes("ADMIN")) notFound();

  const shellUser = { handle: user.handle };

  return (
    <div className="app-shell">
      <AppSidebar sections={ADMIN_SECTIONS} navLabel="Admin" surfaceLabel="admin" />
      <div className="app-content">
        <AppTopBar
          sections={ADMIN_SECTIONS}
          navLabel="Admin"
          user={shellUser}
          surfaceLabel="admin"
        />
        <main className="app-main">{children}</main>
        <footer className="app-foot">HackVillage: trust is the product.</footer>
      </div>
    </div>
  );
}
