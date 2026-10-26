import 'server-only'
import { supabaseAdmin } from '@/lib/supabase-admin'

type AuditEvent = {
  actorId: string
  action: 'blog.created' | 'blog.updated' | 'blog.deleted'
  resourceId: string
  summary: string
  metadata?: Record<string, string | null>
}
/** Best-effort application audit: callers must surface false after a successful mutation.
 * This records future API actions only, not direct database edits or historical changes.
 * The mutation and audit insert are separate transactions; this is not an atomic ledger.
 */
export async function recordAdminAudit(event: AuditEvent): Promise<boolean> {
  try {
    const { error } = await supabaseAdmin.from('admin_audit_logs').insert({
      actor_id: event.actorId, action: event.action, resource_type: 'blog',
      resource_id: event.resourceId, summary: event.summary, metadata: event.metadata ?? {},
    })
    if (error) { console.error('Admin audit insert failed:', error.code); return false }
    return true
  } catch { console.error('Admin audit insert unavailable'); return false }
}
