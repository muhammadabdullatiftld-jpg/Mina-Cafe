import { z } from 'zod';
import { isSupabaseConfigured } from './supabase';
import { getSupabaseServerClient } from './supabaseServer';
import { OrderCreateResponse } from '../types';
import crypto from 'crypto';

// Zod Checkout Schema
export const checkoutSchema = z.object({
  customer: z.object({
    customerName: z.string().trim().min(2, 'Name must be at least 2 characters.'),
    phone: z.string().trim().min(10, 'Please enter a valid phone or WhatsApp number (min 10 digits).'),
    address: z.string().trim().min(5, 'Please enter your complete delivery address.'),
    city: z.string().trim().refine(
      (val) => val.toLowerCase() === 'karachi',
      { message: 'We currently deliver only in Karachi.' }
    ),
    notes: z.string().optional(),
  }),
  items: z.array(
    z.object({
      productId: z.string().min(1, 'Product ID is required'),
      quantity: z.number().int().min(1, 'Quantity must be at least 1'),
      selectedToppingIds: z.array(z.string()),
    })
  ).min(1, 'Your cart is empty.'),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;

/**
 * Server-side order creation handler with strict price recalculation & Karachi validation
 */
export async function createOrderServerSide(payload: unknown): Promise<OrderCreateResponse> {
  // 1. Zod Validation
  const parseResult = checkoutSchema.safeParse(payload);

  if (!parseResult.success) {
    const issue = parseResult.error.issues[0];
    return {
      success: false,
      error: issue ? issue.message : 'Invalid order details provided.',
      details: parseResult.error.flatten(),
    };
  }

  const { customer, items } = parseResult.data;

  // 2. Double check Karachi enforcement
  if (customer.city.toLowerCase() !== 'karachi') {
    return {
      success: false,
      error: 'We currently deliver only in Karachi. Orders to other cities are not supported.',
    };
  }

  if (!isSupabaseConfigured()) {
    return {
      success: false,
      error: 'Database is not configured. Please ensure Supabase environment variables are set.',
    };
  }

  try {
    const supabaseServer = getSupabaseServerClient();

    // 3. Fetch Admin Settings for Delivery Fee
    const { data: settingsData } = await supabaseServer
      .from('admin_settings')
      .select('delivery_fee, is_taking_orders')
      .eq('id', 1)
      .single();

    if (settingsData && settingsData.is_taking_orders === false) {
      return {
        success: false,
        error: 'Mina Cafe is currently not accepting new orders. Please check back later during operating hours.',
      };
    }

    const deliveryFee = settingsData ? Number(settingsData.delivery_fee) : 100.0;

    // 4. Fetch Products & Calculate Prices on Server
    const productIds = items.map((i) => i.productId);
    const { data: dbProducts, error: prodErr } = await supabaseServer
      .from('products')
      .select('*')
      .in('id', productIds);

    if (prodErr || !dbProducts || dbProducts.length === 0) {
      return {
        success: false,
        error: 'One or more products in your cart could not be found in our database.',
      };
    }

    // Process each item and verify pricing
    let subtotal = 0;
    const processedOrderItems: {
      productId: string;
      productName: string;
      unitPrice: number;
      quantity: number;
      selectedToppings: string[];
      toppingsExtraPrice: number;
      itemTotal: number;
    }[] = [];

    for (const item of items) {
      const dbProd = dbProducts.find((p) => p.id === item.productId);
      if (!dbProd) {
        return {
          success: false,
          error: `Product with ID ${item.productId} was not found.`,
        };
      }

      if (!dbProd.is_available) {
        return {
          success: false,
          error: `"${dbProd.name}" is currently sold out. Please remove it from your cart.`,
        };
      }

      const basePrice = Number(dbProd.price);
      let toppingExtraPrice = 0;
      let selectedToppingNames: string[] = [];

      // If toppings selected, fetch topping details and pricing rules
      if (item.selectedToppingIds && item.selectedToppingIds.length > 0) {
        const toppingCount = item.selectedToppingIds.length;

        // Fetch topping details and verify availability
        const { data: toppingRows } = await supabaseServer
          .from('toppings')
          .select('id, name, is_enabled')
          .in('id', item.selectedToppingIds);

        if (toppingRows) {
          for (const t of toppingRows) {
            if (t.is_enabled === false) {
              return {
                success: false,
                error: `The topping "${t.name}" is currently disabled/unavailable. Please update your topping choices.`,
              };
            }
          }
          selectedToppingNames = toppingRows.map((t) => t.name);
        }

        // Fetch topping pricing rules for this product
        const { data: pricingRows } = await supabaseServer
          .from('topping_pricing')
          .select('*')
          .eq('product_id', dbProd.id);

        let priceRuleMatch = pricingRows?.find((r) => r.topping_count === toppingCount);

        if (priceRuleMatch) {
          toppingExtraPrice = Number(priceRuleMatch.extra_price);
        } else {
          // Unpriced combination (e.g. 2 toppings or more) defaults to free (0 extra)
          toppingExtraPrice = 0;
        }
      }

      const unitPrice = basePrice + toppingExtraPrice;
      const itemTotal = unitPrice * item.quantity;
      subtotal += itemTotal;

      processedOrderItems.push({
        productId: dbProd.id,
        productName: dbProd.name,
        unitPrice,
        quantity: item.quantity,
        selectedToppings: selectedToppingNames,
        toppingsExtraPrice: toppingExtraPrice,
        itemTotal,
      });
    }

    const totalAmount = subtotal + deliveryFee;

    // 5. Generate Order Ref & Tracking Token
    const randomCode = Math.floor(1000 + Math.random() * 9000);
    const orderRef = `MINA-${randomCode}`;
    const trackingToken = crypto.randomBytes(16).toString('hex');

    // 6. Insert into Supabase `orders` table
    const { data: orderRow, error: orderInsertErr } = await supabaseServer
      .from('orders')
      .insert({
        order_ref: orderRef,
        tracking_token: trackingToken,
        customer_name: customer.customerName,
        phone: customer.phone,
        address: customer.address,
        city: 'Karachi',
        subtotal: subtotal,
        delivery_fee: deliveryFee,
        total_amount: totalAmount,
        status: 'Pending Payment',
        notes: customer.notes || null,
      })
      .select()
      .single();

    if (orderInsertErr || !orderRow) {
      console.error('Order insertion error:', orderInsertErr);
      const isRlsError = orderInsertErr?.message?.includes('row-level security');
      return {
        success: false,
        error: isRlsError
          ? 'Order submission failed: Server requires SUPABASE_SERVICE_ROLE_KEY in environment variables to bypass RLS securely.'
          : `Could not save order: ${orderInsertErr?.message || 'Database error'}`,
      };
    }

    // 7. Insert items into `order_items`
    const orderItemsPayload = processedOrderItems.map((pi) => ({
      order_id: orderRow.id,
      product_id: pi.productId,
      product_name: pi.productName,
      unit_price: pi.unitPrice,
      quantity: pi.quantity,
      selected_toppings: pi.selectedToppings,
      toppings_extra_price: pi.toppingsExtraPrice,
      item_total: pi.itemTotal,
    }));

    const { error: itemsInsertErr } = await supabaseServer
      .from('order_items')
      .insert(orderItemsPayload);

    if (itemsInsertErr) {
      console.error('Order items insertion error:', itemsInsertErr);
    }

    // 8. Insert initial payment record structure
    await supabaseServer.from('payments').insert({
      order_id: orderRow.id,
      transaction_id: 'PENDING',
      payment_status: 'Verification Pending',
    });

    return {
      success: true,
      orderId: orderRow.id,
      orderRef: orderRow.order_ref,
      trackingToken: orderRow.tracking_token,
      subtotal: subtotal,
      deliveryFee: deliveryFee,
      totalAmount: totalAmount,
    };
  } catch (err: any) {
    console.error('Server order execution exception:', err);
    return {
      success: false,
      error: err.message || 'An unexpected error occurred while placing your order.',
    };
  }
}
