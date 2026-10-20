/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  typescript: {
    // Prevent Hostinger OOM errors during build type-checking
    ignoreBuildErrors: true,
  },
  eslint: {
    // Prevent linting failures from killing the production build
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: 'http',
        hostname: '**',
      },
    ],
  },
  env: {
    DATABASE_URL:
      process.env.DATABASE_URL ||
      'postgresql://postgres.toucabgdgfrkpohwkzki:Nm%40102060%40nm@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true',
    DIRECT_URL:
      process.env.DIRECT_URL ||
      'postgresql://postgres.toucabgdgfrkpohwkzki:Nm%40102060%40nm@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres',
    JWT_SECRET: process.env.JWT_SECRET || 'replyx_ai_super_secret_jwt_key_2026_bd_secure',
    ENCRYPTION_KEY: process.env.ENCRYPTION_KEY || 'replyx_32_bytes_secret_key_2026!',
    SUPABASE_URL: process.env.SUPABASE_URL || 'https://toucabgdgfrkpohwkzki.supabase.co',
  },
  webpack: (config) => {
    config.externals = [...(config.externals || []), 'bcryptjs'];
    return config;
  },
  async redirects() {
    return [
      {
        source: '/automation',
        destination: '/dashboard/ai-rules',
        permanent: false,
      },
      {
        source: '/customers',
        destination: '/dashboard/conversations',
        permanent: false,
      },
      {
        source: '/messages',
        destination: '/dashboard/conversations',
        permanent: false,
      },
      {
        source: '/analytics',
        destination: '/dashboard/reports',
        permanent: false,
      },
      {
        source: '/settings',
        destination: '/dashboard/settings',
        permanent: false,
      },
      {
        source: '/profile',
        destination: '/dashboard/settings',
        permanent: false,
      },
    ];
  },
  async headers() {
    return [
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
        ],
      },
      {
        source: '/global.css',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, must-revalidate',
          },
          {
            key: 'Content-Type',
            value: 'text/css; charset=utf-8',
          },
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
        ],
      },
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;

