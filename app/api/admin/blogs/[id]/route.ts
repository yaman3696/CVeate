
import { NextRequest, NextResponse } from 'next/server'
import { checkAdminPermission } from '@/lib/admin-permissions'
import { requireAdmin } from '@/lib/require-admin'
import { requireAdminMfa } from '@/lib/require-admin-mfa'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { recordAdminAudit } from '@/lib/admin-audit'
import { sanitizeBlogHtml } from '@/lib/blog/sanitize-html'

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function DELETE(
  request: NextRequest,
  { params }: RouteContext
) {
  const authorization = request.headers.get('authorization')

  const admin = await requireAdmin(authorization)

  if (!admin) {
    return NextResponse.json(
      { error: 'ADMIN_REQUIRED' },
      { status: 403, headers: { 'Cache-Control': 'no-store' } }
    )
  }

  const mfaVerified = await requireAdminMfa(authorization)

  if (!mfaVerified) {
    return NextResponse.json(
      { error: 'MFA_REQUIRED' },
      { status: 403, headers: { 'Cache-Control': 'no-store' } }
    )
  }

  const permissionDenied = await checkAdminPermission(admin.id, 'blog.delete')
  if (permissionDenied) return permissionDenied

  const { id } = await params

  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)
  ) {
    return NextResponse.json(
      { error: 'Invalid article ID.' },
      { status: 400 }
    )
  }

  const { data, error } = await supabaseAdmin
    .from('blogs')
    .delete()
    .eq('id', id)
    .select('id, title, slug, status')
    .maybeSingle()

  if (error) {
    console.error('Blog deletion failed:', error.message)

    return NextResponse.json(
      { error: 'Unable to delete article.' },
      { status: 500 }
    )
  }

  if (!data) {
    return NextResponse.json(
      { error: 'Article not found.' },
      { status: 404 }
    )
  }

  const auditRecorded = await recordAdminAudit({ actorId: admin.id, action: 'blog.deleted', resourceId: data.id, summary: data.title || 'Untitled draft', metadata: { slug: data.slug, previousStatus: data.status } })

  return NextResponse.json(
    { success: true, deletedId: data.id, auditRecorded },
    { headers: { 'Cache-Control': 'no-store' } }
  )
}


const blogResponseHeaders = {
    'Cache-Control': 'no-store',
  }
  
  const blogIdPattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  
  async function authorizeBlogRequest(request: NextRequest) {
    const authorization = request.headers.get('authorization')
  
    const admin = await requireAdmin(authorization)
  
    if (!admin) {
      return NextResponse.json(
        { error: 'ADMIN_REQUIRED' },
        { status: 403, headers: blogResponseHeaders }
      )
    }
  
    if (!(await requireAdminMfa(authorization))) {
      return NextResponse.json(
        { error: 'MFA_REQUIRED' },
        { status: 403, headers: blogResponseHeaders }
      )
    }
  
    return checkAdminPermission(admin.id, 'blog.read')
  }
  
  // GET /api/admin/blogs/[id]
  // Allows verified administrators to load drafts and published articles.
  export async function GET(
    request: NextRequest,
    { params }: RouteContext
  ) {
    const denied = await authorizeBlogRequest(request)
    if (denied) return denied
  
    const { id } = await params
  
    if (!blogIdPattern.test(id)) {
      return NextResponse.json(
        { error: 'Invalid article ID.' },
        { status: 400, headers: blogResponseHeaders }
      )
    }
  
    const { data, error } = await supabaseAdmin
      .from('blogs')
      .select(`
        id, title, slug, category, excerpt, content,
        author, status, created_at, updated_at, published_at,
        featured_image_url, featured_image_alt,
        meta_title, meta_description, focus_keyword
      `)
      .eq('id', id)
      .maybeSingle()
  
    if (error) {
      console.error('Admin blog GET failed:', error.message)
  
      return NextResponse.json(
        { error: 'Unable to load article.' },
        { status: 500, headers: blogResponseHeaders }
      )
    }
  
    if (!data) {
      return NextResponse.json(
        { error: 'Article not found.' },
        { status: 404, headers: blogResponseHeaders }
      )
    }
  
    return NextResponse.json(
      { blog: data },
      { headers: blogResponseHeaders }
    )
  }
  
  // PATCH /api/admin/blogs/[id]
  // Updates an article's content and publishing status.
  export async function PATCH(
    request: NextRequest,
    { params }: RouteContext
  ) {
    const authorization = request.headers.get('authorization')
    const admin = await requireAdmin(authorization)
    if (!admin) return NextResponse.json({ error: 'ADMIN_REQUIRED' }, { status: 403, headers: blogResponseHeaders })
    if (!(await requireAdminMfa(authorization))) return NextResponse.json({ error: 'MFA_REQUIRED' }, { status: 403, headers: blogResponseHeaders })
    const permissionDenied = await checkAdminPermission(admin.id, 'blog.update')
    if (permissionDenied) return permissionDenied
  
    const { id } = await params
  
    if (!blogIdPattern.test(id)) {
      return NextResponse.json(
        { error: 'Invalid article ID.' },
        { status: 400, headers: blogResponseHeaders }
      )
    }
  
    let input: Record<string, unknown>
  
    try {
      const body: unknown = await request.json()
  
      if (!body || typeof body !== 'object' || Array.isArray(body)) {
        throw new Error('Invalid body')
      }
  
      input = body as Record<string, unknown>
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON body.' },
        { status: 400, headers: blogResponseHeaders }
      )
    }
  
    const status = input.status
  
    if (status !== 'draft' && status !== 'published') {
      return NextResponse.json(
        { error: 'Invalid publishing status.' },
        { status: 400, headers: blogResponseHeaders }
      )
    }
  
    if (status === 'published') {
      const denied = await checkAdminPermission(admin.id, 'blog.publish')
      if (denied) return denied
    }

    const getText = (value: unknown) =>
      typeof value === 'string' ? value.trim() : ''
  
    const title = getText(input.title)
    const slug = getText(input.slug).toLowerCase()
    const category = getText(input.category)
    const excerpt = getText(input.excerpt)
    
const content =
typeof input.content === 'string' ? input.content : ''

const sanitizedContent = sanitizeBlogHtml(content)
const hasVisibleContent = sanitizedContent
  .replace(/<[^>]*>/g, '')
  .replace(/&nbsp;|&#160;/gi, ' ')
  .trim().length > 0
  
    if (
      title.length > 200 ||
      slug.length > 200 ||
      category.length > 100 ||
      excerpt.length > 1000 ||
      content.length > 200000
    ) {
      return NextResponse.json(
        { error: 'One or more fields exceed the allowed length.' },
        { status: 400, headers: blogResponseHeaders }
      )
    }
  
    if (slug && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      return NextResponse.json(
        { error: 'Invalid URL slug.' },
        { status: 400, headers: blogResponseHeaders }
      )
    }
  
    if (
      status === 'published' &&
      (!title || !slug || !category || !excerpt ||
        !hasVisibleContent)
    ) {
      return NextResponse.json(
        { error: 'Complete all required fields before publishing.' },
        { status: 400, headers: blogResponseHeaders }
      )
    }
  
    // Read the existing status and publication date first.
    const { data: existing, error: existingError } =
      await supabaseAdmin
        .from('blogs')
        .select('status, published_at')
        .eq('id', id)
        .maybeSingle()
  
    if (existingError) {
      return NextResponse.json(
        { error: 'Unable to check article.' },
        { status: 500, headers: blogResponseHeaders }
      )
    }
  
    if (!existing) {
      return NextResponse.json(
        { error: 'Article not found.' },
        { status: 404, headers: blogResponseHeaders }
      )
    }
  
    const now = new Date().toISOString()
  
    const { data, error } = await supabaseAdmin
      .from('blogs')
      
.update({
    title,
    slug: slug || `draft-${id}`,
    category: category || 'Uncategorized',
    excerpt,
    content: sanitizedContent,
    status,
    updated_at: now,  
        published_at:
          status === 'published'
            ? existing.published_at ?? now
            : null,
      })
      .eq('id', id)
      .select('id, slug, status, updated_at, published_at')
      .maybeSingle()
  
    if (error) {
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'This URL slug already exists.' },
          { status: 409, headers: blogResponseHeaders }
        )
      }
  
      console.error('Admin blog PATCH failed:', error.message)
  
      return NextResponse.json(
        { error: 'Unable to update article.' },
        { status: 500, headers: blogResponseHeaders }
      )
    }
  
    if (!data) {
      return NextResponse.json(
        { error: 'Article not found.' },
        { status: 404, headers: blogResponseHeaders }
      )
    }
  
    const auditRecorded = await recordAdminAudit({ actorId: admin.id, action: 'blog.updated', resourceId: data.id, summary: title || 'Untitled draft', metadata: { previousStatus: existing.status, status: data.status, slug: data.slug } })

    return NextResponse.json(
      { success: true, blog: data, auditRecorded },
      { headers: blogResponseHeaders }
    )
  }
  
