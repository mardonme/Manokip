import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';
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
  experimental: {
    // Next.js 16 defaults: App Router on, React 19 runtime
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'res.cloudinary.com' },
    ],
  },
};

export default withNextIntl(nextConfig);
