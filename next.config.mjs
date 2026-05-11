/** @type {import('next').NextConfig} */
const nextConfig = {
  trailingSlash: true,
  allowedDevOrigins: ['127.0.0.1'],
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
      { protocol: 'http', hostname: '**' },
    ],
  },
};

export default nextConfig;
