import type { MetadataRoute } from "next";

import { allPosts } from "@/lib/blog";
import { BLOG_PAGE_SIZE, pageCount } from "@/lib/blog/pagination";
import { prisma } from "@/lib/db";
import { PUBLIC_HACKATHON_WHERE } from "@/lib/events/visibility";
import { coverFor } from "@/lib/events/covers";
import { INDEXABLE_DEVELOPER_WHERE, isRealAccountEmail } from "@/lib/seo/indexable";
import { RENAMED_IMAGES } from "@/lib/seo/renamed-images";
import { appUrl } from "@/lib/url";

/**
 * The sitemap is how Google (and every other crawler) discovers the pages
 * that internal links reach slowly: hackathon listings, blog posts, and
 * developer profiles. Regenerated hourly so newly funded hackathons appear
 * without a redeploy.
 */
export const revalidate = 3600;

/** The current image paths in one marketing folder, as absolute URLs. */
function imagesIn(...folders: string[]): string[] {
  return Object.values(RENAMED_IMAGES)
    .filter((path) => folders.some((folder) => path.startsWith(`/marketing/${folder}/`)))
    .map((path) => appUrl(path));
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Image entries help Google Images find the photos each page actually shows.
  const entries: MetadataRoute.Sitemap = [
    {
      url: appUrl("/"),
      changeFrequency: "daily",
      priority: 1,
      images: imagesIn("hero/kenya", "journey", "trust"),
    },
    { url: appUrl("/hackathons"), changeFrequency: "daily", priority: 0.9 },
    {
      url: appUrl("/how-it-works"),
      changeFrequency: "weekly",
      priority: 0.8,
      images: imagesIn("process"),
    },
    { url: appUrl("/how-escrow-works"), changeFrequency: "weekly", priority: 0.8 },
    { url: appUrl("/for-organizers"), changeFrequency: "weekly", priority: 0.8 },
    { url: appUrl("/blog"), changeFrequency: "daily", priority: 0.8 },
    { url: appUrl("/contribute"), changeFrequency: "monthly", priority: 0.6 },
    { url: appUrl("/privacy"), changeFrequency: "yearly", priority: 0.3 },
    { url: appUrl("/terms"), changeFrequency: "yearly", priority: 0.3 },
  ];

  const posts = allPosts();
  for (const { meta } of posts) {
    entries.push({
      url: appUrl(`/blog/${meta.slug}`),
      lastModified: new Date(meta.publishedAt),
      changeFrequency: "monthly",
      priority: 0.7,
      images: [appUrl(meta.cover)],
    });
  }
  // Paginated blog views are indexable with self-canonicals, so list them too.
  const blogPages = pageCount(posts.length, BLOG_PAGE_SIZE);
  for (let page = 2; page <= blogPages; page += 1) {
    entries.push({
      url: appUrl(`/blog?page=${page}`),
      changeFrequency: "weekly",
      priority: 0.4,
    });
  }

  // Database-backed sections degrade gracefully: if the database is
  // unreachable during a build, static and blog entries still ship and the
  // rest return at the next regeneration.
  try {
    const [events, developers] = await Promise.all([
      prisma.event.findMany({
        // Demo hackathons are noindex, so they don't belong in the sitemap.
        where: { ...PUBLIC_HACKATHON_WHERE, isDemo: false },
        select: { slug: true, updatedAt: true, coverUrl: true, categories: true },
        orderBy: { startsAt: "desc" },
      }),
      prisma.user.findMany({
        where: INDEXABLE_DEVELOPER_WHERE,
        select: { handle: true, email: true, updatedAt: true },
      }),
    ]);
    for (const event of events) {
      entries.push({
        url: appUrl(`/hackathons/${event.slug}`),
        lastModified: event.updatedAt,
        changeFrequency: "daily",
        priority: 0.9,
        images: [
          (() => {
            const cover = coverFor(event);
            return cover.startsWith("/") ? appUrl(cover) : cover;
          })(),
        ],
      });
    }
    for (const developer of developers.filter((user) => isRealAccountEmail(user.email))) {
      entries.push({
        url: appUrl(`/developers/${developer.handle}`),
        lastModified: developer.updatedAt,
        changeFrequency: "weekly",
        priority: 0.5,
      });
    }
  } catch (error) {
    // Keep the sitemap useful with what we have, but say why it's short.
    console.error("[sitemap] database sections skipped", error);
  }

  return entries;
}
