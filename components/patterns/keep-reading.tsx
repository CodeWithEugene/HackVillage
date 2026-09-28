"use client";

import { useRef, useState } from "react";

import { BlogCard } from "@/components/patterns/blog-card";
import { Pagination } from "@/components/patterns/pagination";
import { KEEP_READING_PAGE_SIZE, pageCount, pageSlice } from "@/lib/blog/pagination";
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
    <section ref={sectionRef} className="lp scroll-mt-24" aria-labelledby="keep-reading-heading">
      <div className="lp-frame lp-block lp-divided">
        <h2 id="keep-reading-heading" className="lp-statement lp-statement-sm">
          Keep Reading
        </h2>
        <div className="blog-grid mt-8" aria-live="polite">
          {pageSlice(posts, page, KEEP_READING_PAGE_SIZE).map((post) => (
            <BlogCard key={post.slug} post={post} />
          ))}
        </div>
        <Pagination
          page={page}
          pageCount={pageCount(posts.length, KEEP_READING_PAGE_SIZE)}
          label="More posts"
          onSelect={showPage}
        />
      </div>
    </section>
  );
}
