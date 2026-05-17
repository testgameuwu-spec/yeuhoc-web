/** @type {import('next').NextConfig} */
const nextConfig = {
  trailingSlash: true,
  allowedDevOrigins: ['127.0.0.1'],
  experimental: {
    optimizePackageImports: ['lucide-react', '@phosphor-icons/react'],
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [360, 414, 640, 768, 1024, 1280],
    imageSizes: [28, 32, 40, 48, 96, 192, 320],
    qualities: [60, 75],
    minimumCacheTTL: 86400,
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
      { protocol: 'http', hostname: '**' },
    ],
  },
};

export default nextConfig;
