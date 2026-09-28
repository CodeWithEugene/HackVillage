import type { Metadata } from "next";

import { BlogCard } from "@/components/patterns/blog-card";
import { PageHero } from "@/components/patterns/page-hero";
import { Pagination } from "@/components/patterns/pagination";
import { JsonLd } from "@/components/seo/json-ld";
import { allPosts } from "@/lib/blog";
import { BLOG_PAGE_SIZE, pageCount, pageSlice, parsePage } from "@/lib/blog/pagination";
import { pageOpenGraph } from "@/lib/seo/metadata";
import { itemListSchema } from "@/lib/seo/schema";

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const posts = allPosts();
  const count = pageCount(posts.length, BLOG_PAGE_SIZE);
  const page = parsePage((await searchParams).page, count);
  return {
    // Later pages say so in the title, so they aren't duplicates of page 1.
    title:
      page === 1
        ? "Blog: Hackathon Guides And Stories"
        : `Blog: Hackathon Guides And Stories, Page ${page}`,
    description:
      "Guides and stories from HackVillage: how escrowed prizes work, how winners get paid instantly, and how to run hackathons builders trust in Kenya and beyond.",
    // Self-canonical per pagination page; page 1 canonicalizes to the clean URL.
    alternates: { canonical: page === 1 ? "/blog" : `/blog?page=${page}` },
    openGraph: pageOpenGraph(page === 1 ? "/blog" : `/blog?page=${page}`),
  };
}

interface PageProps {
  searchParams: Promise<{ page?: string | string[] }>;
}

function blogPageHref(page: number): string {
  return page === 1 ? "/blog" : `/blog?page=${page}`;
}

export default async function BlogPage({ searchParams }: PageProps) {
  const posts = allPosts();
  const count = pageCount(posts.length, BLOG_PAGE_SIZE);
  const page = parsePage((await searchParams).page, count);
  const visible = pageSlice(posts, page, BLOG_PAGE_SIZE);
  return (
    <>
      <JsonLd
        data={itemListSchema(
          "HackVillage blog posts",
          visible.map(({ meta }) => ({ title: meta.title, path: `/blog/${meta.slug}` })),
        )}
      />
      <div className="lp">
        <PageHero
          kicker="Blog"
          title="Stories And Guides From HackVillage"
          lead="How prizes stay safe, how winners get paid, and how to run and win hackathons in Kenya and beyond."
        />
        <section className="lp-section" aria-label="Posts">
          <div className="lp-frame lp-block lp-divided">
            <div className="blog-grid">
              {visible.map((post) => (
                <BlogCard key={post.meta.slug} post={post.meta} />
              ))}
            </div>
            <Pagination page={page} pageCount={count} label="Blog pages" hrefFor={blogPageHref} />
          </div>
        </section>
      </div>
    </>
  );
}
