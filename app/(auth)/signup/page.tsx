import type { Metadata } from "next";

import { SignUpForm } from "@/components/auth/signup-form";

export const metadata: Metadata = { title: "Create account" };

export default function SignUpPage() {
  return (
    <SignUpForm
      googleEnabled={Boolean(process.env.GOOGLE_CLIENT_ID)}
      githubEnabled={Boolean(process.env.GITHUB_CLIENT_ID)}
    />
  );
}
