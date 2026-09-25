"use client";

import { useRef, useState } from "react";

import { BlogCard } from "@/components/patterns/blog-card";
import { Pagination } from "@/components/patterns/pagination";
import { pageCount, pageSlice } from "@/lib/blog/pagination";
import type { BlogPostMeta } from "@/lib/blog/types";

/** Three other posts at a time, with page controls to see the rest. */
export function KeepReading({ posts }: { posts: BlogPostMeta[] }) {
  const [page, setPage] = useState(1);
  const sectionRef = useRef<HTMLElement>(null);
  if (posts.length === 0) return null;

  function showPage(next: number) {
    setPage(next);
    // Keep the heading in view when the controls sit low on a small screen.
    const top = sectionRef.current?.getBoundingClientRect().top ?? 0;
    if (top < 0) sectionRef.current?.scrollIntoView({ block: "start" });
  }

  return (
    <section
      ref={sectionRef}
      className="site-container scroll-mt-24 pb-16"
      aria-labelledby="keep-reading-heading"
    >
      <h2 id="keep-reading-heading" className="font-display text-2xl font-bold text-ink">
        Keep Reading
      </h2>
      <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3" aria-live="polite">
        {pageSlice(posts, page).map((post) => (
          <BlogCard key={post.slug} post={post} />
        ))}
      </div>
      <Pagination
        page={page}
        pageCount={pageCount(posts.length)}
        label="More posts"
        onSelect={showPage}
      />
    </section>
  );
}
