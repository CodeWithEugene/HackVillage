import { post as formingATeam } from "@/lib/blog/posts/forming-a-team-that-ships";
import { post as hackVillageIsOpenSource } from "@/lib/blog/posts/hackvillage-is-open-source";
import { post as howWinnersGetPaid } from "@/lib/blog/posts/how-winners-get-paid";
import { post as judgingScorecards } from "@/lib/blog/posts/judging-scorecards-teams-trust";
import { post as proofOfWorkPortfolio } from "@/lib/blog/posts/proof-of-work-portfolio";
import { post as runningAHackathon } from "@/lib/blog/posts/running-a-hackathon-builders-trust";
import { post as mediaStandard } from "@/lib/blog/posts/the-48-hour-media-standard";
import { post as threeMonthsLater } from "@/lib/blog/posts/three-months-later";
import { post as yourFirstHackathon } from "@/lib/blog/posts/your-first-hackathon";
import type { BlogPost } from "@/lib/blog/types";

/**
 * Every published post. To publish one, add a module under lib/blog/posts
 * and list it here; the order here breaks ties between posts on the same date.
 */
const POSTS: BlogPost[] = [
  howWinnersGetPaid,
  yourFirstHackathon,
  runningAHackathon,
  judgingScorecards,
  proofOfWorkPortfolio,
  mediaStandard,
  threeMonthsLater,
  formingATeam,
  hackVillageIsOpenSource,
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
export function morePosts(slug: string, limit?: number): BlogPost[] {
  const others = allPosts().filter((post) => post.meta.slug !== slug);
  return limit === undefined ? others : others.slice(0, limit);
}

export { formatPostDate } from "@/lib/blog/format";
