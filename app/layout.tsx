import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Navbar from '@/components/navbar/Navbar'
import Providers from './providers'
import { ClerkProvider } from '@clerk/nextjs'
import ErrorBoundary from '@/components/ErrorBoundary'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'HomeAway - 短租预订平台',
  description: 'Feel at home, away from home. 现代化的短租预订平台，展示全栈开发能力。',
  keywords: ['短租', '预订', 'Next.js', '全栈开发'],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <ClerkProvider>
      <html lang="zh-CN" suppressHydrationWarning>
        <body className={inter.className}>
          <ErrorBoundary>
            <Providers>
              <Navbar />
              <main className="container py-10">{children}</main>
            </Providers>
          </ErrorBoundary>
        </body>
      </html>
    </ClerkProvider>
  )
}
