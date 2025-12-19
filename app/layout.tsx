import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Navbar from '@/components/navbar/Navbar'
import Providers from './providers'
import { ClerkProvider } from '@clerk/nextjs'
import ErrorBoundary from '@/components/ErrorBoundary'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'HomeAway - Short-Term Rental Booking Platform',
  description:
    'Feel at home, away from home. A modern short-term rental booking platform showcasing full-stack development capabilities.',
  keywords: [
    'short-term rental',
    'booking',
    'Next.js',
    'full-stack development',
    'property rental',
    'Australia',
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
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
