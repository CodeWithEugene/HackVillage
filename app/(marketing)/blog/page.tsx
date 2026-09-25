import type { Metadata } from "next";

import { BlogCard } from "@/components/patterns/blog-card";
import { Pagination } from "@/components/patterns/pagination";
import { allPosts } from "@/lib/blog";
import { BLOG_PAGE_SIZE, pageCount, pageSlice, parsePage } from "@/lib/blog/pagination";

export const metadata: Metadata = {
  title: "Blog",
  description:
    "Guides and stories from HackVillage: escrowed prizes, instant payouts, and running hackathons builders trust.",
};

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
  return (
    <>
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
          {pageSlice(posts, page, BLOG_PAGE_SIZE).map((post) => (
            <BlogCard key={post.meta.slug} post={post.meta} />
          ))}
        </div>
        <Pagination page={page} pageCount={count} label="Blog pages" hrefFor={blogPageHref} />
      </div>
    </>
  );
}
