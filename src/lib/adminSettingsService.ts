import { verifyAdminServerSide } from './adminAuthService.js';
import { getSupabaseServerClient } from './supabaseServer.js';
import { AdminSettings } from '../types/index.js';

export interface AdminSettingsResult {
  success: boolean;
  settings?: AdminSettings;
  error?: string;
  message?: string;
}

/**
 * Fetch settings for admin with server-side admin verification.
 */
export async function getAdminSettingsServerSide(authHeader?: string): Promise<AdminSettingsResult> {
  const authCheck = await verifyAdminServerSide(authHeader);
  if (!authCheck.success || !authCheck.isAdmin) {
    return {
      success: false,
      error: authCheck.error || 'Unauthorized access: Admin authorization required.',
    };
  }

  const supabase = getSupabaseServerClient();

  try {
    const { data, error } = await supabase
      .from('admin_settings')
      .select('*')
      .eq('id', 1)
      .single();

    if (error || !data) {
      return { success: false, error: `Failed to fetch admin settings: ${error?.message || 'Row not found'}` };
    }

    const deliveryFee = Number(data.delivery_fee);

    const settings: AdminSettings = {
      id: 1,
      easypaisa_number: data.easypaisa_number || '03402694079',
      easypaisa_account_title: data.easypaisa_account_title || 'KASHMENA',
      whatsapp_number: data.whatsapp_number || '923000000000',
      delivery_fee: isNaN(deliveryFee) ? 100 : deliveryFee,
      stall_location: data.stall_location || 'Karachi, Pakistan',
      opening_hours: data.opening_hours || '4:00 PM - 12:00 AM',
      is_taking_orders: Boolean(data.is_taking_orders),
      updated_at: data.updated_at,
    };

    return { success: true, settings };
  } catch (err: any) {
    console.error('getAdminSettingsServerSide exception:', err);
    return { success: false, error: err.message || 'Server error fetching admin settings.' };
  }
}

/**
 * Update admin settings with server-side validation & authorization.
 */
export async function updateAdminSettingsServerSide(
  authHeader?: string,
  payload?: {
    delivery_fee?: number;
    easypaisa_number?: string;
    easypaisa_account_title?: string;
    whatsapp_number?: string;
    is_taking_orders?: boolean;
    stall_location?: string;
    opening_hours?: string;
  }
): Promise<AdminSettingsResult> {
  const authCheck = await verifyAdminServerSide(authHeader);
  if (!authCheck.success || !authCheck.isAdmin) {
    return {
      success: false,
      error: authCheck.error || 'Unauthorized access: Admin authorization required.',
    };
  }

  if (!payload) {
    return { success: false, error: 'No update fields provided.' };
  }

  const updateFields: Record<string, any> = {
    updated_at: new Date().toISOString(),
  };

  // 1. Validate Delivery Fee
  if (payload.delivery_fee !== undefined) {
    const fee = Number(payload.delivery_fee);
    if (isNaN(fee) || fee < 0) {
      return { success: false, error: 'Delivery fee must be a non-negative number.' };
    }
    updateFields.delivery_fee = fee;
  }

  // 2. Validate EasyPaisa Number
  if (payload.easypaisa_number !== undefined) {
    const epNum = payload.easypaisa_number.trim();
    if (!epNum || epNum.length < 8) {
      return { success: false, error: 'Please enter a valid EasyPaisa account number.' };
    }
    updateFields.easypaisa_number = epNum;
  }

  // 3. Validate EasyPaisa Title
  if (payload.easypaisa_account_title !== undefined) {
    const epTitle = payload.easypaisa_account_title.trim();
    if (!epTitle) {
      return { success: false, error: 'EasyPaisa account title cannot be empty.' };
    }
    updateFields.easypaisa_account_title = epTitle;
  }

  // 4. Validate WhatsApp Number
  if (payload.whatsapp_number !== undefined) {
    const waNum = payload.whatsapp_number.trim().replace(/\D/g, '');
    if (!waNum || waNum.length < 10) {
      return { success: false, error: 'Please enter a valid WhatsApp Business number (minimum 10 digits).' };
    }
    updateFields.whatsapp_number = waNum;
  }

  // 5. Shop Status
  if (payload.is_taking_orders !== undefined) {
    updateFields.is_taking_orders = Boolean(payload.is_taking_orders);
  }

  // 6. Optional stall location & opening hours
  if (payload.stall_location !== undefined) {
    updateFields.stall_location = payload.stall_location.trim() || 'Karachi, Pakistan';
  }

  if (payload.opening_hours !== undefined) {
    updateFields.opening_hours = payload.opening_hours.trim() || '4:00 PM - 12:00 AM';
  }

  const supabase = getSupabaseServerClient();

  try {
    const { data, error } = await supabase
      .from('admin_settings')
      .update(updateFields)
      .eq('id', 1)
      .select()
      .single();

    if (error || !data) {
      return { success: false, error: `Failed to update admin settings: ${error?.message || 'Row not updated'}` };
    }

    const deliveryFee = Number(data.delivery_fee);

    const updatedSettings: AdminSettings = {
      id: 1,
      easypaisa_number: data.easypaisa_number,
      easypaisa_account_title: data.easypaisa_account_title,
      whatsapp_number: data.whatsapp_number,
      delivery_fee: isNaN(deliveryFee) ? 100 : deliveryFee,
      stall_location: data.stall_location,
      opening_hours: data.opening_hours,
      is_taking_orders: Boolean(data.is_taking_orders),
      updated_at: data.updated_at,
    };

    return {
      success: true,
      settings: updatedSettings,
      message: 'Business settings updated successfully.',
    };
  } catch (err: any) {
    console.error('updateAdminSettingsServerSide exception:', err);
    return { success: false, error: err.message || 'Server error updating admin settings.' };
  }
}
