"use client";

import { useRef, useTransition } from "react";
import { Copy, Ticket } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { createOrgInviteAction } from "@/lib/onboarding/actions";

export function InviteCodeManager({
  codes,
}: {
  codes: { token: string; expiresAt: string }[];
}) {
  const [pending, startTransition] = useTransition();
  const emailRef = useRef<HTMLInputElement>(null);

  return (
    <Card>
      <CardTitle className="flex items-center gap-2">
        <Ticket aria-hidden className="size-5" /> Invite Teammates
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
        <p className="mt-4 text-sm text-muted">No active invites. Generate one below.</p>
      )}

      <div className="mt-4">
        <Label htmlFor="invite-email">Email an invite (optional)</Label>
        <div className="mt-1.5 flex gap-2">
          <Input
            id="invite-email"
            ref={emailRef}
            type="email"
            placeholder="teammate@example.com"
            className="flex-1"
          />
          <Button
            type="button"
            variant="secondary"
            loading={pending}
            onClick={() =>
              startTransition(async () => {
                await createOrgInviteAction(emailRef.current?.value || undefined);
                if (emailRef.current) emailRef.current.value = "";
              })
            }
          >
            Generate Or Send Invite
          </Button>
        </div>
        <p className="mt-1.5 text-xs text-muted">
          Leave the email blank to just generate a code you can share yourself.
        </p>
      </div>
    </Card>
  );
}
