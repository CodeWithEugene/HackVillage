"use client";

import Link from "next/link";
import { LogOut } from "lucide-react";
import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import { signOutAction } from "@/lib/auth/actions";

export function UserMenu({ handle }: { handle: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex items-center gap-3">
      <Link
        href={`/developers/${handle}`}
        className="hidden text-sm font-semibold text-ink hover:underline sm:block"
      >
        @{handle}
      </Link>
      <Button
        variant="ghost"
        size="sm"
        loading={pending}
        onClick={() => startTransition(() => void signOutAction())}
        aria-label="Sign out"
      >
        <LogOut aria-hidden className="size-4" />
        <span className="hidden sm:inline">Sign out</span>
      </Button>
    </div>
  );
}
