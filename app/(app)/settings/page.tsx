import type { Metadata } from "next";

import { AccountSettings } from "@/components/settings/account-settings";
import { NotificationPreferences } from "@/components/settings/notification-preferences";
import { PayoutMethodForm } from "@/components/payout/payout-method-form";
import { requireUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { NOTIFICATION_CATEGORIES, type NotificationCategory } from "@/lib/notifications/types";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const user = await requireUser();

  const [profile, preference] = await Promise.all([
    prisma.developerProfile.findUnique({
      where: { userId: user.id },
      select: { payoutMethod: true, payoutRecipientCode: true },
    }),
    prisma.notificationPreference.findUnique({ where: { userId: user.id } }),
  ]);

  const currentPreferences = Object.fromEntries(
    NOTIFICATION_CATEGORIES.map((category) => [category, preference?.[category] ?? true])
  ) as Record<NotificationCategory, boolean>;

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      <AccountSettings
        email={user.email}
        emailVerified={Boolean(user.emailVerified)}
        roles={user.roles}
      />
      <PayoutMethodForm
        current={
          profile
            ? { method: profile.payoutMethod, recipientCode: profile.payoutRecipientCode }
            : null
        }
      />
      <NotificationPreferences current={currentPreferences} />
    </div>
  );
}
