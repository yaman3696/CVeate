
import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { cacheLife } from 'next/cache'

type ArticleLayoutProps = {
  children: ReactNode
  params: Promise<{ slug: string }>
}

const siteUrl = 'https://cveat.in'
async function getArticleSeo(slug: string) {
    'use cache'
  
    cacheLife('minutes')
  
    const { data, error } = await supabaseAdmin
      .from('blogs')
      .select(`
        title,
        slug,
        excerpt,
        meta_title,
        meta_description,
        published_at
      `)
      .eq('slug', slug)
      .eq('status', 'published')
      .maybeSingle()
  
    if (error) {
      throw new Error(`Unable to load article SEO: ${error.message}`)
    }
  
    return data
  }

export async function generateMetadata({
  params,
}: ArticleLayoutProps): Promise<Metadata> {
  const { slug } = await params


  if (
    !slug ||
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)
  ) {
    return {
      title: 'Article Not Found | CVeat',
      robots: { index: false, follow: false },
    }
  }

  const blog = await getArticleSeo(slug)

  if (!blog) {
    return {
      title: 'Article Not Found | CVeat',
      robots: { index: false, follow: false },
    }
  }

  const title = blog.meta_title?.trim() || blog.title
  const description =
    blog.meta_description?.trim() ||
    blog.excerpt?.trim() ||
    ''

  const canonicalUrl =
    `${siteUrl}/articles/${encodeURIComponent(blog.slug)}`

  return {
    title,
    description,

    alternates: {
      canonical: canonicalUrl,
    },

    robots: {
      index: true,
      follow: true,
    },

    openGraph: {
      type: 'article',
      title,
      description,
      url: canonicalUrl,
      siteName: 'CVeat',
      ...(blog.published_at
        ? { publishedTime: blog.published_at }
        : {}),
    },

    twitter: {
      card: 'summary',
      title,
      description,
    },
  }
}

export default function ArticleLayout({
    children,
  }: {
    children: ReactNode
  }) {
    return <>{children}</>
  }