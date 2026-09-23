import type { Metadata } from "next";

import { AccountSettings } from "@/components/settings/account-settings";
import { requireUser } from "@/lib/auth/guards";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const user = await requireUser();

  return (
    <AccountSettings
      email={user.email}
      emailVerified={Boolean(user.emailVerified)}
      roles={user.roles}
    />
  );
}
