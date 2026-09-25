import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { formatPostDate } from "@/lib/blog";
import type { BlogPostMeta } from "@/lib/blog/types";
import { cn } from "@/lib/utils";

/** A post in the blog grid. `featured` lays it out wide, image beside the text. */
export function BlogCard({ post, featured = false }: { post: BlogPostMeta; featured?: boolean }) {
  return (
    <Link
      href={`/blog/${post.slug}`}
      className={cn(
        "group flex h-full overflow-hidden rounded-card bg-surface shadow-card transition duration-200 hover:-translate-y-0.5 hover:shadow-lg focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none",
        featured ? "flex-col lg:flex-row" : "flex-col",
      )}
    >
      <div
        className={cn(
          "relative overflow-hidden bg-brand/10",
          featured ? "aspect-[21/9] lg:aspect-auto lg:min-h-[320px] lg:w-1/2" : "aspect-[21/9]",
        )}
      >
        <Image
          src={post.cover}
          alt=""
          fill
          sizes={
            featured
              ? "(min-width: 1024px) 50vw, 100vw"
              : "(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          }
          className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
        />
        <span className="absolute top-3 left-3 rounded-full bg-white/85 px-2.5 py-0.5 text-[11px] font-semibold text-brand-ink backdrop-blur">
          {post.category}
        </span>
      </div>
      <div className={cn("flex flex-1 flex-col p-5", featured && "lg:justify-center lg:p-10")}>
        <p className="text-xs font-medium text-muted">
          {formatPostDate(post.publishedAt)} · {post.readingMinutes} min read
        </p>
        <h3
          className={cn(
            "mt-2 font-display leading-snug font-bold text-ink",
            featured ? "text-2xl lg:text-3xl" : "line-clamp-2 text-lg",
          )}
        >
          {post.title}
        </h3>
        <p className={cn("mt-2 text-sm leading-6 text-body-copy", !featured && "line-clamp-2")}>
          {post.excerpt}
        </p>
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
