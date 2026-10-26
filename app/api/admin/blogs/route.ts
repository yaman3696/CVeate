
import { NextRequest, NextResponse } from 'next/server'
import { checkAdminPermission } from '@/lib/admin-permissions'
import { requireAdmin } from '@/lib/require-admin'
import { requireAdminMfa } from '@/lib/require-admin-mfa'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { recordAdminAudit } from '@/lib/admin-audit'
import { sanitizeBlogHtml } from '@/lib/blog/sanitize-html'

const noStore = {
  'Cache-Control': 'no-store',
}

async function checkAccess(request: NextRequest) {
  const authorization = request.headers.get('authorization')

  const admin = await requireAdmin(authorization)

  if (!admin) {
    return {
      error: NextResponse.json(
        { error: 'ADMIN_REQUIRED' },
        { status: 403, headers: noStore }
      ),
    }
  }

  const mfaVerified = await requireAdminMfa(authorization)

  if (!mfaVerified) {
    return {
      error: NextResponse.json(
        { error: 'MFA_REQUIRED' },
        { status: 403, headers: noStore }
      ),
    }
  }

  const permissionDenied = await checkAdminPermission(admin.id, request.method === 'POST' ? 'blog.create' : 'blog.read')
  if (permissionDenied) return { error: permissionDenied }
  return { admin }
}

// GET /api/admin/blogs
// Returns blog metadata to verified administrators.
export async function GET(request: NextRequest) {
  const access = await checkAccess(request)

  if (access.error) return access.error

  const { data, error } = await supabaseAdmin
    .from('blogs')
    .select(`
      id,
      title,
      slug,
      category,
      excerpt,
      author,
      status,
      created_at,
      updated_at,
      published_at,
      meta_title,
      meta_description,
      focus_keyword
    `)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Admin blogs GET failed:', error.message)

    return NextResponse.json(
      { error: 'Unable to load articles.' },
      { status: 500, headers: noStore }
    )
  }

  return NextResponse.json(
    { blogs: data ?? [] },
    { headers: noStore }
  )
}

// POST /api/admin/blogs
// Creates a draft or publishes a new article.
export async function POST(request: NextRequest) {
  const access = await checkAccess(request)

  if (access.error) return access.error

  let body: unknown

  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body.' },
      { status: 400, headers: noStore }
    )
  }

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json(
      { error: 'Invalid article data.' },
      { status: 400, headers: noStore }
    )
  }

  const input = body as Record<string, unknown>

  const status = input.status

  if (status !== 'draft' && status !== 'published') {
    return NextResponse.json(
      { error: 'Invalid publishing status.' },
      { status: 400, headers: noStore }
    )
  }

  if (status === 'published') {
    const denied = await checkAdminPermission(access.admin!.id, 'blog.publish')
    if (denied) return denied
  }

  const getText = (value: unknown) =>
    typeof value === 'string' ? value.trim() : ''

  const title = getText(input.title)
  const category = getText(input.category)
  const excerpt = getText(input.excerpt)

  // Preserve editor HTML without trimming away formatting.
  
  // Preserve editor HTML and remove unsafe markup.
  const content =
    typeof input.content === 'string' ? input.content : ''

  const sanitizedContent = sanitizeBlogHtml(content)
  const hasVisibleContent = sanitizedContent
  .replace(/<[^>]*>/g, '')
  .replace(/&nbsp;|&#160;/gi, ' ')
  .trim().length > 0


  const requestedSlug = getText(input.slug)
    .toLowerCase()

  const isValidSlug = (value: string) =>
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)

  if (
    title.length > 200 ||
    category.length > 100 ||
    excerpt.length > 1000 ||
    content.length > 200000
  ) {
    return NextResponse.json(
      { error: 'One or more fields exceed the allowed length.' },
      { status: 400, headers: noStore }
    )
  }

  if (status === 'published') {
    if (
      !title ||
      !requestedSlug ||
      !category ||
      !excerpt ||
      !hasVisibleContent
    ) {
      return NextResponse.json(
        { error: 'Complete all required fields before publishing.' },
        { status: 400, headers: noStore }
      )
    }

    if (!isValidSlug(requestedSlug)) {
      return NextResponse.json(
        { error: 'Use lowercase letters, numbers and hyphens in the slug.' },
        { status: 400, headers: noStore }
      )
    }
  }

  if (requestedSlug && !isValidSlug(requestedSlug)) {
    return NextResponse.json(
      { error: 'Invalid URL slug.' },
      { status: 400, headers: noStore }
    )
  }

  // A unique temporary slug allows incomplete drafts.
  const slug = requestedSlug || `draft-${crypto.randomUUID()}`

  const now = new Date().toISOString()

  const { data, error } = await supabaseAdmin
    .from('blogs')
    .insert({
      title,
      slug,
      category: category || 'Uncategorized',
      excerpt,
      content: sanitizedContent,
      author: 'Yaman',
      status,
      updated_at: now,
      published_at: status === 'published' ? now : null,
    })
    .select('id, slug, status')
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json(
        { error: 'This URL slug already exists.' },
        { status: 409, headers: noStore }
      )
    }

    console.error('Admin blogs POST failed:', error.message)

    return NextResponse.json(
      { error: 'Unable to save article.' },
      { status: 500, headers: noStore }
    )
  }

  const auditRecorded = await recordAdminAudit({ actorId: access.admin!.id, action: 'blog.created', resourceId: data.id, summary: title || 'Untitled draft', metadata: { status, slug: data.slug } })

  return NextResponse.json(
    { success: true, blog: data, auditRecorded },
    { status: 201, headers: noStore }
  )
}
