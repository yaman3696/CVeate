import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { adminUsersHeaders as headers, checkAdminUsersAccess } from '@/lib/admin-users-access'

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const denied = await checkAdminUsersAccess(request)
    if (denied) return denied
    const { id } = await context.params
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return NextResponse.json({ error: 'Invalid user ID.' }, { status: 400, headers })
    const { data: profile, error } = await supabaseAdmin.from('profiles').select('id, full_name, role, career_credits, created_at, contact_number').eq('id', id).maybeSingle()
    if (error) throw error
    if (!profile) return NextResponse.json({ error: 'User not found.' }, { status: 404, headers })
    const [auth, purchases] = await Promise.all([
      supabaseAdmin.auth.admin.getUserById(id),
      supabaseAdmin.from('cveate_credit_purchases').select('id, package_name, amount_paise, currency, credits, status, created_at').eq('user_id', id).order('created_at', { ascending: false }).limit(10),
    ])
    const rawPhone: unknown = profile.contact_number || auth.data.user?.phone || auth.data.user?.user_metadata?.contact_number
    const phone = typeof rawPhone === 'string' ? rawPhone : null
    // Return only necessary contact information, never the full Auth record.
    return NextResponse.json({
      user: { id: profile.id, full_name: profile.full_name, role: profile.role, career_credits: profile.career_credits, created_at: profile.created_at, email: auth.data.user?.email ?? null, phone, lastSignInAt: auth.data.user?.last_sign_in_at ?? null },
      contactUnavailable: Boolean(auth.error),
      purchases: purchases.error ? [] : purchases.data ?? [],
      purchasesUnavailable: Boolean(purchases.error),
    }, { headers })
  } catch (error) {
    // Let Next.js defer request-specific work to runtime during prerendering.
    if (error instanceof Error && 'digest' in error && error.digest === 'NEXT_PRERENDER_INTERRUPTED') throw error
    console.error('Admin user details failed:', error)
    return NextResponse.json({ error: 'Unable to load user details.' }, { status: 500, headers })
  }
}
