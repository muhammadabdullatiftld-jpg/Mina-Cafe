import { createClient } from '@supabase/supabase-js';

// Retrieve environment variables safely
const getEnvVar = (key: string): string => {
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return process.env[key] || '';
  }
  return '';
};

const DEFAULT_URL = 'https://tnsikkgnxlqiodvcalvi.supabase.co';
const DEFAULT_ANON_KEY = 'sb_publishable_IWXFWLkJs3BxUPILJ0T8RA_0tdIodNS';

const rawUrl = getEnvVar('VITE_SUPABASE_URL') || getEnvVar('SUPABASE_URL') || DEFAULT_URL;
export const SUPABASE_URL = rawUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '');
export const SUPABASE_ANON_KEY = getEnvVar('VITE_SUPABASE_ANON_KEY') || getEnvVar('SUPABASE_ANON_KEY') || DEFAULT_ANON_KEY;

export const isSupabaseConfigured = (): boolean => {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY && SUPABASE_URL.startsWith('http'));
};

// Create Supabase client
export const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);
