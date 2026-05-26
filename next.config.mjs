/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '25mb',
    },
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'uccschvusivqldaprsfq.supabase.co' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
    ],
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      canvas: false,
    };
    return config;
  },
};

export default nextConfig;
