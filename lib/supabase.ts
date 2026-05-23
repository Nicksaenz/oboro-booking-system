import { createClient } from '@supabase/supabase-js'

export const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ??
  'https://ybtkzbiotcxcajdfelno.supabase.co'

export const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  'sb_publishable_UsWkGckcqZ3uIBM27GTaNQ_jInNN7y0'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export function getSupabaseAdmin() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!serviceRoleKey) {
    throw new Error('Falta configurar SUPABASE_SERVICE_ROLE_KEY')
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
