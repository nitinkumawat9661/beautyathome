import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  transpilePackages: ['@beautyathome/ui', '@beautyathome/types', '@beautyathome/utils'],
};

export default nextConfig;
