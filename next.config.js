/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api/v1',
  },
  async rewrites() {
    return [
      {
        source: '/backend/:path*',
        destination: 'https://hr-saas-server-production.up.railway.app/api/v1/:path*',
      },
    ];
  },
};

module.exports = nextConfig;
