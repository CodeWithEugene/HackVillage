import * as Sentry from "@sentry/nextjs";

/**
 * Edge-runtime Sentry init, imported by instrumentation.ts ONLY when
 * SENTRY_DSN is set. The app has no edge routes today; this exists so any
 * future edge middleware/route is covered without re-wiring.
 */
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  // See sentry.server.config.ts — v11 collects broadly by default; pin off.
  dataCollection: {
    userInfo: false,
    cookies: false,
    httpHeaders: { request: false, response: false },
    httpBodies: [],
    urlQueryParams: false,
    genAI: { inputs: false, outputs: false },
  },
  tracesSampleRate: 0,
});
