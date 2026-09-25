"use client";

import { useTransition } from "react";
import { EyeOff, Check, Loader2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardTitle } from "@/components/ui/card";
import { setMediaStatusAction } from "@/services/media/actions";

interface Asset {
  id: string;
  url: string;
  kind: "PHOTO" | "VIDEO";
  caption: string | null;
  status: "PENDING" | "APPROVED" | "HIDDEN";
}

export function MediaGallery({ assets }: { assets: Asset[] }) {
  const [pending, startTransition] = useTransition();

  if (assets.length === 0) {
    return (
      <Card>
        <CardTitle>Gallery</CardTitle>
        <p className="mt-2 text-sm text-muted">Nothing uploaded yet: the vault is empty.</p>
      </Card>
    );
  }

  return (
    <Card>
      <CardTitle>Gallery ({assets.length})</CardTitle>
      <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {assets.map((asset) => (
          <li key={asset.id} className="overflow-hidden rounded-card border border-ink/10">
            {asset.kind === "PHOTO" ? (
              // eslint-disable-next-line @next/next/no-img-element -- media vault files, dynamic storage
              <img src={asset.url} alt={asset.caption ?? "Event photo"} className="aspect-[4/3] w-full object-cover" />
            ) : (
              <video src={asset.url} controls className="aspect-[4/3] w-full" />
            )}
            <div className="flex items-center justify-between gap-2 p-3">
              <div className="min-w-0">
                <Badge
                  variant={
                    asset.status === "APPROVED" ? "success" : asset.status === "HIDDEN" ? "neutral" : "warning"
                  }
                >
                  {asset.status.toLowerCase()}
                </Badge>
                {asset.caption ? (
                  <p className="mt-1 truncate text-xs text-muted">{asset.caption}</p>
                ) : null}
              </div>
              <div className="flex shrink-0 gap-1">
                {asset.status !== "APPROVED" ? (
                  <button
                    type="button"
                    aria-label="Approve asset"
                    disabled={pending}
                    className="rounded-control p-2 text-success hover:bg-success/10"
                    onClick={() => startTransition(() => void setMediaStatusAction(asset.id, "APPROVED"))}
                  >
                    {pending ? (
                      <Loader2 aria-hidden className="size-4 animate-spin" />
                    ) : (
                      <Check aria-hidden className="size-4" />
                    )}
                  </button>
                ) : null}
                {asset.status !== "HIDDEN" ? (
                  <button
                    type="button"
                    aria-label="Hide asset"
                    disabled={pending}
                    className="rounded-control p-2 text-muted hover:bg-ink/5"
                    onClick={() => startTransition(() => void setMediaStatusAction(asset.id, "HIDDEN"))}
                  >
                    {pending ? (
                      <Loader2 aria-hidden className="size-4 animate-spin" />
                    ) : (
                      <EyeOff aria-hidden className="size-4" />
                    )}
                  </button>
                ) : null}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}
