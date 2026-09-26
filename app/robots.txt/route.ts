import { robotsTxt } from "@/lib/seo/robots";

export function GET(): Response {
  return new Response(robotsTxt(), {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=3600, must-revalidate",
    },
  });
}
