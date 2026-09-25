import type { Metadata } from "next";

import { BlogCard } from "@/components/patterns/blog-card";
import { CtaBanner } from "@/components/patterns/cta-banner";
import { allPosts } from "@/lib/blog";

export const metadata: Metadata = {
  title: "Blog",
  description:
    "Guides and stories from HackVillage: escrowed prizes, instant payouts, and running hackathons builders trust.",
};

export default function BlogPage() {
  const posts = allPosts();
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
          {posts.map((post) => (
            <BlogCard key={post.meta.slug} post={post.meta} />
          ))}
        </div>
      </div>
      <CtaBanner photoSide="left" />
    </>
  );
}
