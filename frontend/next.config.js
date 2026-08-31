const isMobileBuild = process.env.BUILD_TARGET === 'mobile';

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: isMobileBuild ? 'export' : 'standalone',
  images: {
    unoptimized: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  async rewrites() {
    if (isMobileBuild) {
      return [];
    }
    const backendUrl = process.env.BACKEND_URL || 'http://127.0.0.1:3891';
    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/api/:path*`,
      },
      {
        source: '/datasets/:path*',
        destination: `${backendUrl}/datasets/:path*`,
      },
      {
        source: '/analyzers/:path*',
        destination: `${backendUrl}/analyzers/:path*`,
      },
      {
        source: '/health',
        destination: `${backendUrl}/health`,
      },
    ];
  },
};

module.exports = nextConfig;
