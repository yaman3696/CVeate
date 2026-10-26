'use client'

import { useState, useEffect } from 'react'
import { useParams, notFound } from 'next/navigation'
import Link from 'next/link'

export default function ArticlePage() {
  const params = useParams()
  const slug = params?.slug

  const [blog, setBlog] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  

  useEffect(() => {
    let active = true
  
    const fetchArticle = async () => {
      if (typeof slug !== 'string') {
        if (active) setLoading(false)
        return
      }
  
      try {
        const response = await fetch(
          `/api/articles/${encodeURIComponent(slug)}`,
          { cache: 'no-store' }
        )
  
        if (!response.ok) {
          if (response.status !== 404) {
            console.error('Unable to load article:', response.status)
          }
  
          if (active) setBlog(null)
          return
        }
  
        const result = await response.json()
        console.log('[ARTICLE DEBUG] API result:', result)
  
        if (!active) return
  
        const article = result.blog ?? null
  
        setBlog(article)

      } catch (error) {
        console.error('Unable to load article:', error)
  
        if (active) setBlog(null)
      } finally {
        if (active) setLoading(false)
      }
    }
  
    void fetchArticle()
  
    return () => {
      active = false
    }
  }, [slug])
  


    // Trigger Next.js 404 handling if the article does not exist in Supabase
    if (loading) {
      return (
        <div className="min-h-screen flex items-center justify-center text-slate-500 dark:bg-[#0B1120] dark:text-slate-100 dark:text-slate-400 transition-colors duration-300">
          Loading article...
        </div>
      )
    }
    
    if (!blog) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-6 text-center dark:bg-[#0B1120] dark:text-slate-100 transition-colors duration-300">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 transition-colors duration-300">
            Article Not Found
          </h1>
          <p className="text-slate-500 dark:text-slate-400 transition-colors duration-300">
            This article may have been removed or is no longer published.
          </p>
          <Link href="/blog" className="text-indigo-600 font-semibold hover:underline dark:text-indigo-300 transition-colors duration-300">
            Back to Career Insights
          </Link>
        </div>
      )
    }

  // Structured data for search engines
  const articleUrl = `https://cveat.in/articles/${encodeURIComponent(blog.slug)}`

  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: blog.title,
    description: blog.meta_description || blog.excerpt || '',
    url: articleUrl,
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': articleUrl,
    },
    author: {
      '@type': 'Person',
      name: blog.author,
    },
    publisher: {
      '@type': 'Organization',
      name: 'CVeat',
      url: 'https://cveat.in',
    },
    ...(blog.published_at
      ? { datePublished: blog.published_at }
      : {}),
    ...(blog.updated_at
      ? { dateModified: blog.updated_at }
      : {}),
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(articleSchema).replace(/</g, '\\u003c'),
        }}
      />

      <div className="min-h-screen bg-white text-slate-900 py-16 px-6 dark:bg-[#0B1120] dark:text-slate-100 transition-colors duration-300">
      <article className="mx-auto max-w-3xl space-y-8">
        
        {/* Navigation & Minimalist Edit Icon Button */}
        <div className="flex items-center justify-between">
          <Link href="/blog" className="text-xs font-bold text-indigo-600 hover:underline inline-block dark:text-indigo-300 transition-colors duration-300">
             Back to Career Insights
          </Link>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-md border border-indigo-100 dark:bg-indigo-400/15 dark:text-indigo-300 dark:border-slate-700/70 transition-colors duration-300">
              {blog.category}
            </span>
            <span className="text-xs text-slate-400 dark:text-slate-400 transition-colors duration-300">Published on {new Date(blog.published_at ?? blog.created_at).toLocaleDateString()}</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 leading-tight dark:text-slate-100 transition-colors duration-300">
            {blog.title}
          </h1>
          <p className="text-sm text-slate-500 font-medium dark:text-slate-400 transition-colors duration-300">By {blog.author}</p>
        </div>

        {/* Divider */}
        <hr className="border-slate-100 dark:border-slate-700/70 transition-colors duration-300" />

        {/* Main Content Area */}
        <div 
          
className="max-w-none text-slate-700 leading-relaxed space-y-4 [&_strong]:font-bold [&_strong]:text-slate-900 [&_b]:font-bold [&_b]:text-slate-900 [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:text-slate-900 [&_h2]:mt-6 [&_h2]:mb-3 [&_h3]:text-xl [&_h3]:font-bold [&_h3]:text-slate-900 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:mb-2 [&_a]:text-indigo-600 [&_a]:font-bold [&_a]:underline [&_a]:underline-offset-4 hover:[&_a]:text-indigo-800 dark:text-slate-300 dark:[&_strong]:text-slate-100 dark:[&_b]:text-slate-100 dark:[&_h1]:text-slate-100 dark:[&_h2]:text-slate-100 dark:[&_h3]:text-slate-100 dark:[&_h4]:text-slate-100 dark:[&_h5]:text-slate-100 dark:[&_h6]:text-slate-100 dark:[&_a]:text-indigo-300 dark:[&_a:hover]:text-indigo-200 dark:[&_blockquote]:text-slate-300 dark:[&_blockquote]:border-slate-600 dark:[&_hr]:border-slate-700 dark:[&_th]:text-slate-100 dark:[&_th]:border-slate-700 dark:[&_td]:border-slate-700 dark:[&_pre]:bg-[#111C30] dark:[&_pre]:text-slate-200 dark:[&_code]:text-indigo-200 transition-colors duration-300"
          dangerouslySetInnerHTML={{ __html: blog.content }}
        />

        {/* Footer Backlink Callout */}
        <div className="mt-16 p-8 rounded-3xl bg-indigo-50/70 border border-indigo-100 text-center space-y-4 dark:bg-indigo-400/15 dark:border-slate-700/70 transition-colors duration-300">
          <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 transition-colors duration-300">Ready to build your ATS-optimized resume?</h3>
          <p className="text-xs text-slate-600 max-w-lg mx-auto leading-relaxed dark:text-slate-300 transition-colors duration-300">
            Stop letting automated recruitment filters reject your applications. Use Cveat's guided wizard to generate a clean, recruiter-approved CV in minutes.
          </p>
          <Link href="/onboard">
            <button className="rounded-xl bg-indigo-600 px-8 py-3.5 text-xs font-bold text-white shadow-md hover:bg-indigo-500 transition-all cursor-pointer inline-block dark:shadow-black/20 dark:hover:bg-indigo-700">
              Create Your CV Now
            </button>
          </Link>
        </div>

        </article>
      </div>
    </>
  )
}
