import type { Metadata } from "next";

/**
 * Private surface — not search-facing. Crawlers that follow links here should
 * not spend index budget on it (sign-in, dashboards, admin). The robots.txt
 * disallow list covers the app surfaces; this meta tag covers pages we still
 * want crawlable-but-not-indexable (auth pages linked from the header/footer).
 */
export const metadata: Metadata = { robots: { index: false, follow: false } };

import AppTopNav from "@/components/patterns/app-nav";
import { requireOnboardedUser } from "@/lib/auth/guards";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireOnboardedUser();

  return (
    <div className="flex min-h-dvh flex-col">
      <AppTopNav user={{ name: user.name, handle: user.handle, roles: user.roles }} />
      <main className="site-container flex-1 py-8">{children}</main>
      <footer className="border-t border-ink/10 py-4 text-center text-xs text-muted">
        HackVillage: trust is the product.
      </footer>
    </div>
  );
}
