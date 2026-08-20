import { supabase, isSupabaseConfigured } from './supabase';
import { AdminSettings } from '../types';

export interface SettingsFetchResult {
  settings: AdminSettings | null;
  deliveryFee: number | null;
  error: string | null;
}

/**
 * Fetch admin settings (delivery_fee, is_taking_orders, etc.) directly from Supabase
 */
export async function fetchAdminSettings(): Promise<SettingsFetchResult> {
  if (!isSupabaseConfigured()) {
    return {
      settings: null,
      deliveryFee: 100, // Safe default if Supabase env var not set yet
      error: 'Supabase credentials not configured',
    };
  }

  try {
    const { data, error } = await supabase
      .from('admin_settings')
      .select('*')
      .eq('id', 1)
      .single();

    if (error || !data) {
      console.warn('Could not fetch admin_settings from Supabase:', error);
      // Fallback default delivery fee if table row is empty or not yet seeded
      return {
        settings: null,
        deliveryFee: 100,
        error: error ? error.message : 'Settings row not found',
      };
    }

    const deliveryFee = Number(data.delivery_fee);

    const formattedSettings: AdminSettings = {
      id: 1,
      easypaisa_number: data.easypaisa_number || '03402694079',
      easypaisa_account_title: data.easypaisa_account_title || 'KASHMENA',
      whatsapp_number: data.whatsapp_number || '923000000000',
      delivery_fee: isNaN(deliveryFee) ? 100 : deliveryFee,
      stall_location: data.stall_location || 'Karachi, Pakistan',
      opening_hours: data.opening_hours || '4:00 PM - 12:00 AM',
      is_taking_orders: data.is_taking_orders ?? true,
      updated_at: data.updated_at,
    };

    return {
      settings: formattedSettings,
      deliveryFee: isNaN(deliveryFee) ? 100 : deliveryFee,
      error: null,
    };
  } catch (err: any) {
    return {
      settings: null,
      deliveryFee: 100,
      error: err.message || 'Error fetching admin settings',
    };
  }
}
