import * as Sentry from "@sentry/nextjs";

/**
 * Server-side Sentry init, imported by instrumentation.ts ONLY when
 * SENTRY_DSN is set — without a DSN the SDK never loads at all.
 */
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  // v10's sendDefaultPii:false was removed in SDK v11, and the v11 default
  // COLLECTS user info, headers, cookies, and bodies. Pin every category
  // off: request data and user objects must never leave the platform.
  dataCollection: {
    userInfo: false,
    cookies: false,
    httpHeaders: { request: false, response: false },
    httpBodies: [],
    urlQueryParams: false,
    genAI: { inputs: false, outputs: false },
  },
  // Error tracking only — no performance spans until volume justifies them.
  tracesSampleRate: 0,
});
