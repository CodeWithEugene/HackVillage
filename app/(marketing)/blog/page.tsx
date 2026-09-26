import type { Metadata } from "next";

import { BlogCard } from "@/components/patterns/blog-card";
import { Pagination } from "@/components/patterns/pagination";
import { JsonLd } from "@/components/seo/json-ld";
import { allPosts } from "@/lib/blog";
import { BLOG_PAGE_SIZE, pageCount, pageSlice, parsePage } from "@/lib/blog/pagination";
import { itemListSchema } from "@/lib/seo/schema";

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const posts = allPosts();
  const count = pageCount(posts.length, BLOG_PAGE_SIZE);
  const page = parsePage((await searchParams).page, count);
  return {
    title: "Blog — Hackathon Guides & Stories",
    description:
      "Guides and stories from HackVillage: how escrowed prizes work, how winners get paid instantly, and how to run hackathons builders trust in Kenya and beyond.",
    // Self-canonical per pagination page; page 1 canonicalizes to the clean URL.
    alternates: { canonical: page === 1 ? "/blog" : `/blog?page=${page}` },
    openGraph: { url: page === 1 ? "/blog" : `/blog?page=${page}` },
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
      <div className="site-container py-16">
        <header className="mb-10 text-center">
          <p className="text-[11px] font-semibold tracking-[0.18em] text-ink-soft uppercase">
            Blog
          </p>
          <h1 className="mt-3 font-display text-3xl font-bold text-ink sm:text-4xl">
            Stories And Guides From HackVillage
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-muted">
            How prizes stay safe, how winners get paid, and how to run and win hackathons in Kenya
            and beyond.
          </p>
        </header>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((post) => (
            <BlogCard key={post.meta.slug} post={post.meta} />
          ))}
        </div>
        <Pagination page={page} pageCount={count} label="Blog pages" hrefFor={blogPageHref} />
      </div>
    </>
  );
}
