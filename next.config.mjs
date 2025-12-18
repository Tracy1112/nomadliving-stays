/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // 启用图片优化（Next.js自动优化图片）
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'img.clerk.com',
      },
      {
        protocol: 'https',
        hostname: 'ziiabtjfoefytlefvpir.supabase.co',
      },
    ],
  },
  // 启用压缩
  compress: true,
  // 生产环境优化
  swcMinify: true,
  // 优化字体加载
  optimizeFonts: true,
}

export default nextConfig
