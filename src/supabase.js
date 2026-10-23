import { createClient } from '@supabase/supabase-js';

import {recordDiagnostic,clearDiagnostics} from './lib/availability.mjs';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(url && key && !url.includes('your-project-id'));
export const supabase = isSupabaseConfigured ? createClient(url, key) : null;

export async function isCurrentUserAdmin(userId) {
  if (!supabase || !userId) return false;
  const { data, error } = await supabase.from('admin_users').select('user_id').eq('user_id', userId).maybeSingle();
  if(error){recordDiagnostic('Admin access',error);throw error;}
  clearDiagnostics('Admin access');return Boolean(data);
}
