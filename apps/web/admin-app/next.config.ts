import type { NextConfig } from 'next';

const configuredApiUrl = process.env.NEXT_PUBLIC_API_URL?.trim() || 'http://localhost:4000';
let apiOrigin = 'http://localhost:4000';
try {
  apiOrigin = new URL(configuredApiUrl).origin;
} catch {
  throw new Error('NEXT_PUBLIC_API_URL must be an absolute URL');
}

const development = process.env.NODE_ENV === 'development';
const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  `script-src 'self' 'unsafe-inline'${development ? " 'unsafe-eval'" : ''}`,
  "script-src-attr 'none'",
  `connect-src 'self' ${apiOrigin}${development ? ' ws: wss:' : ''}`,
].join('; ');

const nextConfig: NextConfig = {
  output: 'standalone',
  poweredByHeader: false,
  transpilePackages: [
    '@beautyathome/auth',
    '@beautyathome/marketplace',
    '@beautyathome/types',
  ],
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Cache-Control', value: 'no-store' },
          { key: 'Content-Security-Policy', value: contentSecurityPolicy },
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
          { key: 'Cross-Origin-Resource-Policy', value: 'same-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), geolocation=(), microphone=()' },
          { key: 'Referrer-Policy', value: 'no-referrer' },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains',
          },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive' },
        ],
      },
    ];
  },
};

export default nextConfig;
