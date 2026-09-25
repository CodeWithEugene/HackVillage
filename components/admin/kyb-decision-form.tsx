"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { FormError, Input } from "@/components/ui/input";
import { decideKybAction, type KybDecisionState } from "@/lib/admin/kyb-actions";

export function KybDecisionForm({ orgId }: { orgId: string }) {
  const [state, action, pending] = useActionState<KybDecisionState, FormData>(decideKybAction, {});

  return (
    <form action={action} className="mt-4 space-y-3">
      <input type="hidden" name="orgId" value={orgId} />
      <Input
        name="reason"
        placeholder="Reason (required for rejections, logged)"
        aria-label={`KYB decision reason for ${orgId}`}
        maxLength={300}
      />
      <FormError message={state.error} />
      <div className="flex gap-2">
        <Button type="submit" name="decision" value="APPROVE" size="sm" loading={pending}>
          Approve
        </Button>
        <Button type="submit" name="decision" value="REJECT" size="sm" variant="danger" loading={pending}>
          Reject
        </Button>
      </div>
    </form>
  );
}
