import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { KeepReading } from "@/components/patterns/keep-reading";
import { LegalToc } from "@/components/patterns/legal-toc";
import { PageHero } from "@/components/patterns/page-hero";
import { JsonLd } from "@/components/seo/json-ld";
import { allPosts, formatPostDate, getPost, morePosts } from "@/lib/blog";
import { articleSchema, breadcrumbSchema } from "@/lib/seo/schema";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return allPosts().map((post) => ({ slug: post.meta.slug }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const post = getPost((await params).slug);
  if (!post) return { title: "Post Not Found", robots: { index: false } };
  const { meta } = post;
  return {
    title: meta.title,
    description: meta.excerpt,
    alternates: { canonical: `/blog/${meta.slug}` },
    openGraph: {
      title: meta.title,
      description: meta.excerpt,
      type: "article",
      url: `/blog/${meta.slug}`,
      publishedTime: meta.publishedAt,
      authors: [meta.author],
      images: [meta.cover],
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
      <JsonLd
        data={[
          articleSchema({
            slug: meta.slug,
            title: meta.title,
            excerpt: meta.excerpt,
            publishedAt: meta.publishedAt,
            author: meta.author,
            cover: meta.cover,
          }),
          breadcrumbSchema([
            { name: "Blog", path: "/blog" },
            { name: meta.title, path: `/blog/${meta.slug}` },
          ]),
        ]}
      />
      <article className="lp">
        <PageHero
          kicker={meta.category}
          bar={
            <Link href="/blog" className="blog-back">
              <ArrowLeft aria-hidden className="size-4" /> All Posts
            </Link>
          }
          title={meta.title}
          lead={meta.excerpt}
        >
          <p className="blog-byline">
            By {meta.author} ·{" "}
            <time dateTime={meta.publishedAt}>{formatPostDate(meta.publishedAt)}</time> ·{" "}
            {meta.readingMinutes} min read
          </p>
        </PageHero>

        <div className="lp-frame lp-divided blog-cover-frame">
          <div className="blog-cover">
            <Image
              src={meta.cover}
              alt={meta.coverAlt}
              fill
              priority
              sizes="(min-width: 1440px) 1392px, 100vw"
              className="object-cover"
            />
          </div>
        </div>

        <div className="lp-frame legal-layout">
          <aside className="legal-aside">
            <LegalToc containerId={CONTENT_ID} />
          </aside>
          <div id={CONTENT_ID} className="legal">
            <Body />
          </div>
        </div>
      </article>

      <KeepReading posts={more.map((other) => other.meta)} />
    </>
  );
}
