import AppTopNav from "@/components/patterns/app-nav";
import { requireOnboardedUser } from "@/lib/auth/guards";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireOnboardedUser();

  return (
    <div className="flex min-h-dvh flex-col">
      <AppTopNav user={{ name: user.name, handle: user.handle, roles: user.roles }} />
      <main className="site-container flex-1 py-8">{children}</main>
      <footer className="border-t border-ink/10 py-4 text-center text-xs text-muted">
        HackVillage — trust is the product.
      </footer>
    </div>
  );
}
