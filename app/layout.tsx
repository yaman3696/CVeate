
import type { Metadata } from 'next'
import { Inter, Manrope } from 'next/font/google'
import './globals.css'
import ClientLayout from './ClientLayout'

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

export const metadata: Metadata = {
  metadataBase: new URL('https://cveat.in'),

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
