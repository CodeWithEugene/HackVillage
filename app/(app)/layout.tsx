import type { Metadata } from "next";

/**
 * Private surface — not search-facing. Crawlers that follow links here should
 * not spend index budget on it (sign-in, dashboards, admin). The robots.txt
 * disallow list covers the app surfaces; this meta tag covers pages we still
 * want crawlable-but-not-indexable (auth pages linked from the header/footer).
 */
export const metadata: Metadata = { robots: { index: false, follow: false } };

import { AppSidebar, AppTopBar, type AppNavSection } from "@/components/patterns/app-sidebar";
import { SessionTimeout } from "@/components/patterns/session-timeout";
import { requireOnboardedUser } from "@/lib/auth/guards";
import { sessionLimitsFor } from "@/lib/auth/session-policy";

/** Builder links every authenticated user gets. */
const BUILDER_ITEMS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/dashboard/hackathons", label: "My Hackathons" },
  { href: "/dashboard/teams", label: "Teams" },
  { href: "/dashboard/winnings", label: "Winnings" },
  { href: "/dashboard/intros", label: "Intros" },
  { href: "/dashboard/notifications", label: "Alerts" },
];

/** Role surfaces, shown only while the user holds the grant (RBAC mirrors lib/auth/rbac). */
const ROLE_SECTIONS: { role: "ORGANIZER" | "JUDGE" | "HIRING"; title: string; items: { href: string; label: string }[] }[] = [
  {
    role: "ORGANIZER",
    title: "Organize",
    items: [
      { href: "/organizer", label: "Overview" },
      { href: "/organizer/organization", label: "Organization" },
      { href: "/organizer/verification", label: "Verification" },
      { href: "/organizer/hackathons/new", label: "New Hackathon" },
    ],
  },
  {
    role: "JUDGE",
    title: "Judge",
    items: [{ href: "/judge", label: "Assignments" }],
  },
  {
    role: "HIRING",
    title: "Hiring",
    items: [
      { href: "/hiring", label: "Talent" },
      { href: "/hiring/requests", label: "Requests" },
    ],
  },
];

const ACCOUNT_ITEMS = [
  { href: "/dashboard/profile", label: "Profile" },
  { href: "/settings", label: "Settings" },
];

/**
 * The authenticated app shell: the marketing ruled frame with a sidebar
 * column inside it (plan §13.3: sidebar ≥ lg). Below 1024px the rules drop
 * out and the top bar's drawer carries the same sections.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireOnboardedUser();

  const sections: AppNavSection[] = [
    { title: "Build", items: BUILDER_ITEMS },
    ...ROLE_SECTIONS.filter((section) => user.roles.includes(section.role)),
    { title: "Account", items: ACCOUNT_ITEMS },
  ];
  const shellUser = { handle: user.handle };

  return (
    <div className="app-shell">
      <AppSidebar sections={sections} navLabel="App" />
      <div className="app-content">
        <AppTopBar sections={sections} navLabel="App" user={shellUser} />
        <main className="app-main">{children}</main>
        <footer className="app-foot">HackVillage: trust is the product.</footer>
      </div>
      <SessionTimeout idleMs={sessionLimitsFor(user.roles).idleMs} />
    </div>
  );
}
