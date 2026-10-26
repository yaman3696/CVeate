import 'server-only'
import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/require-admin'
import { requireAdminMfa } from '@/lib/require-admin-mfa'
import { checkAdminPermission } from '@/lib/admin-permissions'
import { ADMIN_PERMISSIONS } from '@/lib/admin-permission-catalog'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { sendEmail } from '@/lib/email'
import { employeeEmail } from '@/lib/employee-domain'
export const employeeHeaders = { 'Cache-Control': 'private, no-store' }
export type Employee = { id: string; user_id: string; full_name: string; email: string; job_title: string; status: string; accepted_at: string | null; last_email_sent_at: string | null; version: number; created_at: string }
export async function employeeOwner(token: string | null) {
  const admin = await requireAdmin(token)
  if (!admin) return { error: NextResponse.json({ error: 'ADMIN_REQUIRED' }, { status: 403, headers: employeeHeaders }) }
  if (!(await requireAdminMfa(token))) return { error: NextResponse.json({ error: 'MFA_REQUIRED' }, { status: 403, headers: employeeHeaders }) }
  const denied = await checkAdminPermission(admin.id, 'permissions.manage')
  return denied ? { error: denied } : { admin }
}
export function validEmployeePermissions(value: unknown): value is string[] {
  return Array.isArray(value) && value.length <= 10 && value.every(key => typeof key === 'string' && (ADMIN_PERMISSIONS as string[]).includes(key)) && (!value.some(key => ['blog.create','blog.update','blog.delete','blog.publish'].includes(key)) || value.includes('blog.read'))
}
export async function employeeControl(actor: string, action: string, employee: Employee, permissions?: string[]) {
  const { data, error } = await supabaseAdmin.rpc('admin_employee_control', { p_actor: actor, p_action: action, p_employee: employee.id, p_version: employee.version, ...(permissions ? { p_permissions: permissions } : {}) })
  if (error) throw error
  return data as Employee
}
export async function sendEmployeeInvitation(actor: string, employee: Employee, initialToken?: string) {
  // Database claim throttles resends and prevents suspended/revoked employees receiving new links.
  const claimed = await employeeControl(actor, 'email', employee)
  try {
    let token = initialToken, type = 'invite'
    if (!token) {
      const identity = await supabaseAdmin.auth.admin.getUserById(claimed.user_id)
      if (identity.error || identity.data.user?.id !== claimed.user_id || employeeEmail(identity.data.user.email) !== claimed.email) throw new Error('Employee identity could not be verified.')
      const generated = await supabaseAdmin.auth.admin.generateLink({ type: 'magiclink', email: claimed.email })
      if (generated.error || generated.data.user?.id !== claimed.user_id) throw new Error('Unable to prepare invitation.')
      token = generated.data.properties.hashed_token
      type = 'magiclink'
    }
    const origin = new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://cveat.in')
    if (origin.protocol !== 'https:' || !['cveat.in','www.cveat.in'].includes(origin.hostname) || origin.port || origin.username || origin.password) throw new Error('NEXT_PUBLIC_SITE_URL must be the HTTPS CVeat website URL.')
    const link = new URL('/employee-invite', origin)
    link.searchParams.set('token_hash', token!)
    link.searchParams.set('type', type)
    const result = await sendEmail({ to: claimed.email, subject: 'Your CVeat employee dashboard invitation', text: `Hello ${claimed.full_name},\n\nYou have been invited to the CVeat administration team. Use this one-time link to choose your password, then verify MFA:\n\n${link.toString()}\n\nYour dashboard access is limited to the permissions assigned by the owner. This invitation does not create an email mailbox. If the link expires, ask the owner to resend it.\n\nFor future sign-ins: https://cveat.in/employee-login\n\nCVeat` })
    if (!result.accepted?.some(value => typeof value === 'string' && value.toLowerCase() === claimed.email)) throw new Error('The mail server did not accept the invitation.')
    try { return { employee: await employeeControl(actor, 'email_sent', claimed), sent: true } }
    catch { return { employee: claimed, sent: true, warning: 'Email was accepted by the mail server; refresh to check the employee record.' } }
  } catch {
    let current = claimed
    try { current = await employeeControl(actor, 'email_failed', claimed) } catch { /* The attempt is already audited; never overwrite a newer state. */ }
    return { employee: current, sent: false, warning: 'The employee record is saved, but the invitation could not be delivered. Check SMTP settings and resend after one minute.' }
  }
}
export function employeeFailure(error: unknown) {
  if (error instanceof Error && 'digest' in error && error.digest === 'NEXT_PRERENDER_INTERRUPTED') throw error
  const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : ''
  const status = code === '40001' || code === '23505' ? 409 : code === '42501' ? 403 : code === '22023' ? 400 : ['42P01','PGRST205','PGRST202'].includes(code) ? 503 : 500
  const message = status === 409 ? 'Employee already exists or changed in another session. Refresh before retrying.' : status === 403 ? 'Owner access is required and owner accounts are protected.' : status === 400 ? 'This action is not valid for the employee’s current state. Purchase history may prevent permanent deletion.' : status === 503 ? 'Employee database setup is required.' : 'Unable to complete the employee request. Refresh to check its current status.'
  return NextResponse.json({ error: message }, { status, headers: employeeHeaders })
}
