import type { NextConfig } from "next";

/** Sections whose `/events` routes were renamed to `/hackathons`. */
const RENAMED_SECTIONS = ["", "/dashboard", "/organizer", "/judge", "/admin"];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // The Hardhat project (Phase 3) is excluded from the Next.js TypeScript
  // program via tsconfig; contracts tooling carries its own config.

  // Old links (emails already sent, bookmarks, shared URLs) keep working.
  async redirects() {
    return RENAMED_SECTIONS.flatMap((section) => [
      { source: `${section}/events`, destination: `${section}/hackathons`, permanent: true },
      {
        source: `${section}/events/:path*`,
        destination: `${section}/hackathons/:path*`,
        permanent: true,
      },
    ]);
  },
};

export default nextConfig;
