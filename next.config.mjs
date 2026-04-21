import createNextIntlPlugin from 'next-intl/plugin';
import './src/env.js';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
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
