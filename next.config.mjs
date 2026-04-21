import './src/env.js';

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

export default nextConfig;
