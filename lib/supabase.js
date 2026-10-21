
import { createClient } from '@supabase/supabase-js'

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  'https://placeholder.supabase.co'

const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'placeholder-key'

/** @type {typeof globalThis & { __cveateSupabaseClient?: import('@supabase/supabase-js').SupabaseClient }} */
const globalForSupabase = globalThis

export const supabase =
  globalForSupabase.__cveateSupabaseClient ||
  createClient(supabaseUrl, supabaseAnonKey)

if (process.env.NODE_ENV !== 'production') {
  globalForSupabase.__cveateSupabaseClient = supabase
}
