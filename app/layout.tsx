
import type { Metadata } from 'next'
import { cacheLife, cacheTag } from 'next/cache'
import { Inter, Manrope } from 'next/font/google'
import './globals.css'
import ClientLayout from './ClientLayout'
import { getPublishedSiteSettings } from '@/lib/site-settings-server'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
})

const manrope = Manrope({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-manrope',
})

const originalMetadata: Metadata = {
  metadataBase: 'https://cveat.in',

  title: {
    default: 'Cveat | AI Resume Builder & ATS Checker',
    template: '%s | Cveat',
  },

  description:
    'Build professional resumes, check ATS compatibility, and prepare for job interviews with Cveat. Your AI-powered career companion.',

  applicationName: 'Cveat',

  keywords: [
    'Cveat',
    'AI Resume Builder',
    'ATS Resume Checker',
    'ATS Score Checker',
    'Resume Builder India',
    'Resume Optimization',
    'Interview Preparation',
  ],

  openGraph: {
    title: 'Cveat | AI Resume Builder & ATS Checker',
    description:
      'Build professional resumes, check ATS compatibility, and prepare for interviews with Cveat.',
    url: 'https://cveat.in',
    siteName: 'Cveat',
    locale: 'en_IN',
    type: 'website',
  },

  twitter: {
    card: 'summary_large_image',
    title: 'Cveat | AI Resume Builder & ATS Checker',
    description:
      'Build professional resumes and improve your ATS compatibility with Cveat.',
  },

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
}

export async function generateMetadata(): Promise<Metadata> {
  'use cache'
  cacheLife({ stale: 300, revalidate: 60, expire: 3600 })
  cacheTag('site-settings')
  const site = await getPublishedSiteSettings()
  const images = site.shareImage ? [{ url: site.shareImage }] : undefined
  return {
    ...originalMetadata,
    title: { default: site.seoTitle, template: `%s | ${site.companyName}` },
    description: site.seoDescription,
    applicationName: site.companyName,
    ...(site.favicon ? { icons: { icon: [{ url: site.favicon, type: 'image/png' }], shortcut: site.favicon, apple: site.favicon } } : {}),
    openGraph: { ...originalMetadata.openGraph, title: site.seoTitle, description: site.seoDescription, siteName: site.companyName, ...(images ? { images } : {}) },
    twitter: { ...originalMetadata.twitter, title: site.seoTitle, description: site.seoDescription, ...(images ? { images } : {}) },
  }
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${manrope.variable} bg-white text-slate-900 antialiased font-sans`}
      >
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  )
}
