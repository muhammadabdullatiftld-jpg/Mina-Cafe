import { verifyAdminServerSide } from './adminAuthService.js';
import { getSupabaseServerClient } from './supabaseServer.js';

export const ALLOWED_ORDER_STATUSES = [
  'Pending Payment',
  'Verification Pending',
  'Payment Verified',
  'Preparing',
  'Ready',
  'Completed',
  'Cancelled',
] as const;

export type OrderStatus = (typeof ALLOWED_ORDER_STATUSES)[number];

export const ALLOWED_PAYMENT_STATUSES = [
  'Verification Pending',
  'Verified',
  'Rejected',
] as const;

export type PaymentStatus = (typeof ALLOWED_PAYMENT_STATUSES)[number];

export interface AdminOrderSummary {
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
  status: OrderStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  payment: {
    id: string;
    transactionId: string;
    paymentProofUrl: string | null;
    paymentStatus: PaymentStatus;
    rejectionReason: string | null;
    verifiedAt: string | null;
    createdAt: string;
  } | null;
}

export interface AdminOrderItemDetail {
  id: string;
  productId: string;
  productName: string;
  unitPrice: number;
  quantity: number;
  selectedToppings: string[];
  toppingsExtraPrice: number;
  itemTotal: number;
}

export interface AdminOrderDetail extends AdminOrderSummary {
  items: AdminOrderItemDetail[];
}

export interface GetOrdersResult {
  success: boolean;
  orders?: AdminOrderSummary[];
  totalCount?: number;
  error?: string;
}

export interface GetOrderDetailResult {
  success: boolean;
  order?: AdminOrderDetail;
  error?: string;
}

export interface UpdateOrderStatusResult {
  success: boolean;
  orderId?: string;
  status?: OrderStatus;
  error?: string;
}

export interface VerifyPaymentResult {
  success: boolean;
  orderId?: string;
  paymentStatus?: PaymentStatus;
  orderStatus?: OrderStatus;
  error?: string;
}

/**
 * Get all orders with search, order status, and payment status filtering.
 * Strictly checks server-side admin credentials.
 */
export async function getAdminOrdersServerSide(
  authHeader?: string,
  filters?: {
    search?: string;
    status?: string;
    paymentStatus?: string;
  }
): Promise<GetOrdersResult> {
  // 1. Verify admin token
  const authCheck = await verifyAdminServerSide(authHeader);
  if (!authCheck.success || !authCheck.isAdmin) {
    return {
      success: false,
      error: authCheck.error || 'Unauthorized access: Admin authorization required.',
    };
  }

  const supabase = getSupabaseServerClient();

  try {
    // Query orders with payment relation
    let query = supabase
      .from('orders')
      .select('*, payments(*)')
      .order('created_at', { ascending: false });

    // Apply order status filter if provided and not "ALL"
    if (filters?.status && filters.status !== 'ALL') {
      query = query.eq('status', filters.status);
    }

    const { data: rows, error } = await query;

    if (error) {
      console.error('getAdminOrdersServerSide error:', error);
      return {
        success: false,
        error: `Failed to retrieve orders: ${error.message}`,
      };
    }

    if (!rows) {
      return { success: true, orders: [], totalCount: 0 };
    }

    // Map rows to AdminOrderSummary
    let mappedOrders: AdminOrderSummary[] = rows.map((row: any) => {
      let payData = null;
      if (row.payments) {
        const payObj = Array.isArray(row.payments) ? row.payments[0] : row.payments;
        if (payObj) {
          payData = {
            id: payObj.id,
            transactionId: payObj.transaction_id || 'PENDING',
            paymentProofUrl: payObj.payment_proof_url || null,
            paymentStatus: (payObj.payment_status || 'Verification Pending') as PaymentStatus,
            rejectionReason: payObj.rejection_reason || null,
            verifiedAt: payObj.verified_at || null,
            createdAt: payObj.created_at,
          };
        }
      }

      return {
        id: row.id,
        orderRef: row.order_ref,
        trackingToken: row.tracking_token,
        customerName: row.customer_name,
        phone: row.phone,
        address: row.address,
        city: row.city,
        subtotal: Number(row.subtotal),
        deliveryFee: Number(row.delivery_fee),
        totalAmount: Number(row.total_amount),
        status: row.status as OrderStatus,
        notes: row.notes || null,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        payment: payData,
      };
    });

    // Apply Client-Side Filter for Search term if provided
    if (filters?.search && filters.search.trim()) {
      const term = filters.search.trim().toLowerCase();
      mappedOrders = mappedOrders.filter((o) => {
        const refMatch = o.orderRef.toLowerCase().includes(term);
        const nameMatch = o.customerName.toLowerCase().includes(term);
        const phoneMatch = o.phone.toLowerCase().includes(term);
        const txMatch = o.payment?.transactionId.toLowerCase().includes(term);
        return refMatch || nameMatch || phoneMatch || Boolean(txMatch);
      });
    }

    // Apply payment status filter if provided and not "ALL"
    if (filters?.paymentStatus && filters.paymentStatus !== 'ALL') {
      const reqPayStatus = filters.paymentStatus;
      mappedOrders = mappedOrders.filter((o) => {
        if (reqPayStatus === 'PENDING_SUBMISSION') {
          return !o.payment || o.payment.transactionId === 'PENDING';
        }
        return o.payment?.paymentStatus === reqPayStatus;
      });
    }

    return {
      success: true,
      orders: mappedOrders,
      totalCount: mappedOrders.length,
    };
  } catch (err: any) {
    console.error('getAdminOrdersServerSide exception:', err);
    return {
      success: false,
      error: err.message || 'Server error while fetching admin orders.',
    };
  }
}

/**
 * Get detailed information for a single order including items and payment details.
 */
export async function getAdminOrderDetailServerSide(
  authHeader?: string,
  orderId?: string
): Promise<GetOrderDetailResult> {
  // 1. Verify admin token
  const authCheck = await verifyAdminServerSide(authHeader);
  if (!authCheck.success || !authCheck.isAdmin) {
    return {
      success: false,
      error: authCheck.error || 'Unauthorized access: Admin authorization required.',
    };
  }

  if (!orderId || typeof orderId !== 'string') {
    return { success: false, error: 'Order ID is required.' };
  }

  const supabase = getSupabaseServerClient();

  try {
    // Fetch order record
    const { data: orderRow, error: orderErr } = await supabase
      .from('orders')
      .select('*, payments(*)')
      .eq('id', orderId)
      .single();

    if (orderErr || !orderRow) {
      return { success: false, error: 'Order not found.' };
    }

    // Fetch order items
    const { data: itemsRows, error: itemsErr } = await supabase
      .from('order_items')
      .select('*')
      .eq('order_id', orderId);

    if (itemsErr) {
      console.warn('order_items fetch error:', itemsErr.message);
    }

    const items: AdminOrderItemDetail[] = (itemsRows || []).map((item: any) => ({
      id: item.id,
      productId: item.product_id,
      productName: item.product_name,
      unitPrice: Number(item.unit_price),
      quantity: Number(item.quantity),
      selectedToppings: Array.isArray(item.selected_toppings)
        ? item.selected_toppings
        : typeof item.selected_toppings === 'string'
        ? JSON.parse(item.selected_toppings)
        : [],
      toppingsExtraPrice: Number(item.toppings_extra_price || 0),
      itemTotal: Number(item.item_total),
    }));

    let payData = null;
    if (orderRow.payments) {
      const payObj = Array.isArray(orderRow.payments) ? orderRow.payments[0] : orderRow.payments;
      if (payObj) {
        payData = {
          id: payObj.id,
          transactionId: payObj.transaction_id || 'PENDING',
          paymentProofUrl: payObj.payment_proof_url || null,
          paymentStatus: (payObj.payment_status || 'Verification Pending') as PaymentStatus,
          rejectionReason: payObj.rejection_reason || null,
          verifiedAt: payObj.verified_at || null,
          createdAt: payObj.created_at,
        };
      }
    }

    const fullOrder: AdminOrderDetail = {
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
      status: orderRow.status as OrderStatus,
      notes: orderRow.notes || null,
      createdAt: orderRow.created_at,
      updatedAt: orderRow.updated_at,
      payment: payData,
      items,
    };

    return {
      success: true,
      order: fullOrder,
    };
  } catch (err: any) {
    console.error('getAdminOrderDetailServerSide exception:', err);
    return {
      success: false,
      error: err.message || 'Server error fetching order details.',
    };
  }
}

/**
 * Update order status securely server-side.
 */
export async function updateOrderStatusServerSide(
  authHeader?: string,
  orderId?: string,
  newStatus?: string
): Promise<UpdateOrderStatusResult> {
  // 1. Verify admin token
  const authCheck = await verifyAdminServerSide(authHeader);
  if (!authCheck.success || !authCheck.isAdmin) {
    return {
      success: false,
      error: authCheck.error || 'Unauthorized access: Admin authorization required.',
    };
  }

  if (!orderId) {
    return { success: false, error: 'Order ID is required.' };
  }

  if (!newStatus || !ALLOWED_ORDER_STATUSES.includes(newStatus as OrderStatus)) {
    return {
      success: false,
      error: `Invalid status "${newStatus}". Allowed values: ${ALLOWED_ORDER_STATUSES.join(', ')}`,
    };
  }

  const supabase = getSupabaseServerClient();

  try {
    const { error: updateErr } = await supabase
      .from('orders')
      .update({
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId);

    if (updateErr) {
      return { success: false, error: `Failed to update status: ${updateErr.message}` };
    }

    return {
      success: true,
      orderId,
      status: newStatus as OrderStatus,
    };
  } catch (err: any) {
    console.error('updateOrderStatusServerSide exception:', err);
    return {
      success: false,
      error: err.message || 'Server error updating order status.',
    };
  }
}

/**
 * Approve or Reject payment securely server-side.
 * Updates payment state and synchronizes order status without altering order total.
 */
export async function verifyPaymentServerSide(
  authHeader?: string,
  orderId?: string,
  action?: 'verify' | 'reject',
  rejectionReason?: string
): Promise<VerifyPaymentResult> {
  // 1. Verify admin token
  const authCheck = await verifyAdminServerSide(authHeader);
  if (!authCheck.success || !authCheck.isAdmin) {
    return {
      success: false,
      error: authCheck.error || 'Unauthorized access: Admin authorization required.',
    };
  }

  if (!orderId) {
    return { success: false, error: 'Order ID is required.' };
  }

  if (action !== 'verify' && action !== 'reject') {
    return { success: false, error: 'Action must be either "verify" or "reject".' };
  }

  const supabase = getSupabaseServerClient();

  try {
    // 1. Find existing payment row for order
    const { data: payRow, error: payFetchErr } = await supabase
      .from('payments')
      .select('id, payment_status')
      .eq('order_id', orderId)
      .maybeSingle();

    if (payFetchErr) {
      return { success: false, error: `Payment lookup error: ${payFetchErr.message}` };
    }

    let paymentId = payRow?.id;

    if (action === 'verify') {
      const nowIso = new Date().toISOString();

      if (paymentId) {
        const { error: updatePayErr } = await supabase
          .from('payments')
          .update({
            payment_status: 'Verified',
            verified_at: nowIso,
            rejection_reason: null,
          })
          .eq('id', paymentId);

        if (updatePayErr) {
          return { success: false, error: `Failed to verify payment: ${updatePayErr.message}` };
        }
      } else {
        const { data: newPay, error: insertPayErr } = await supabase
          .from('payments')
          .insert({
            order_id: orderId,
            transaction_id: 'VERIFIED_BY_ADMIN',
            payment_status: 'Verified',
            verified_at: nowIso,
          })
          .select()
          .single();

        if (insertPayErr) {
          return { success: false, error: `Failed to record verified payment: ${insertPayErr.message}` };
        }
        paymentId = newPay.id;
      }

      // Automatically transition order status to 'Payment Verified' if it's currently pending/verification
      const { data: orderData } = await supabase
        .from('orders')
        .select('status')
        .eq('id', orderId)
        .single();

      let targetOrderStatus: OrderStatus = (orderData?.status as OrderStatus) || 'Payment Verified';
      if (!orderData || orderData.status === 'Pending Payment' || orderData.status === 'Verification Pending') {
        targetOrderStatus = 'Payment Verified';
        await supabase
          .from('orders')
          .update({
            status: targetOrderStatus,
            updated_at: nowIso,
          })
          .eq('id', orderId);
      }

      return {
        success: true,
        orderId,
        paymentStatus: 'Verified',
        orderStatus: targetOrderStatus,
      };
    } else {
      // Action: 'reject'
      const reason = rejectionReason?.trim() || 'Payment details could not be verified by admin.';
      const nowIso = new Date().toISOString();

      if (paymentId) {
        const { error: updatePayErr } = await supabase
          .from('payments')
          .update({
            payment_status: 'Rejected',
            rejection_reason: reason,
          })
          .eq('id', paymentId);

        if (updatePayErr) {
          return { success: false, error: `Failed to reject payment: ${updatePayErr.message}` };
        }
      } else {
        await supabase.from('payments').insert({
          order_id: orderId,
          transaction_id: 'REJECTED_BY_ADMIN',
          payment_status: 'Rejected',
          rejection_reason: reason,
        });
      }

      // Keep order record intact! Set status to 'Pending Payment' if it was in 'Verification Pending'
      const { data: orderData } = await supabase
        .from('orders')
        .select('status')
        .eq('id', orderId)
        .single();

      let targetOrderStatus: OrderStatus = (orderData?.status as OrderStatus) || 'Pending Payment';
      if (orderData && orderData.status === 'Verification Pending') {
        targetOrderStatus = 'Pending Payment';
        await supabase
          .from('orders')
          .update({
            status: targetOrderStatus,
            updated_at: nowIso,
          })
          .eq('id', orderId);
      }

      return {
        success: true,
        orderId,
        paymentStatus: 'Rejected',
        orderStatus: targetOrderStatus,
      };
    }
  } catch (err: any) {
    console.error('verifyPaymentServerSide exception:', err);
    return {
      success: false,
      error: err.message || 'Server error verifying payment.',
    };
  }
}
