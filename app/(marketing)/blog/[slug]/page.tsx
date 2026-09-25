import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { BlogCard } from "@/components/patterns/blog-card";
import { LegalToc } from "@/components/patterns/legal-toc";
import { allPosts, formatPostDate, getPost, morePosts } from "@/lib/blog";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return allPosts().map((post) => ({ slug: post.meta.slug }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const post = getPost((await params).slug);
  if (!post) return { title: "Post Not Found" };
  return {
    title: post.meta.title,
    description: post.meta.excerpt,
    openGraph: {
      title: post.meta.title,
      description: post.meta.excerpt,
      images: [post.meta.cover],
    },
  };
}

const CONTENT_ID = "blog-content";

export default async function BlogPostPage({ params }: PageProps) {
  const post = getPost((await params).slug);
  if (!post) notFound();
  const { meta, Body } = post;
  const more = morePosts(meta.slug);

  return (
    <>
      <article className="site-container py-12">
        <Link
          href="/blog"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-soft hover:text-ink"
        >
          <ArrowLeft aria-hidden className="size-4" /> All Posts
        </Link>

        <header className="mx-auto mt-6 max-w-3xl text-center">
          <p className="text-[11px] font-semibold tracking-[0.18em] text-ink-soft uppercase">
            {meta.category}
          </p>
          <h1 className="mt-3 font-display text-3xl leading-tight font-bold text-ink sm:text-4xl">
            {meta.title}
          </h1>
          <p className="mt-3 text-lg text-muted">{meta.excerpt}</p>
          <p className="mt-4 text-sm text-muted">
            By {meta.author} ·{" "}
            <time dateTime={meta.publishedAt}>{formatPostDate(meta.publishedAt)}</time> ·{" "}
            {meta.readingMinutes} min read
          </p>
        </header>

        <div className="relative mt-10 aspect-[21/9] overflow-hidden rounded-card bg-brand/10 shadow-card">
          <Image
            src={meta.cover}
            alt={meta.coverAlt}
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
        </div>

        <div className="legal-layout mt-12">
          <aside className="legal-aside">
            <LegalToc containerId={CONTENT_ID} />
          </aside>
          <div id={CONTENT_ID} className="legal">
            <Body />
          </div>
        </div>
      </article>

      {more.length > 0 ? (
        <section className="site-container pb-16" aria-labelledby="keep-reading-heading">
          <h2 id="keep-reading-heading" className="font-display text-2xl font-bold text-ink">
            Keep Reading
          </h2>
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {more.map((other) => (
              <BlogCard key={other.meta.slug} post={other.meta} />
            ))}
          </div>
        </section>
      ) : null}
    </>
  );
}
