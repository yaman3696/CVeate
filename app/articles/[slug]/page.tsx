'use client'

import { useState, useEffect } from 'react'
import { useParams, notFound } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export default function ArticlePage() {
  const params = useParams()
  const slug = params?.slug

  const [blog, setBlog] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    const checkAdminAndFetch = async () => {
      // Check admin status
      const { data: { user } } = await supabase.auth.getUser()
      if (user && user.email === 'yaman.kashyap@gmail.com') {
        setIsAdmin(true)
      }

      if (!slug) return

      // Fetch article
      const { data, error } = await supabase
        .from('blogs')
        .select('*')
        .eq('slug', slug)
        .single()

      if (data) {
        setBlog(data)
        document.title = `${data.title} | CVeat Blog`
      }
      setLoading(false)
    }

    checkAdminAndFetch()
  }, [slug])

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-slate-500">Loading article...</div>
  }

  // Trigger Next.js 404 handling if the article does not exist in Supabase
  if (!blog) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-white text-slate-900 py-16 px-6">
      <article className="mx-auto max-w-3xl space-y-8">
        
        {/* Navigation & Minimalist Edit Icon Button */}
        <div className="flex items-center justify-between">
          <Link href="/blog" className="text-xs font-bold text-indigo-600 hover:underline inline-block">
             Back to Career Insights
          </Link>
          {isAdmin && (
            <Link href={`/admin/blog/edit/${blog.id}`} title="Edit Article">
              <button className="h-9 w-9 rounded-xl border border-slate-200 bg-white flex items-center justify-center text-slate-600 hover:text-indigo-600 hover:bg-slate-50 transition-all shadow-sm cursor-pointer">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </button>
            </Link>
          )}
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-md border border-indigo-100">
              {blog.category}
            </span>
            <span className="text-xs text-slate-400">Published on {new Date(blog.created_at).toLocaleDateString()}</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 leading-tight">
            {blog.title}
          </h1>
          <p className="text-sm text-slate-500 font-medium">By {blog.author}</p>
        </div>

        {/* Divider */}
        <hr className="border-slate-100" />

        {/* Main Content Area */}
        <div 
          className="max-w-none text-slate-700 leading-relaxed space-y-4 [&_a]:text-indigo-600 [&_a]:font-bold [&_a]:underline [&_a]:underline-offset-4 hover:[&_a]:text-indigo-800"
          dangerouslySetInnerHTML={{ __html: blog.content }}
        />

        {/* Footer Backlink Callout */}
        <div className="mt-16 p-8 rounded-3xl bg-indigo-50/70 border border-indigo-100 text-center space-y-4">
          <h3 className="text-xl font-bold text-slate-900">Ready to build your ATS-optimized resume?</h3>
          <p className="text-xs text-slate-600 max-w-lg mx-auto leading-relaxed">
            Stop letting automated recruitment filters reject your applications. Use Cveat's guided wizard to generate a clean, recruiter-approved CV in minutes.
          </p>
          <Link href="/onboard">
            <button className="rounded-xl bg-indigo-600 px-8 py-3.5 text-xs font-bold text-white shadow-md hover:bg-indigo-500 transition-all cursor-pointer inline-block">
              Create Your CV Now
            </button>
          </Link>
        </div>

      </article>
    </div>
  )
}