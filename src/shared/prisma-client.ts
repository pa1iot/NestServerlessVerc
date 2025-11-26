// Re-export Supabase client for database operations
// All database operations should use the Supabase client
export { supabase } from './supabase-client'

// Note: Prisma has been replaced with Supabase client
// Use supabase.from('TableName').select/insert/update/delete() for database operations