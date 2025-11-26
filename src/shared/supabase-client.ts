import { createClient, SupabaseClient } from '@supabase/supabase-js'

let supabase: SupabaseClient

// Global variable to store Supabase client in development
declare global {
  var __supabase: SupabaseClient | undefined
}

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY!

// Singleton pattern for Supabase client to avoid connection issues in Lambda
if (process.env.NODE_ENV === 'production') {
  supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
} else {
  if (!global.__supabase) {
    global.__supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })
  }
  supabase = global.__supabase
}

export { supabase }
