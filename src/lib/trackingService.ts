import { getSupabaseServerClient } from './supabaseServer.js';
import { fetchAdminSettings } from './settingsService.js';

export interface TrackingOrderResult {
  success: boolean;
  order?: {
    id: string;
    orderRef: string;
    trackingToken: string;
    customerName: string;
    phone: string;
    address: string;
    city: string;
    subtotal: number;
    deliveryFee: number;
    totalAmount: number;
    status: string;
    notes?: string;
    createdAt: string;
    updatedAt: string;
  };
  items?: Array<{
    id: string;
    productName: string;
    unitPrice: number;
    quantity: number;
    selectedToppings: string[];
    toppingsExtraPrice: number;
    itemTotal: number;
  }>;
  payment?: {
    id: string;
    transactionId: string;
    paymentProofUrl: string | null;
    paymentStatus: string;
    rejectionReason: string | null;
    verifiedAt: string | null;
  } | null;
  settings?: {
    easypaisaNumber: string;
    easypaisaAccountTitle: string;
    whatsappNumber: string;
  };
  error?: string;
}

/**
 * Fetch order details by secure tracking_token only.
 * Searching by name, phone, or order_ref alone is strictly prevented.
 */
export async function getTrackingOrderServerSide(
  trackingToken: string
): Promise<TrackingOrderResult> {
  if (!trackingToken || typeof trackingToken !== 'string' || trackingToken.trim().length < 8) {
    return {
      success: false,
      error: 'Invalid or missing tracking token.',
    };
  }

  const supabase = getSupabaseServerClient();

  try {
    // 1. Query order strictly by tracking_token
    const { data: orderRow, error: orderErr } = await supabase
      .from('orders')
      .select('*')
      .eq('tracking_token', trackingToken.trim())
      .maybeSingle();

    if (orderErr || !orderRow) {
      return {
        success: false,
        error: 'No order found matching the provided tracking token.',
      };
    }

    // 2. Query order items
    const { data: itemsRows } = await supabase
      .from('order_items')
      .select('*')
      .eq('order_id', orderRow.id);

    // 3. Query payment details
    const { data: payRow } = await supabase
      .from('payments')
      .select('*')
      .eq('order_id', orderRow.id)
      .maybeSingle();

    // 4. Fetch admin settings for WhatsApp number and EasyPaisa account details
    const settingsRes = await fetchAdminSettings();
    const settings = {
      easypaisaNumber: settingsRes.settings?.easypaisa_number || '03402694079',
      easypaisaAccountTitle: settingsRes.settings?.easypaisa_account_title || 'KASHMENA',
      whatsappNumber: settingsRes.settings?.whatsapp_number || '923000000000',
    };

    const formattedItems = (itemsRows || []).map((i: any) => ({
      id: i.id,
      productName: i.product_name,
      unitPrice: Number(i.unit_price),
      quantity: Number(i.quantity),
      selectedToppings: Array.isArray(i.selected_toppings)
        ? i.selected_toppings
        : typeof i.selected_toppings === 'string'
        ? JSON.parse(i.selected_toppings)
        : [],
      toppingsExtraPrice: Number(i.toppings_extra_price || 0),
      itemTotal: Number(i.item_total),
    }));

    return {
      success: true,
      order: {
        id: orderRow.id,
        orderRef: orderRow.order_ref,
        trackingToken: orderRow.tracking_token,
        customerName: orderRow.customer_name,
        phone: orderRow.phone,
        address: orderRow.address,
        city: orderRow.city,
        subtotal: Number(orderRow.subtotal),
        deliveryFee: Number(orderRow.delivery_fee),
        totalAmount: Number(orderRow.total_amount),
        status: orderRow.status,
        notes: orderRow.notes,
        createdAt: orderRow.created_at,
        updatedAt: orderRow.updated_at,
      },
      items: formattedItems,
      payment: payRow
        ? {
            id: payRow.id,
            transactionId: payRow.transaction_id,
            paymentProofUrl: payRow.payment_proof_url,
            paymentStatus: payRow.payment_status,
            rejectionReason: payRow.rejection_reason,
            verifiedAt: payRow.verified_at,
          }
        : null,
      settings,
    };
  } catch (err: any) {
    console.error('getTrackingOrderServerSide error:', err);
    return {
      success: false,
      error: err.message || 'Server error loading tracking information.',
    };
  }
}
