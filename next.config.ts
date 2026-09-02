import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone', // produces a minimal Dockerfile-friendly server build
  reactStrictMode: true,
  // We keep Firebase as the source of truth for *data* in this migration phase.
  // Only Better Auth server secrets must NOT be exposed to the client.
  serverExternalPackages: ['better-auth', 'pg'],
  experimental: {
    // Keep server actions and route handlers on Node runtime (pg needs it).
    serverActions: { bodySizeLimit: '10mb' },
  },
  // Don't fail builds on lint warnings during the cutover — clean up later.
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: false },
};

export default nextConfig;
