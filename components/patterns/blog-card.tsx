import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { formatPostDate } from "@/lib/blog/format";
import type { BlogPostMeta } from "@/lib/blog/types";

/** A post in the blog grid. */
export function BlogCard({ post }: { post: BlogPostMeta }) {
  return (
    <Link
      href={`/blog/${post.slug}`}
      className="group flex h-full flex-col overflow-hidden rounded-card bg-surface shadow-card transition duration-200 hover:-translate-y-0.5 hover:shadow-lg focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
    >
      <div className="relative aspect-[21/9] overflow-hidden bg-brand/10">
        <Image
          src={post.cover}
          alt=""
          fill
          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
        />
        <span className="absolute top-3 left-3 rounded-full bg-white/85 px-2.5 py-0.5 text-[11px] font-semibold text-brand-ink backdrop-blur">
          {post.category}
        </span>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <p className="text-xs font-medium text-muted">
          {formatPostDate(post.publishedAt)} · {post.readingMinutes} min read
        </p>
        <h3 className="mt-2 line-clamp-2 font-display text-lg leading-snug font-bold text-ink">
          {post.title}
        </h3>
        <p className="mt-2 line-clamp-2 text-sm leading-6 text-body-copy">{post.excerpt}</p>
        <div className="mt-auto pt-5">
          {/* The whole card is the link, so this is a span dressed as the pill button. */}
          <span className={buttonVariants({ size: "sm" })}>
            <span className="btn-fill" aria-hidden />
            <span className="btn-content">
              Read Post
              <ArrowUpRight aria-hidden className="btn-arrow size-4" />
            </span>
          </span>
        </div>
      </div>
    </Link>
  );
}
