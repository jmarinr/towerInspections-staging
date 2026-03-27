import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://bixqkzruwyxutizxunyv.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJpeHFrenJ1d3l4dXRpenh1bnl2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1NzE3MDUsImV4cCI6MjA5MDE0NzcwNX0.SwJgKQhPrazWKyxcdO25AbvTijC8uDq8P-bo2s2UYOM';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storageKey: 'pti_inspect_session',
    detectSessionInUrl: false,
  },
});
