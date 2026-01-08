import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Navbar from '@/components/navbar/Navbar'
import Footer from '@/components/Footer'
import Providers from './providers'
import { ClerkProvider } from '@clerk/nextjs'
import ErrorBoundary from '@/components/ErrorBoundary'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: {
    default: 'NomadLiving Stays | Luxury Glamping & Unique Homes',
    template: '%s | NomadLiving Stays',
  },
  description:
    'Discover extraordinary stays in handpicked glamping sites and tiny homes. Each property features curated furniture from NomadLiving Boutique, creating immersive experiences where you can shop the look and bring the aesthetic home.',
  keywords: [
    'glamping',
    'tiny homes',
    'curated stays',
    'luxury camping',
    'unique accommodations',
    'boutique furniture',
    'experience-based travel',
    'Australia',
  ],
  authors: [{ name: 'NomadLiving' }],
  creator: 'NomadLiving',
  publisher: 'NomadLiving',
  openGraph: {
    type: 'website',
    locale: 'en_AU',
    url: 'https://nomadliving-stays.vercel.app',
    siteName: 'NomadLiving Stays',
    title: 'NomadLiving Stays | Luxury Glamping & Unique Homes',
    description:
      'Discover extraordinary stays in handpicked glamping sites and tiny homes. Shop the look with curated furniture from NomadLiving Boutique.',
    images: [
      {
        url: '/og-image.jpg', // You'll need to add this image
        width: 1200,
        height: 630,
        alt: 'NomadLiving Stays - Luxury Glamping & Unique Homes',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'NomadLiving Stays | Luxury Glamping & Unique Homes',
    description:
      'Discover extraordinary stays in handpicked glamping sites and tiny homes.',
    images: ['/og-image.jpg'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
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
              <Footer />
            </Providers>
          </ErrorBoundary>
        </body>
      </html>
    </ClerkProvider>
  )
}
