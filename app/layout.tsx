import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Inter as InterFont, Geist_Mono, Oswald } from 'next/font/google'
import { Toaster } from '@/components/ui/sonner'
import './globals.css'


const oswald = Oswald({
  subsets: ['latin'],
  variable: '--font-oswald',
  weight: '400',
  display: 'swap',
})

const inter = InterFont({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const geistMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-geist-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Hoopoe Event Planner',
  description:
    'Find the best date for an mtg event, lock it in, and show up with friends.',
  openGraph: {
    title: 'Hoopoe Event Planner',
    description:
      'Find the best date for an mtg event, lock it in, and show up with friends.',
    type: 'website',
    images: [{
      url: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/OpenGraph-H3QBw2IGaD1T6GH6Rj1SMItCUbz7vB.png',
      width: 1200,
      height: 630,
      alt: 'Hoopoe Boys Team Command Center',
    }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Hoopoe Event Planner',
    description:
      'Find the best date for an mtg event, lock it in, and show up with friends.',
    images: ['https://hebbkx1anhila5yf.public.blob.vercel-storage.com/OpenGraph-H3QBw2IGaD1T6GH6Rj1SMItCUbz7vB.png'],
  },
  generator: 'v0.app',
}

export const viewport: Viewport = {
  colorScheme: 'light dark',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#000000' },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      className={`bg-background ${oswald.variable} ${inter.variable} ${geistMono.variable}`}
    >
      <body className="font-sans antialiased">
        {children}
        <Toaster position="top-center" />
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
