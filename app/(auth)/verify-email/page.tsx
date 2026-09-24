import type { Metadata } from "next";

import { VerifyEmailClient } from "@/components/auth/verify-email-client";

export const metadata: Metadata = { title: "Verify Your Email" };

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  return <VerifyEmailClient token={token ?? ""} />;
}
