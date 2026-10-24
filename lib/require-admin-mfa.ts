import 'server-only'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function requireAdminMfa(
  authorizationHeader: string | null
): Promise<boolean> {
  if (!authorizationHeader?.startsWith('Bearer ')) {
    return false
  }

  const token = authorizationHeader.slice(7).trim()

  if (!token) {
    return false
  }

  const { data, error } =
    await supabaseAdmin.auth.getClaims(token)

  if (error || !data?.claims) {
    return false
  }

  return data.claims.aal === 'aal2'
}