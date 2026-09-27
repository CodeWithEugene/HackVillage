import * as Sentry from "@sentry/nextjs";

/**
 * Client-side Sentry (SDK v11 convention: instrumentation-client.ts replaces
 * sentry.client.config.ts). The browser only sees NEXT_PUBLIC_* vars, so the
 * client DSN is a separate public value; when it is absent `enabled: false`
 * makes the SDK a complete no-op — no transport, no warnings.
 */
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

Sentry.init({
  dsn,
  enabled: Boolean(dsn),
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

/** Navigation spans for App Router (no-op while tracing is off). */
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
