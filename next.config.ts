import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone', // produces a minimal Dockerfile-friendly server build
  reactStrictMode: true,
  // Server-only deps that should not be bundled by Next.js. Both need Node APIs
  // (better-auth reads `process.env`, pg is a native client).
  serverExternalPackages: ['better-auth', 'pg'],
  experimental: {
    // Keep server actions and route handlers on Node runtime (pg needs it).
    serverActions: { bodySizeLimit: '10mb' },
  },
  // Don't fail builds on lint warnings — clean them up separately.
  // TS errors still fail the build.
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: false },
};

export default nextConfig;
