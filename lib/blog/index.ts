import { post as howWinnersGetPaid } from "@/lib/blog/posts/how-winners-get-paid";
import { post as runningAHackathon } from "@/lib/blog/posts/running-a-hackathon-builders-trust";
import { post as whyWeLockEveryPrize } from "@/lib/blog/posts/why-we-lock-every-prize-first";
import { post as yourFirstHackathon } from "@/lib/blog/posts/your-first-hackathon";
import type { BlogPost } from "@/lib/blog/types";

/**
 * Every published post. To publish one, add a module under lib/blog/posts
 * and list it here; the order here breaks ties between posts on the same date.
 */
const POSTS: BlogPost[] = [
  whyWeLockEveryPrize,
  howWinnersGetPaid,
  yourFirstHackathon,
  runningAHackathon,
];

/** Newest first. */
export function allPosts(): BlogPost[] {
  return POSTS.map((post, index) => ({ post, index }))
    .sort(
      (a, b) => b.post.meta.publishedAt.localeCompare(a.post.meta.publishedAt) || a.index - b.index,
    )
    .map(({ post }) => post);
}

export function getPost(slug: string): BlogPost | undefined {
  return POSTS.find((post) => post.meta.slug === slug);
}

/** Other posts to read next, newest first. */
export function morePosts(slug: string, limit = 3): BlogPost[] {
  return allPosts()
    .filter((post) => post.meta.slug !== slug)
    .slice(0, limit);
}

const dateFormat = new Intl.DateTimeFormat("en-KE", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "Africa/Nairobi",
});

/** "25 September 2026" */
export function formatPostDate(isoDate: string): string {
  return dateFormat.format(new Date(`${isoDate}T12:00:00+03:00`));
}
