"use client";

import { useActionState } from "react";

import { OrgDetailsFields, type OrgDetailsValues } from "@/components/organizer/org-details-fields";
import { Button } from "@/components/ui/button";
import { FormError, FormSuccess, Input, Label, Textarea } from "@/components/ui/input";
import {
  adminUpdateOrgProfileAction,
  type OrgProfileState,
  updateOrgProfileAction,
} from "@/lib/orgs/actions";
import { ORG_ABOUT_MAX } from "@/lib/orgs/profile";

interface OrgProfileFormProps {
  org: { id: string; name: string; about: string | null } & OrgDetailsValues;
  /** "admin" is the HackVillage team editing on an organizer's behalf. */
  mode: "organizer" | "admin";
  nameEditable: boolean;
  /** Verified organizations keep the kind KYB checked. */
  kindLocked?: boolean;
}

export function OrgProfileForm({ org, mode, nameEditable, kindLocked = false }: OrgProfileFormProps) {
  const [state, action, pending] = useActionState<OrgProfileState, FormData>(
    mode === "admin" ? adminUpdateOrgProfileAction : updateOrgProfileAction,
    {}
  );
  const fieldId = (name: string) => `${name}-${org.id}`;

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="orgId" value={org.id} />

      {nameEditable ? (
        <div className="space-y-1.5">
          <Label htmlFor={fieldId("name")}>Organization Name</Label>
          <Input id={fieldId("name")} name="name" defaultValue={org.name} maxLength={80} required />
        </div>
      ) : null}

      <OrgDetailsFields
        values={org}
        idSuffix={`-${org.id}`}
        kindLocked={kindLocked}
        allowBlank={mode === "admin"}
      />

      <div className="space-y-1.5">
        <Label htmlFor={fieldId("about")}>About</Label>
        <Textarea
          id={fieldId("about")}
          name="about"
          rows={5}
          maxLength={ORG_ABOUT_MAX}
          defaultValue={org.about ?? ""}
          placeholder="Who you are, where you run hackathons, and what teams can expect from you. Leave a blank line between paragraphs."
        />
        <p className="text-xs text-muted">
          Shown on every hackathon you host. Up to {ORG_ABOUT_MAX} characters.
        </p>
      </div>

      {mode === "admin" ? (
        <div className="space-y-1.5">
          <Label htmlFor={fieldId("reason")}>Reason For The Change</Label>
          <Input
            id={fieldId("reason")}
            name="reason"
            required
            minLength={4}
            maxLength={300}
            placeholder="Logged to the audit trail, for example: filled in from the organizer's intake call"
          />
        </div>
      ) : null}

      <FormError message={state.error} />
      <FormSuccess message={state.saved ? "Profile saved. Hackathon pages show it now." : undefined} />
      <Button type="submit" loading={pending}>
        Save Profile
      </Button>
    </form>
  );
}
