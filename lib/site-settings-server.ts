import 'server-only'
import { cacheLife, cacheTag } from 'next/cache'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { DEFAULT_SITE_SETTINGS, validateSiteSettings } from '@/lib/site-settings'
export async function getPublishedSiteSettings() {
  'use cache'
  cacheLife({ stale: 300, revalidate: 60, expire: 3600 })
  cacheTag('site-settings')
  try {
    const {data,error}=await supabaseAdmin.from('site_settings').select('data').eq('id',1).maybeSingle()
    if(error || !data) return DEFAULT_SITE_SETTINGS
    return validateSiteSettings(data.data)
  } catch { return DEFAULT_SITE_SETTINGS }
}
