"use client";

import { useTransition } from "react";
import { Copy, Ticket } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { createOrgInviteAction } from "@/lib/onboarding/actions";

export function InviteCodeManager({
  codes,
}: {
  codes: { token: string; expiresAt: string }[];
}) {
  const [pending, startTransition] = useTransition();

  return (
    <Card>
      <CardTitle className="flex items-center gap-2">
        <Ticket aria-hidden className="size-5" /> Invite teammates
      </CardTitle>
      <CardDescription>
        Codes give organizer access to this organization and expire after 7 days.
      </CardDescription>

      {codes.length > 0 ? (
        <ul className="mt-4 space-y-2">
          {codes.map((code) => (
            <li
              key={code.token}
              className="flex items-center justify-between gap-3 rounded-control border border-ink/10 bg-paper px-3 py-2"
            >
              <code className="font-mono text-lg font-bold tracking-wider text-ink">
                {code.token}
              </code>
              <span className="text-xs text-muted">
                expires {new Date(code.expiresAt).toLocaleDateString("en-KE", { day: "numeric", month: "short" })}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() =>
                  void navigator.clipboard?.writeText(
                    `${window.location.origin}/invites/${code.token}`
                  )
                }
                aria-label={`Copy invite link for code ${code.token}`}
              >
                <Copy aria-hidden className="size-4" />
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-sm text-muted">No active invites — generate one below.</p>
      )}

      <Button
        className="mt-4"
        variant="secondary"
        loading={pending}
        onClick={() => startTransition(() => void createOrgInviteAction())}
      >
        Generate invite code
      </Button>
    </Card>
  );
}
