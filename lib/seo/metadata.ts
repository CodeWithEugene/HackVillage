import type { Metadata } from "next";

import { OG_IMAGE_PATH, SITE_NAME } from "@/lib/seo/site";

type OpenGraph = NonNullable<Metadata["openGraph"]>;

export const DEFAULT_OG_IMAGE = {
  url: OG_IMAGE_PATH,
  width: 1200,
  height: 630,
  alt: "HackVillage, the hackathon platform with escrowed prizes",
};

/**
 * A page's Open Graph block. Next.js replaces the layout's openGraph (it does
 * not merge) as soon as a page sets one, so a bare `openGraph: { url }` drops
 * the site-wide preview image. Every page goes through here so shares on
 * WhatsApp, LinkedIn and X always carry an image. Pass `images` to use a
 * page-specific one instead (for example a blog cover).
 */
export function pageOpenGraph(path: string, overrides: OpenGraph = {}): OpenGraph {
  return {
    type: "website",
    siteName: SITE_NAME,
    url: path,
    images: [DEFAULT_OG_IMAGE],
    ...overrides,
  };
}
