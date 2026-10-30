import { supabase } from '@/lib/supabase'
export const HISTORY_LIMIT = 10
export type HistoryKind = 'cv' | 'interview'
type SaveResult = { saved: boolean; count: number; removed: number }
type Capacity = { requires_confirmation: true; count: number; remove_count: number; oldest: { id: string; title: string; created_at: string; is_primary?: boolean } }
/** All insertion/eviction happens atomically in PostgreSQL; cancellation never deletes. */
export async function saveToHistory(kind: HistoryKind, payload: Record<string, unknown>, ui = { confirm: (text: string) => window.confirm(text), notify: (text: string) => window.alert(text) }): Promise<SaveResult> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Please sign in to save to history. Your current draft is unchanged.')
  let replacement: string | null = null, expectedCount: number | null = null
  for (let attempt = 0; attempt < 4; attempt++) {
    const { data, error } = await supabase.rpc('save_personal_history', { p_kind: kind, p_payload: payload, p_replace_oldest_id: replacement, p_expected_count: expectedCount })
    if (error) {
      if (error.code === 'PGRST202' || error.code === '42883') throw new Error('History saving needs the latest database update. Your draft and existing saves are unchanged.')
      throw new Error(error.message || 'History could not be saved. Please try again.')
    }
    if (data?.requires_confirmation) {
      const capacity = data as Capacity
      if (!capacity.oldest?.id || !Number.isInteger(capacity.count) || !Number.isInteger(capacity.remove_count) || capacity.remove_count < 1) throw new Error('Unable to verify history capacity. Nothing was replaced.')
      const label = kind === 'cv' ? 'CV' : 'interview', plural = kind === 'cv' ? 'CVs' : 'interviews'
      const date = new Date(capacity.oldest.created_at).toLocaleString()
      const removal = capacity.remove_count === 1 ? `your oldest saved ${label}: “${capacity.oldest.title}” (${date})` : `your ${capacity.remove_count} oldest saved ${plural}, starting with “${capacity.oldest.title}” (${date}), to keep the limit at 10`
      const primary = kind === 'cv' && capacity.oldest.is_primary ? '\nThe oldest CV is your primary CV. If no other primary remains, the new CV becomes primary.' : ''
      if (!ui.confirm(`You have ${capacity.count} saved ${plural}. The limit is 10.\n\nSaving this ${label} will permanently delete ${removal}.${primary}\n\nSave and replace?`)) return { saved: false, count: capacity.count, removed: 0 }
      replacement = capacity.oldest.id; expectedCount = capacity.count
      continue
    }
    if (!data?.saved || !Number.isInteger(data.count) || data.count > HISTORY_LIMIT) throw new Error('The save could not be confirmed. Please check My History before retrying.')
    if (data.count === HISTORY_LIMIT && !data.removed) ui.notify(`You now have 10 saved ${kind === 'cv' ? 'CVs' : 'interviews'}. Your next save will ask for permission to permanently replace your oldest saved ${kind === 'cv' ? 'CV' : 'interview'}. The other history category has its own separate limit of 10.`)
    return { saved: true, count: data.count, removed: data.removed || 0 }
  }
  throw new Error('Your history changed in another tab. Nothing was replaced by this attempt; please try saving again.')
}
