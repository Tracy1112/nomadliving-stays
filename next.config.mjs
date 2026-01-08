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
      // 动态支持 Supabase URL（从环境变量读取）
      // 如果 Supabase 暂停，Next.js Image 优化器会失败，SafeImage 组件会回退到原生 img
      ...(process.env.SUPABASE_URL
        ? [
            {
              protocol: 'https',
              hostname: new URL(process.env.SUPABASE_URL).hostname,
            },
          ]
        : []),
      // 也支持硬编码的 Supabase hostname（用于构建时）
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
    ],
  },
  // 启用压缩
  compress: true,
  // 生产环境优化
  swcMinify: true,
  // 优化字体加载
  optimizeFonts: true,
  // Enable instrumentation hook (for Sentry and other monitoring tools)
  experimental: {
    instrumentationHook: true,
  },
}

// Wrap with Sentry if available (optional - only if @sentry/nextjs is installed)
let config = nextConfig

// Try to wrap with Sentry (will fail gracefully if not installed)
// Only attempt if DSN is provided to avoid unnecessary require
if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  try {
    const { withSentryConfig } = require('@sentry/nextjs')
    config = withSentryConfig(nextConfig, {
      // Sentry configuration options
      silent: true, // Suppress source map uploading logs during build
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
    })
  } catch (e) {
    // Sentry not installed, use default config
    // Only log in development to avoid build noise
    if (process.env.NODE_ENV === 'development') {
      console.log(
        'Sentry not configured. Install @sentry/nextjs to enable error tracking.'
      )
    }
  }
}

export default config
