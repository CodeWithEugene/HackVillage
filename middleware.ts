import { NextResponse, type NextRequest } from "next/server";

import { auth } from "@/lib/auth";

/**
 * Session upkeep only, never access control (the layout guards in
 * lib/auth/guards.ts decide who sees what). Each real request from a
 * signed-in visitor re-checks the session and slides its cookie, which is
 * what makes the inactivity timeout measure inactivity. It runs on Node.js
 * because the session check reads the database (revocation, roles).
 */
export const config = {
  runtime: "nodejs",
  matcher: [
    // Everything except static assets, Auth.js's own endpoints, payment
    // webhooks and the health probe.
    "/((?!_next/static|_next/image|favicon|branding/|images/|api/auth|api/webhooks|api/health).*)",
  ],
};

const SESSION_COOKIE = /^(__Secure-)?authjs\.session-token(\.\d+)?$/;

const refreshSession = auth(() => NextResponse.next());

/**
 * Browser speculative prefetches (rel=prefetch, speculation rules) can fire
 * without the user doing anything, so they aren't activity. App Router link
 * prefetches can't be told apart here (Next.js strips its router headers
 * before middleware), but they only happen as the user navigates or scrolls.
 */
function isSpeculativePrefetch(request: NextRequest): boolean {
  return (
    request.headers.get("purpose") === "prefetch" ||
    request.headers.get("sec-purpose")?.includes("prefetch") === true
  );
}

// Auth.js types its wrapper's second argument as a route context; the wrapped
// callback above never reads it, so an empty one is passed.
const NO_ROUTE_CONTEXT = { params: Promise.resolve({}) };

export default function middleware(request: NextRequest) {
  const signedIn = request.cookies.getAll().some((cookie) => SESSION_COOKIE.test(cookie.name));
  if (!signedIn || isSpeculativePrefetch(request)) return NextResponse.next();
  return refreshSession(request, NO_ROUTE_CONTEXT);
}
