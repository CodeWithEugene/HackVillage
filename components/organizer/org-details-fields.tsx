import { Input, Label } from "@/components/ui/input";
import { DEFAULT_COUNTRY, ORG_KINDS, ORG_KIND_LABELS, type OrgKind } from "@/lib/orgs/details";

export interface OrgDetailsValues {
  kind: OrgKind | null;
  city: string | null;
  country: string | null;
  website: string | null;
  socialUrl: string | null;
  contactPhone: string | null;
}

interface OrgDetailsFieldsProps {
  values?: Partial<OrgDetailsValues>;
  /** Suffix that keeps ids unique when several forms share a page. */
  idSuffix?: string;
  /** Verified organizations can't change their kind (KYB checked it). */
  kindLocked?: boolean;
  /** The HackVillage team can leave kind, city, and phone blank. */
  allowBlank?: boolean;
}

const SELECT =
  "h-11 w-full rounded-control border border-ink/15 bg-surface px-3 text-ink focus-visible:border-ink/40 focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none disabled:opacity-60";

/** Kind, location, links, and private contact phone, shared by setup and the profile form. */
export function OrgDetailsFields({
  values = {},
  idSuffix = "",
  kindLocked = false,
  allowBlank = false,
}: OrgDetailsFieldsProps) {
  const required = !allowBlank;
  const id = (name: string) => `${name}${idSuffix}`;

  return (
    <>
      <div className="space-y-1.5">
        <Label htmlFor={id("kind")}>What Kind Of Organization</Label>
        <select
          id={id("kind")}
          name="kind"
          required={required}
          disabled={kindLocked}
          defaultValue={values.kind ?? ""}
          className={SELECT}
        >
          <option value="" disabled={required}>
            {required ? "Choose one" : "Not set"}
          </option>
          {ORG_KINDS.map((kind) => (
            <option key={kind} value={kind}>
              {ORG_KIND_LABELS[kind]}
            </option>
          ))}
        </select>
        <p className="text-xs text-muted">
          {kindLocked
            ? "Locked because verification checked it. Contact HackVillage to change it."
            : "This decides which details verification asks for."}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor={id("city")}>City</Label>
          <Input
            id={id("city")}
            name="city"
            required={required}
            minLength={2}
            maxLength={60}
            defaultValue={values.city ?? ""}
            placeholder="Nairobi"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={id("country")}>Country</Label>
          <Input
            id={id("country")}
            name="country"
            required
            minLength={2}
            maxLength={60}
            defaultValue={values.country ?? DEFAULT_COUNTRY}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor={id("website")}>Website (optional)</Label>
          <Input
            id={id("website")}
            name="website"
            maxLength={200}
            inputMode="url"
            defaultValue={values.website ?? ""}
            placeholder="technetium.co.ke"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={id("socialUrl")}>Main Social Link (optional)</Label>
          <Input
            id={id("socialUrl")}
            name="socialUrl"
            maxLength={200}
            inputMode="url"
            defaultValue={values.socialUrl ?? ""}
            placeholder="linkedin.com/company/…"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={id("contactPhone")}>Contact Phone</Label>
        <Input
          id={id("contactPhone")}
          name="contactPhone"
          type="tel"
          required={required}
          autoComplete="tel"
          maxLength={20}
          defaultValue={values.contactPhone ?? ""}
          placeholder="0712 345 678"
        />
        <p className="text-xs text-muted">
          Only the HackVillage team sees this. It never appears on your hackathons.
        </p>
      </div>
    </>
  );
}
