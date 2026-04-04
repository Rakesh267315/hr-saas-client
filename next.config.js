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
  // ── Kokoro-js / @huggingface/transformers WASM support ────────────────────
  webpack: (config, { isServer }) => {
    // Kokoro-js uses fs/promises and path — ignore them in browser bundle
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
      };
    }
    // Enable WASM (needed by onnxruntime-web inside @huggingface/transformers)
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
      layers: true,
    };
    return config;
  },
};

module.exports = nextConfig;
