"use client";

import { useActionState, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { FormError, FormSuccess, Input, Label } from "@/components/ui/input";
import {
  changePasswordAction,
  deactivateAccountAction,
  type AccountActionState,
} from "@/lib/account/actions";

export function AccountSettings({
  email,
  emailVerified,
  roles,
}: {
  email: string;
  emailVerified: boolean;
  roles: string[];
}) {
  const [passwordState, changePassword, changing] = useActionState<AccountActionState, FormData>(
    changePasswordAction,
    {}
  );
  const [deactivateState, deactivate, deactivating] = useActionState<AccountActionState, FormData>(
    deactivateAccountAction,
    {}
  );
  const [confirming, setConfirming] = useState(false);

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      <header>
        <h1 className="font-display text-2xl font-bold text-ink">Settings</h1>
        <p className="mt-1 text-sm text-muted">Account, security, and your data.</p>
      </header>

      <Card>
        <CardTitle>Account</CardTitle>
        <dl className="mt-4 space-y-3 text-sm">
          <div className="flex items-center justify-between gap-4">
            <dt className="text-muted">Email</dt>
            <dd className="font-medium text-ink">{email}</dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt className="text-muted">Email status</dt>
            <dd>
              {emailVerified ? (
                <Badge variant="success">Verified</Badge>
              ) : (
                <Badge variant="warning">Unverified</Badge>
              )}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt className="text-muted">Roles</dt>
            <dd className="flex flex-wrap justify-end gap-1.5">
              {roles.map((role) => (
                <Badge key={role}>{role.toLowerCase()}</Badge>
              ))}
            </dd>
          </div>
        </dl>
      </Card>

      <Card>
        <CardTitle>Change Password</CardTitle>
        <CardDescription>At least 10 characters, with a letter and a number.</CardDescription>
        <form action={changePassword} className="mt-4 space-y-4">
          <div>
            <Label htmlFor="currentPassword">Current password</Label>
            <Input
              id="currentPassword"
              name="currentPassword"
              type="password"
              autoComplete="current-password"
              required
            />
          </div>
          <div>
            <Label htmlFor="newPassword">New password</Label>
            <Input
              id="newPassword"
              name="newPassword"
              type="password"
              autoComplete="new-password"
              required
              minLength={10}
            />
          </div>
          <FormError message={passwordState.error} />
          <FormSuccess message={passwordState.message} />
          <Button type="submit" loading={changing}>
            Update Password
          </Button>
        </form>
      </Card>

      <Card className="border-danger/30">
        <CardTitle className="text-danger">Danger Zone</CardTitle>
        <CardDescription>
          Deactivating anonymizes your account immediately. If you have winnings awaiting payout,
          those obligations are still honored — funds are never forfeited.
        </CardDescription>
        {confirming ? (
          <form action={deactivate} className="mt-4 space-y-4">
            <div>
              <Label htmlFor="confirm">
                Type <span className="font-mono font-bold">DEACTIVATE</span> to confirm
              </Label>
              <Input id="confirm" name="confirm" placeholder="DEACTIVATE" required />
            </div>
            <FormError message={deactivateState.error} />
            <div className="flex gap-2">
              <Button type="submit" variant="danger" loading={deactivating}>
                Deactivate My Account
              </Button>
              <Button type="button" variant="secondary" onClick={() => setConfirming(false)}>
                Cancel
              </Button>
            </div>
          </form>
        ) : (
          <Button variant="danger" className="mt-4" onClick={() => setConfirming(true)}>
            Deactivate Account
          </Button>
        )}
      </Card>
    </div>
  );
}
