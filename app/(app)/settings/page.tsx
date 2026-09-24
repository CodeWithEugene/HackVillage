import type { Metadata } from "next";

import { AccountSettings } from "@/components/settings/account-settings";
import { PayoutMethodForm } from "@/components/payout/payout-method-form";
import { requireUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const user = await requireUser();

  const profile = await prisma.developerProfile.findUnique({
    where: { userId: user.id },
    select: { payoutMethod: true, payoutRecipientCode: true },
  });

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
    </div>
  );
}
