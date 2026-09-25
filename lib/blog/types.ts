import type { ComponentType } from "react";

export interface BlogPostMeta {
  slug: string;
  title: string;
  /** One or two sentences for cards, the post header, and meta descriptions. */
  excerpt: string;
  category: "Escrow" | "Payouts" | "Builders" | "Organizers" | "Updates";
  /** ISO date, YYYY-MM-DD. */
  publishedAt: string;
  author: string;
  readingMinutes: number;
  /** A photo under /public, shown 21:9 on cards and at the top of the post. */
  cover: string;
  coverAlt: string;
}

export interface BlogPost {
  meta: BlogPostMeta;
  Body: ComponentType;
}
