import Link from "next/link";

import type { BlogPost } from "@/lib/blog/types";

function Body() {
  return (
    <>
      <p>
        The photos from a hackathon matter more than most organizers expect. They are how sponsors
        see what they paid for, how builders show off their weekend, and how the next cohort decides
        whether to sign up. That is why every hackathon on HackVillage comes with a simple promise:
        media within 48 hours.
      </p>

      <h2>What The Standard Asks</h2>
      <p>
        Within 48 hours of your hackathon ending, upload photos or videos to its page. That is it. A
        good set covers the kickoff, teams at work, the demos, and the winners with their prizes.
      </p>

      <h2>What Happens If You Miss It</h2>
      <p>
        Missing the deadline costs your organization 10 points on its trust score. If something
        genuinely got in the way, you can appeal, and the HackVillage team can reverse the penalty
        when the reason holds up.
      </p>

      <h2>How The Trust Score Works</h2>
      <ul>
        <li>Every organization starts at 100.</li>
        <li>Missed media deadlines take points away, unless an appeal is granted.</li>
        <li>The HackVillage team can adjust a score, always with a recorded reason.</li>
        <li>The score never drops below 0 and tops out at 150.</li>
      </ul>
      <p>
        Your score appears on every hackathon you host, so builders can see your track record before
        they register.
      </p>

      <h2>Tips For Hitting 48 Hours Every Time</h2>
      <ul>
        <li>Name one person as the media lead before the hackathon starts.</li>
        <li>Shoot on phones throughout the event instead of saving it all for the demos.</li>
        <li>Pick your best twenty shots on the last evening, while everyone is still around.</li>
        <li>Ask teams for permission before you photograph them up close.</li>
      </ul>
      <p>
        Want the full picture of what organizers commit to? Read{" "}
        <Link href="/how-it-works">How It Works</Link>.
      </p>
    </>
  );
}

export const post: BlogPost = {
  meta: {
    slug: "the-48-hour-media-standard",
    title: "The 48 Hour Media Standard, Explained",
    excerpt:
      "Why every HackVillage hackathon shares its photos within two days, what it does for your trust score, and how to hit it every time.",
    category: "Organizers",
    publishedAt: "2026-09-15",
    author: "HackVillage Team",
    readingMinutes: 3,
    cover: "/marketing/blog/media.webp",
    coverAlt: "A Kenyan photographer and event coordinator reviewing hackathon photos",
  },
  Body,
};
