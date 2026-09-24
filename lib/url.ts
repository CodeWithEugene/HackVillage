import { getEnv } from "@/lib/env";

/** Builds an absolute app URL from a path, for links inside emails and redirects. */
export function appUrl(path: string): string {
  return `${getEnv().NEXT_PUBLIC_APP_URL.replace(/\/$/, "")}${path}`;
}
