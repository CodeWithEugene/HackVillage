import path from "node:path";
import { fileURLToPath } from "node:url";
import withPWAInit from "@ducanh2912/next-pwa";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  fallbacks: {
    document: "/offline",
  },
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Allow App Router pages to import from ../backend
  experimental: {
    externalDir: true,
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      "@": __dirname,
      "@backend": path.resolve(__dirname, "../backend"),
    };
    return config;
  },
};

export default withPWA(nextConfig);
