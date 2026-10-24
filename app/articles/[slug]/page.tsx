
import { Suspense } from 'react'
import { connection } from 'next/server'
import { notFound } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase-admin'
import ArticleClient from './ArticleClient'

// Allow this route to block while checking the article
export const instant = false

async function DynamicArticleContent() {
  await connection()
  return <ArticleClient />
}

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  // Wait for the request before checking the article
  await connection()

  const { slug } = await params

  // Check whether the article exists and is published
  const { data: blog, error } = await supabaseAdmin
    .from('blogs')
    .select('id')
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle()

  if (error) {
    throw new Error(`Unable to check article: ${error.message}`)
  }

  if (!blog) {
    notFound()
  }

  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center text-slate-500">
          Loading article...
        </div>
      }
    >
      <DynamicArticleContent />
    </Suspense>
  )
}
