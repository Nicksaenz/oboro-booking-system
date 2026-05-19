import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ybtkzbiotcxcajdfelno.supabase.co'
const supabaseKey = 'sb_publishable_UsWkGckcqZ3uIBM27GTaNQ_jInNN7y0'

export const supabase = createClient(supabaseUrl, supabaseKey)
