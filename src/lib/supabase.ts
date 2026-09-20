import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.SUPABASE_URL as string | undefined
const key = import.meta.env.SUPABASE_ANON_KEY as string | undefined

export const isSupabaseConfigured = Boolean(url && key)

export const supabase = isSupabaseConfigured
  ? createClient(url!, key!, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } })
  : null
