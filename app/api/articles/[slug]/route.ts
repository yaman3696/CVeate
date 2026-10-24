
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { sanitizeBlogHtml } from '@/lib/blog/sanitize-html'

type RouteContext = {
  params: Promise<{ slug: string }>
}

export async function GET(
  _request: NextRequest,
  { params }: RouteContext
) {
  const { slug } = await params

  if (
    !slug ||
    slug.length > 200 ||
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)
  ) {
    return NextResponse.json(
      { error: 'Invalid article URL.' },
      { status: 400 }
    )
  }

  const { data, error } = await supabaseAdmin
    .from('blogs')
    .select(`
      id,
      title,
      slug,
      excerpt,
      content,
      category,
      author,
      status,
      created_at,
      published_at,
      meta_title,
      meta_description
    `)
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle()

  if (error) {
    console.error('Public article GET failed:', error.message)

    return NextResponse.json(
      { error: 'Unable to load article.' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    )
  }

  if (!data) {
    return NextResponse.json(
      { error: 'Article not found.' },
      { status: 404, headers: { 'Cache-Control': 'no-store' } }
    )
  }

  return NextResponse.json(
    {
      blog: {
        ...data,
        content: sanitizeBlogHtml(data.content ?? ''),
      },
    },
    { headers: { 'Cache-Control': 'no-store' } }
  )
}
