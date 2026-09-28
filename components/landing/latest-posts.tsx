import Image from "next/image";
import Link from "next/link";

import { LandingLink } from "@/components/landing/landing-link";
import { allPosts, formatPostDate } from "@/lib/blog";

/** Stripe's "What's happening": one featured post, the next few as a list. */
export function LatestPosts() {
  const [featured, ...rest] = allPosts();
  if (!featured) return null;
  const more = rest.slice(0, 5);

  return (
    <section className="lp-section" aria-labelledby="lp-latest-heading">
      <div className="lp-frame lp-block lp-block-follow">
        <h2 id="lp-latest-heading" className="lp-statement lp-statement-stack">
          What&apos;s happening
          <span>The latest from the HackVillage blog.</span>
        </h2>

        <div className="lp-latest">
          <Link href={`/blog/${featured.meta.slug}`} className="lp-latest-feature">
            <Image
              src={featured.meta.cover}
              alt={featured.meta.coverAlt}
              fill
              sizes="(max-width: 1023px) 100vw, 780px"
              className="object-cover"
            />
            <span className="lp-latest-scrim" aria-hidden="true" />
            <span className="lp-latest-category">{featured.meta.category}</span>
            <span className="lp-latest-title">{featured.meta.title}</span>
          </Link>
          <ul className="lp-latest-list">
            {more.map((post) => (
              <li key={post.meta.slug}>
                <Link href={`/blog/${post.meta.slug}`} className="lp-latest-item">
                  <span className="lp-latest-meta">
                    {post.meta.category} · {formatPostDate(post.meta.publishedAt)}
                  </span>
                  <span className="lp-latest-item-title">{post.meta.title}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="lp-latest-foot">
          <p>
            <strong>
              {featured.meta.category} · {formatPostDate(featured.meta.publishedAt)}.
            </strong>{" "}
            {featured.meta.excerpt}
          </p>
          <LandingLink href="/blog" variant="secondary">
            Read The Blog
          </LandingLink>
        </div>
      </div>
    </section>
  );
}
