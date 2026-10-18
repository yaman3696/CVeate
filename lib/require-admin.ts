
import 'server-only'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function requireAdmin(
  authorizationHeader: string | null
) {
  if (!authorizationHeader?.startsWith('Bearer ')) {
    return null
  }

  const token = authorizationHeader.slice(7).trim()

  if (!token) {
    return null
  }

  // Validate the token with Supabase Auth.
  const {
    data: { user },
    error: authError,
  } = await supabaseAdmin.auth.getUser(token)

  if (authError || !user) {
    return null
  }

  // Check the admin role in the database.
  const { data: profile, error: profileError } =
    await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

  if (profileError || profile?.role !== 'admin') {
    return null
  }

  return user
}
