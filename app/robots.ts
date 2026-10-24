
import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/admin/',
        '/api/',
        '/login',
        '/signup',
        '/dashboard/',
      ],
    },
    sitemap: 'https://cveat.in/sitemap.xml',
    host: 'https://cveat.in',
  }
}
