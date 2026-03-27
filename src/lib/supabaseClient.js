import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://kmdkiyrjmvxnmfdvsofq.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImttZGtpeXJqbXZ4bm1mZHZzb2ZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyOTIzMDgsImV4cCI6MjA4NTg2ODMwOH0.ZyAqRv0wnKNADhEWxGIZo1QNTwPWB0OxdbbhY-KyEqY';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storageKey: 'pti_inspect_session',
    detectSessionInUrl: false,
  },
});
