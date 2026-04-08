/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  serverExternalPackages: ['sqlite3'],
};

export default nextConfig;
