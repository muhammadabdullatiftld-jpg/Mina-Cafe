import { createClient, SupabaseClient } from '@supabase/supabase-js';

const getEnvVar = (key: string): string => {
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return process.env[key] || '';
  }
  return '';
};

const DEFAULT_URL = 'https://tnsikkgnxlqiodvcalvi.supabase.co';
const DEFAULT_ANON_KEY = 'sb_publishable_IWXFWLkJs3BxUPILJ0T8RA_0tdIodNS';

const rawUrl = getEnvVar('SUPABASE_URL') || getEnvVar('VITE_SUPABASE_URL') || DEFAULT_URL;
export const SUPABASE_URL = rawUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '');

export const SUPABASE_ANON_KEY = getEnvVar('VITE_SUPABASE_ANON_KEY') || getEnvVar('SUPABASE_ANON_KEY') || DEFAULT_ANON_KEY;

// Privileged server-only key (SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SECRET_KEY).
// Must NEVER be prefixed with VITE_ or imported by client-side code.
export const SUPABASE_SERVICE_ROLE_KEY =
  getEnvVar('SUPABASE_SERVICE_ROLE_KEY') ||
  getEnvVar('SUPABASE_SECRET_KEY') ||
  getEnvVar('SUPABASE_SERVICE_KEY') ||
  SUPABASE_ANON_KEY;

let supabaseServerInstance: SupabaseClient | null = null;

export function getSupabaseServerClient(): SupabaseClient {
  if (!supabaseServerInstance) {
    supabaseServerInstance = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }
  return supabaseServerInstance;
}

export function isServerKeyConfigured(): boolean {
  return Boolean(
    getEnvVar('SUPABASE_SERVICE_ROLE_KEY') ||
    getEnvVar('SUPABASE_SECRET_KEY') ||
    getEnvVar('SUPABASE_SERVICE_KEY')
  );
}
