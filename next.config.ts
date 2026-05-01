import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';
import { withSentryConfig } from '@sentry/nextjs';
import path from 'node:path';
import './src/env';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  // Pin the workspace root to this repo so Next.js 16's turbopack/webpack
  // doesn't walk up and pick C:\Users\hp elitebook\package-lock.json as the
  // project root — a bogus root breaks proxy.ts discovery (the one file
  // convention Next.js resolves from project root rather than from app/).
  // See: https://nextjs.org/docs/app/api-reference/config/next-config-js/turbopack#root-directory
  turbopack: {
    root: path.resolve(__dirname),
  },
  // Phase 3 Plan 01: enable Next.js 16's stable cacheComponents flag so
  // public RSC pages may use the `'use cache'` directive + cacheTag pipeline.
  // Pitfall #1 (RESEARCH §"State of the Art"): the flag became top-level
  // (not under `experimental`) in Next 16. Admin pages that opt out via
  // force-dynamic continue to bypass this cache (Pitfall A6).
  cacheComponents: true,
  experimental: {
    // Next.js 16 defaults: App Router on, React 19 runtime.
    // rootParams: required when cacheComponents + a dynamic root segment
    // ([locale]) coexist. Without it, GET / short-circuits to _not-found
    // before the next-intl proxy can run the locale redirect.
    // See: https://aurorascharff.no/posts/implementing-nextjs-16-use-cache-with-next-intl-internationalization/
    rootParams: true,
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'res.cloudinary.com' },
    ],
  },
};

export default withSentryConfig(withNextIntl(nextConfig), {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
  tunnelRoute: '/sentry-tunnel',
  // @sentry/nextjs v10 replaced the v8 `hideSourceMaps: true` flag with
  // `sourcemaps.deleteSourcemapsAfterUpload: true` — same outcome (uploaded
  // maps aren't left publicly served next to the bundle). See CHANGELOG for
  // @sentry/nextjs 10.x.
  sourcemaps: {
    deleteSourcemapsAfterUpload: true,
  },
  disableLogger: true,
});
