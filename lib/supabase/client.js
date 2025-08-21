import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Please check your .env.local file and ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set.'
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false
  }
})

console.log('[SUPABASE_CLIENT_INIT] Supabase URL:', supabaseUrl ? 'Set' : 'Not Set');
console.log('[SUPABASE_CLIENT_INIT] Supabase Anon Key:', supabaseAnonKey ? 'Set' : 'Not Set');
console.log('[SUPABASE_CLIENT_INIT] Supabase Anon Key (first 5 chars):', supabaseAnonKey ? supabaseAnonKey.substring(0, 5) : 'Not Set');

// Service role client for admin operations (bypasses RLS)
export const supabaseAdmin = supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : null
