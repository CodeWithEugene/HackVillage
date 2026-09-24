import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // The Hardhat project (Phase 3) is excluded from the Next.js TypeScript
  // program via tsconfig; contracts tooling carries its own config.
};

export default nextConfig;
