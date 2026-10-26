
import 'server-only'
import { employeeEmail } from '@/lib/employee-domain'
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

  // Only the designated owner has a personal-email exception.
  const owner = await supabaseAdmin.from('admin_permission_owners').select('user_id').eq('user_id', user.id).maybeSingle()
  if (owner.error) return null
  if (owner.data) return user
  const email = employeeEmail(user.email)
  if (!email || !user.email_confirmed_at) return null
  const employee = await supabaseAdmin.from('admin_employees').select('status, email').eq('user_id', user.id).maybeSingle()
  if (employee.error || employee.data?.status !== 'active' || employee.data.email !== email) return null
  return user
}
