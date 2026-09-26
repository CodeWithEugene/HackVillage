import type { Metadata } from "next";

import { UnsubscribeClient } from "@/components/notifications/unsubscribe-client";

// Tokenized utility page reached from email links — never search-facing.
export const metadata: Metadata = {
  title: "Unsubscribe",
  robots: { index: false, follow: false },
};

export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">
        <UnsubscribeClient token={token ?? ""} />
      </div>
    </div>
  );
}
