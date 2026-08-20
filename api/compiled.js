// src/lib/supabase.ts
import { createClient } from "@supabase/supabase-js";
var getEnvVar = (key) => {
  if (typeof import.meta !== "undefined" && import.meta.env && import.meta.env[key]) {
    return import.meta.env[key];
  }
  if (typeof process !== "undefined" && process.env && process.env[key]) {
    return process.env[key] || "";
  }
  return "";
};
var DEFAULT_URL = "https://tnsikkgnxlqiodvcalvi.supabase.co";
var DEFAULT_ANON_KEY = "sb_publishable_IWXFWLkJs3BxUPILJ0T8RA_0tdIodNS";
var rawUrl = getEnvVar("VITE_SUPABASE_URL") || getEnvVar("SUPABASE_URL") || DEFAULT_URL;
var SUPABASE_URL = rawUrl.replace(/\/rest\/v1\/?$/, "").replace(/\/$/, "");
var SUPABASE_ANON_KEY = getEnvVar("VITE_SUPABASE_ANON_KEY") || getEnvVar("SUPABASE_ANON_KEY") || DEFAULT_ANON_KEY;
var isSupabaseConfigured = () => {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY && SUPABASE_URL.startsWith("http"));
};
var supabase = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

// src/lib/productsService.ts
async function fetchProductsFromSupabase() {
  if (!isSupabaseConfigured()) {
    return {
      products: [],
      error: "Supabase URL or Anon Key is missing. Please add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to environment variables.",
      isConfigured: false
    };
  }
  try {
    const { data, error } = await supabase.from("products").select("*").order("created_at", { ascending: true });
    if (error) {
      console.error("Error fetching products from Supabase:", error);
      return {
        products: [],
        error: `Supabase query error: ${error.message}. Make sure the schema in supabase_schema.sql has been executed in your Supabase SQL editor.`,
        isConfigured: true
      };
    }
    return {
      products: data || [],
      error: null,
      isConfigured: true
    };
  } catch (err) {
    return {
      products: [],
      error: err.message || "Failed to connect to Supabase database.",
      isConfigured: true
    };
  }
}

// src/lib/settingsService.ts
async function fetchAdminSettings() {
  if (!isSupabaseConfigured()) {
    return {
      settings: null,
      deliveryFee: 100,
      // Safe default if Supabase env var not set yet
      error: "Supabase credentials not configured"
    };
  }
  try {
    const { data, error } = await supabase.from("admin_settings").select("*").eq("id", 1).single();
    if (error || !data) {
      console.warn("Could not fetch admin_settings from Supabase:", error);
      return {
        settings: null,
        deliveryFee: 100,
        error: error ? error.message : "Settings row not found"
      };
    }
    const deliveryFee = Number(data.delivery_fee);
    const formattedSettings = {
      id: 1,
      easypaisa_number: data.easypaisa_number || "03402694079",
      easypaisa_account_title: data.easypaisa_account_title || "KASHMENA",
      whatsapp_number: data.whatsapp_number || "923000000000",
      delivery_fee: isNaN(deliveryFee) ? 100 : deliveryFee,
      stall_location: data.stall_location || "Karachi, Pakistan",
      opening_hours: data.opening_hours || "4:00 PM - 12:00 AM",
      is_taking_orders: data.is_taking_orders ?? true,
      updated_at: data.updated_at
    };
    return {
      settings: formattedSettings,
      deliveryFee: isNaN(deliveryFee) ? 100 : deliveryFee,
      error: null
    };
  } catch (err) {
    return {
      settings: null,
      deliveryFee: 100,
      error: err.message || "Error fetching admin settings"
    };
  }
}

// src/lib/orderService.ts
import { z } from "zod";

// src/lib/supabaseServer.ts
import { createClient as createClient2 } from "@supabase/supabase-js";
var getEnvVar2 = (key) => {
  if (typeof process !== "undefined" && process.env && process.env[key]) {
    return process.env[key] || "";
  }
  return "";
};
var DEFAULT_URL2 = "https://tnsikkgnxlqiodvcalvi.supabase.co";
var DEFAULT_ANON_KEY2 = "sb_publishable_IWXFWLkJs3BxUPILJ0T8RA_0tdIodNS";
var rawUrl2 = getEnvVar2("SUPABASE_URL") || getEnvVar2("VITE_SUPABASE_URL") || DEFAULT_URL2;
var SUPABASE_URL2 = rawUrl2.replace(/\/rest\/v1\/?$/, "").replace(/\/$/, "");
var SUPABASE_ANON_KEY2 = getEnvVar2("VITE_SUPABASE_ANON_KEY") || getEnvVar2("SUPABASE_ANON_KEY") || DEFAULT_ANON_KEY2;
var SUPABASE_SERVICE_ROLE_KEY = getEnvVar2("SUPABASE_SERVICE_ROLE_KEY") || getEnvVar2("SUPABASE_SECRET_KEY") || getEnvVar2("SUPABASE_SERVICE_KEY") || SUPABASE_ANON_KEY2;
var supabaseServerInstance = null;
function getSupabaseServerClient() {
  if (!supabaseServerInstance) {
    supabaseServerInstance = createClient2(SUPABASE_URL2, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    });
  }
  return supabaseServerInstance;
}

// src/lib/orderService.ts
import crypto from "crypto";
var checkoutSchema = z.object({
  customer: z.object({
    customerName: z.string().trim().min(2, "Name must be at least 2 characters."),
    phone: z.string().trim().min(10, "Please enter a valid phone or WhatsApp number (min 10 digits)."),
    address: z.string().trim().min(5, "Please enter your complete delivery address."),
    city: z.string().trim().refine(
      (val) => val.toLowerCase() === "karachi",
      { message: "We currently deliver only in Karachi." }
    ),
    notes: z.string().optional()
  }),
  items: z.array(
    z.object({
      productId: z.string().min(1, "Product ID is required"),
      quantity: z.number().int().min(1, "Quantity must be at least 1"),
      selectedToppingIds: z.array(z.string())
    })
  ).min(1, "Your cart is empty.")
});
async function createOrderServerSide(payload) {
  const parseResult = checkoutSchema.safeParse(payload);
  if (!parseResult.success) {
    const issue = parseResult.error.issues[0];
    return {
      success: false,
      error: issue ? issue.message : "Invalid order details provided.",
      details: parseResult.error.flatten()
    };
  }
  const { customer, items } = parseResult.data;
  if (customer.city.toLowerCase() !== "karachi") {
    return {
      success: false,
      error: "We currently deliver only in Karachi. Orders to other cities are not supported."
    };
  }
  if (!isSupabaseConfigured()) {
    return {
      success: false,
      error: "Database is not configured. Please ensure Supabase environment variables are set."
    };
  }
  try {
    const supabaseServer = getSupabaseServerClient();
    const { data: settingsData } = await supabaseServer.from("admin_settings").select("delivery_fee, is_taking_orders").eq("id", 1).single();
    if (settingsData && settingsData.is_taking_orders === false) {
      return {
        success: false,
        error: "Mina Cafe is currently not accepting new orders. Please check back later during operating hours."
      };
    }
    const deliveryFee = settingsData ? Number(settingsData.delivery_fee) : 100;
    const productIds = items.map((i) => i.productId);
    const { data: dbProducts, error: prodErr } = await supabaseServer.from("products").select("*").in("id", productIds);
    if (prodErr || !dbProducts || dbProducts.length === 0) {
      return {
        success: false,
        error: "One or more products in your cart could not be found in our database."
      };
    }
    let subtotal = 0;
    const processedOrderItems = [];
    for (const item of items) {
      const dbProd = dbProducts.find((p) => p.id === item.productId);
      if (!dbProd) {
        return {
          success: false,
          error: `Product with ID ${item.productId} was not found.`
        };
      }
      if (!dbProd.is_available) {
        return {
          success: false,
          error: `"${dbProd.name}" is currently sold out. Please remove it from your cart.`
        };
      }
      const basePrice = Number(dbProd.price);
      let toppingExtraPrice = 0;
      let selectedToppingNames = [];
      if (item.selectedToppingIds && item.selectedToppingIds.length > 0) {
        const toppingCount = item.selectedToppingIds.length;
        const { data: toppingRows } = await supabaseServer.from("toppings").select("id, name, is_enabled").in("id", item.selectedToppingIds);
        if (toppingRows) {
          for (const t of toppingRows) {
            if (t.is_enabled === false) {
              return {
                success: false,
                error: `The topping "${t.name}" is currently disabled/unavailable. Please update your topping choices.`
              };
            }
          }
          selectedToppingNames = toppingRows.map((t) => t.name);
        }
        const { data: pricingRows } = await supabaseServer.from("topping_pricing").select("*").eq("product_id", dbProd.id);
        let priceRuleMatch = pricingRows?.find((r) => r.topping_count === toppingCount);
        if (priceRuleMatch) {
          toppingExtraPrice = Number(priceRuleMatch.extra_price);
        } else {
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
        itemTotal
      });
    }
    const totalAmount = subtotal + deliveryFee;
    const randomCode = Math.floor(1e3 + Math.random() * 9e3);
    const orderRef = `MINA-${randomCode}`;
    const trackingToken = crypto.randomBytes(16).toString("hex");
    const { data: orderRow, error: orderInsertErr } = await supabaseServer.from("orders").insert({
      order_ref: orderRef,
      tracking_token: trackingToken,
      customer_name: customer.customerName,
      phone: customer.phone,
      address: customer.address,
      city: "Karachi",
      subtotal,
      delivery_fee: deliveryFee,
      total_amount: totalAmount,
      status: "Pending Payment",
      notes: customer.notes || null
    }).select().single();
    if (orderInsertErr || !orderRow) {
      console.error("Order insertion error:", orderInsertErr);
      const isRlsError = orderInsertErr?.message?.includes("row-level security");
      return {
        success: false,
        error: isRlsError ? "Order submission failed: Server requires SUPABASE_SERVICE_ROLE_KEY in environment variables to bypass RLS securely." : `Could not save order: ${orderInsertErr?.message || "Database error"}`
      };
    }
    const orderItemsPayload = processedOrderItems.map((pi) => ({
      order_id: orderRow.id,
      product_id: pi.productId,
      product_name: pi.productName,
      unit_price: pi.unitPrice,
      quantity: pi.quantity,
      selected_toppings: pi.selectedToppings,
      toppings_extra_price: pi.toppingsExtraPrice,
      item_total: pi.itemTotal
    }));
    const { error: itemsInsertErr } = await supabaseServer.from("order_items").insert(orderItemsPayload);
    if (itemsInsertErr) {
      console.error("Order items insertion error:", itemsInsertErr);
    }
    await supabaseServer.from("payments").insert({
      order_id: orderRow.id,
      transaction_id: "PENDING",
      payment_status: "Verification Pending"
    });
    return {
      success: true,
      orderId: orderRow.id,
      orderRef: orderRow.order_ref,
      trackingToken: orderRow.tracking_token,
      subtotal,
      deliveryFee,
      totalAmount
    };
  } catch (err) {
    console.error("Server order execution exception:", err);
    return {
      success: false,
      error: err.message || "An unexpected error occurred while placing your order."
    };
  }
}

// src/lib/paymentService.ts
async function submitPaymentServerSide(input) {
  const { trackingToken, transactionId, screenshotBase64, screenshotFileName } = input;
  if (!trackingToken || typeof trackingToken !== "string") {
    return { success: false, error: "Tracking token is required." };
  }
  const trimmedTxId = (transactionId || "").trim();
  if (!trimmedTxId || trimmedTxId.length < 3) {
    return { success: false, error: "Please enter a valid EasyPaisa Transaction ID." };
  }
  const supabase2 = getSupabaseServerClient();
  try {
    const { data: orderRow, error: orderErr } = await supabase2.from("orders").select("id, order_ref, status").eq("tracking_token", trackingToken).single();
    if (orderErr || !orderRow) {
      return { success: false, error: "Order not found or invalid tracking token." };
    }
    let paymentProofUrl = null;
    if (screenshotBase64) {
      try {
        let mimeType = "image/jpeg";
        let base64Data = screenshotBase64;
        if (screenshotBase64.includes(";base64,")) {
          const parts = screenshotBase64.split(";base64,");
          const header = parts[0];
          base64Data = parts[1];
          const matches = header.match(/data:(image\/[a-zA-Z0-9\+\-\.]+)/);
          if (matches && matches[1]) {
            mimeType = matches[1];
          }
        }
        const allowedMimeTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
        if (!allowedMimeTypes.includes(mimeType.toLowerCase())) {
          return {
            success: false,
            error: "Invalid file format. Please upload a JPEG, PNG, or WebP screenshot."
          };
        }
        const buffer = Buffer.from(base64Data, "base64");
        const maxSizeBytes = 5 * 1024 * 1024;
        if (buffer.length > maxSizeBytes) {
          return {
            success: false,
            error: "Screenshot image size exceeds 5MB limit. Please upload a smaller image."
          };
        }
        const extMap = {
          "image/jpeg": "jpg",
          "image/jpg": "jpg",
          "image/png": "png",
          "image/webp": "webp"
        };
        const ext = extMap[mimeType.toLowerCase()] || "jpg";
        const fileName = `${orderRow.id}/${Date.now()}_proof.${ext}`;
        const bucketName = "payment-proofs";
        const { error: uploadErr } = await supabase2.storage.from(bucketName).upload(fileName, buffer, {
          contentType: mimeType,
          upsert: true
        });
        if (uploadErr) {
          console.warn("Supabase storage upload warning:", uploadErr.message);
          if (uploadErr.message?.includes("bucket not found") || uploadErr.message?.includes("Bucket")) {
            await supabase2.storage.createBucket(bucketName, { public: true });
            const { error: retryErr } = await supabase2.storage.from(bucketName).upload(fileName, buffer, {
              contentType: mimeType,
              upsert: true
            });
            if (!retryErr) {
              const { data: urlData } = supabase2.storage.from(bucketName).getPublicUrl(fileName);
              paymentProofUrl = urlData?.publicUrl || fileName;
            }
          }
        } else {
          const { data: urlData } = supabase2.storage.from(bucketName).getPublicUrl(fileName);
          paymentProofUrl = urlData?.publicUrl || fileName;
        }
      } catch (uploadException) {
        console.warn("Screenshot processing exception:", uploadException);
      }
    }
    const { data: existingPay } = await supabase2.from("payments").select("id").eq("order_id", orderRow.id).maybeSingle();
    if (existingPay) {
      const { error: updatePayErr } = await supabase2.from("payments").update({
        transaction_id: trimmedTxId,
        payment_proof_url: paymentProofUrl || void 0,
        payment_status: "Verification Pending"
      }).eq("id", existingPay.id);
      if (updatePayErr) {
        console.error("Payment update error:", updatePayErr);
      }
    } else {
      const { error: insertPayErr } = await supabase2.from("payments").insert({
        order_id: orderRow.id,
        transaction_id: trimmedTxId,
        payment_proof_url: paymentProofUrl || null,
        payment_status: "Verification Pending"
      });
      if (insertPayErr) {
        console.error("Payment insert error:", insertPayErr);
      }
    }
    const { error: updateOrderErr } = await supabase2.from("orders").update({
      status: "Verification Pending",
      updated_at: (/* @__PURE__ */ new Date()).toISOString()
    }).eq("id", orderRow.id);
    if (updateOrderErr) {
      console.error("Order status update error:", updateOrderErr);
    }
    return {
      success: true,
      orderId: orderRow.id,
      orderRef: orderRow.order_ref,
      status: "Verification Pending",
      transactionId: trimmedTxId,
      paymentProofUrl: paymentProofUrl || void 0
    };
  } catch (err) {
    console.error("submitPaymentServerSide error:", err);
    return {
      success: false,
      error: err.message || "Server error processing payment submission."
    };
  }
}

// src/lib/trackingService.ts
async function getTrackingOrderServerSide(trackingToken) {
  if (!trackingToken || typeof trackingToken !== "string" || trackingToken.trim().length < 8) {
    return {
      success: false,
      error: "Invalid or missing tracking token."
    };
  }
  const supabase2 = getSupabaseServerClient();
  try {
    const { data: orderRow, error: orderErr } = await supabase2.from("orders").select("*").eq("tracking_token", trackingToken.trim()).maybeSingle();
    if (orderErr || !orderRow) {
      return {
        success: false,
        error: "No order found matching the provided tracking token."
      };
    }
    const { data: itemsRows } = await supabase2.from("order_items").select("*").eq("order_id", orderRow.id);
    const { data: payRow } = await supabase2.from("payments").select("*").eq("order_id", orderRow.id).maybeSingle();
    const settingsRes = await fetchAdminSettings();
    const settings = {
      easypaisaNumber: settingsRes.settings?.easypaisa_number || "03402694079",
      easypaisaAccountTitle: settingsRes.settings?.easypaisa_account_title || "KASHMENA",
      whatsappNumber: settingsRes.settings?.whatsapp_number || "923000000000"
    };
    const formattedItems = (itemsRows || []).map((i) => ({
      id: i.id,
      productName: i.product_name,
      unitPrice: Number(i.unit_price),
      quantity: Number(i.quantity),
      selectedToppings: Array.isArray(i.selected_toppings) ? i.selected_toppings : typeof i.selected_toppings === "string" ? JSON.parse(i.selected_toppings) : [],
      toppingsExtraPrice: Number(i.toppings_extra_price || 0),
      itemTotal: Number(i.item_total)
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
        updatedAt: orderRow.updated_at
      },
      items: formattedItems,
      payment: payRow ? {
        id: payRow.id,
        transactionId: payRow.transaction_id,
        paymentProofUrl: payRow.payment_proof_url,
        paymentStatus: payRow.payment_status,
        rejectionReason: payRow.rejection_reason,
        verifiedAt: payRow.verified_at
      } : null,
      settings
    };
  } catch (err) {
    console.error("getTrackingOrderServerSide error:", err);
    return {
      success: false,
      error: err.message || "Server error loading tracking information."
    };
  }
}

// src/lib/adminAuthService.ts
async function verifyAdminServerSide(authHeader) {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return {
      success: false,
      isAdmin: false,
      error: "Missing or invalid authorization header."
    };
  }
  const token = authHeader.replace("Bearer ", "").trim();
  if (!token) {
    return {
      success: false,
      isAdmin: false,
      error: "Empty authentication token."
    };
  }
  const supabase2 = getSupabaseServerClient();
  const { data: userData, error: userError } = await supabase2.auth.getUser(token);
  if (userError || !userData?.user) {
    return {
      success: false,
      isAdmin: false,
      error: userError?.message || "Invalid or expired session token."
    };
  }
  const user = userData.user;
  const userEmail = (user.email || "").toLowerCase().trim();
  try {
    const { data: adminRows, error: adminQueryError } = await supabase2.from("admin_users").select("id, user_id, email, role").or(`user_id.eq.${user.id},email.eq.${userEmail}`);
    if (!adminQueryError && adminRows && adminRows.length > 0) {
      return {
        success: true,
        isAdmin: true,
        user: {
          id: user.id,
          email: userEmail
        }
      };
    }
    const { count, error: countError } = await supabase2.from("admin_users").select("*", { count: "exact", head: true });
    if (!countError && (count === 0 || count === null)) {
      const { error: insertError } = await supabase2.from("admin_users").insert({
        user_id: user.id,
        email: userEmail,
        role: "admin"
      });
      if (!insertError) {
        console.log(`[AdminAuth] Initialized first admin user: ${userEmail}`);
        return {
          success: true,
          isAdmin: true,
          user: {
            id: user.id,
            email: userEmail
          }
        };
      }
    }
    return {
      success: false,
      isAdmin: false,
      error: "Access denied: Your account is not authorized as an admin."
    };
  } catch (err) {
    console.error("Admin verification exception:", err);
    return {
      success: false,
      isAdmin: false,
      error: "Server error during admin authorization check."
    };
  }
}

// src/lib/adminOrderService.ts
var ALLOWED_ORDER_STATUSES = [
  "Pending Payment",
  "Verification Pending",
  "Payment Verified",
  "Preparing",
  "Ready",
  "Completed",
  "Cancelled"
];
async function getAdminOrdersServerSide(authHeader, filters) {
  const authCheck = await verifyAdminServerSide(authHeader);
  if (!authCheck.success || !authCheck.isAdmin) {
    return {
      success: false,
      error: authCheck.error || "Unauthorized access: Admin authorization required."
    };
  }
  const supabase2 = getSupabaseServerClient();
  try {
    let query = supabase2.from("orders").select("*, payments(*)").order("created_at", { ascending: false });
    if (filters?.status && filters.status !== "ALL") {
      query = query.eq("status", filters.status);
    }
    const { data: rows, error } = await query;
    if (error) {
      console.error("getAdminOrdersServerSide error:", error);
      return {
        success: false,
        error: `Failed to retrieve orders: ${error.message}`
      };
    }
    if (!rows) {
      return { success: true, orders: [], totalCount: 0 };
    }
    let mappedOrders = rows.map((row) => {
      let payData = null;
      if (row.payments) {
        const payObj = Array.isArray(row.payments) ? row.payments[0] : row.payments;
        if (payObj) {
          payData = {
            id: payObj.id,
            transactionId: payObj.transaction_id || "PENDING",
            paymentProofUrl: payObj.payment_proof_url || null,
            paymentStatus: payObj.payment_status || "Verification Pending",
            rejectionReason: payObj.rejection_reason || null,
            verifiedAt: payObj.verified_at || null,
            createdAt: payObj.created_at
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
        status: row.status,
        notes: row.notes || null,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        payment: payData
      };
    });
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
    if (filters?.paymentStatus && filters.paymentStatus !== "ALL") {
      const reqPayStatus = filters.paymentStatus;
      mappedOrders = mappedOrders.filter((o) => {
        if (reqPayStatus === "PENDING_SUBMISSION") {
          return !o.payment || o.payment.transactionId === "PENDING";
        }
        return o.payment?.paymentStatus === reqPayStatus;
      });
    }
    return {
      success: true,
      orders: mappedOrders,
      totalCount: mappedOrders.length
    };
  } catch (err) {
    console.error("getAdminOrdersServerSide exception:", err);
    return {
      success: false,
      error: err.message || "Server error while fetching admin orders."
    };
  }
}
async function getAdminOrderDetailServerSide(authHeader, orderId) {
  const authCheck = await verifyAdminServerSide(authHeader);
  if (!authCheck.success || !authCheck.isAdmin) {
    return {
      success: false,
      error: authCheck.error || "Unauthorized access: Admin authorization required."
    };
  }
  if (!orderId || typeof orderId !== "string") {
    return { success: false, error: "Order ID is required." };
  }
  const supabase2 = getSupabaseServerClient();
  try {
    const { data: orderRow, error: orderErr } = await supabase2.from("orders").select("*, payments(*)").eq("id", orderId).single();
    if (orderErr || !orderRow) {
      return { success: false, error: "Order not found." };
    }
    const { data: itemsRows, error: itemsErr } = await supabase2.from("order_items").select("*").eq("order_id", orderId);
    if (itemsErr) {
      console.warn("order_items fetch error:", itemsErr.message);
    }
    const items = (itemsRows || []).map((item) => ({
      id: item.id,
      productId: item.product_id,
      productName: item.product_name,
      unitPrice: Number(item.unit_price),
      quantity: Number(item.quantity),
      selectedToppings: Array.isArray(item.selected_toppings) ? item.selected_toppings : typeof item.selected_toppings === "string" ? JSON.parse(item.selected_toppings) : [],
      toppingsExtraPrice: Number(item.toppings_extra_price || 0),
      itemTotal: Number(item.item_total)
    }));
    let payData = null;
    if (orderRow.payments) {
      const payObj = Array.isArray(orderRow.payments) ? orderRow.payments[0] : orderRow.payments;
      if (payObj) {
        payData = {
          id: payObj.id,
          transactionId: payObj.transaction_id || "PENDING",
          paymentProofUrl: payObj.payment_proof_url || null,
          paymentStatus: payObj.payment_status || "Verification Pending",
          rejectionReason: payObj.rejection_reason || null,
          verifiedAt: payObj.verified_at || null,
          createdAt: payObj.created_at
        };
      }
    }
    const fullOrder = {
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
      notes: orderRow.notes || null,
      createdAt: orderRow.created_at,
      updatedAt: orderRow.updated_at,
      payment: payData,
      items
    };
    return {
      success: true,
      order: fullOrder
    };
  } catch (err) {
    console.error("getAdminOrderDetailServerSide exception:", err);
    return {
      success: false,
      error: err.message || "Server error fetching order details."
    };
  }
}
async function updateOrderStatusServerSide(authHeader, orderId, newStatus) {
  const authCheck = await verifyAdminServerSide(authHeader);
  if (!authCheck.success || !authCheck.isAdmin) {
    return {
      success: false,
      error: authCheck.error || "Unauthorized access: Admin authorization required."
    };
  }
  if (!orderId) {
    return { success: false, error: "Order ID is required." };
  }
  if (!newStatus || !ALLOWED_ORDER_STATUSES.includes(newStatus)) {
    return {
      success: false,
      error: `Invalid status "${newStatus}". Allowed values: ${ALLOWED_ORDER_STATUSES.join(", ")}`
    };
  }
  const supabase2 = getSupabaseServerClient();
  try {
    const { error: updateErr } = await supabase2.from("orders").update({
      status: newStatus,
      updated_at: (/* @__PURE__ */ new Date()).toISOString()
    }).eq("id", orderId);
    if (updateErr) {
      return { success: false, error: `Failed to update status: ${updateErr.message}` };
    }
    return {
      success: true,
      orderId,
      status: newStatus
    };
  } catch (err) {
    console.error("updateOrderStatusServerSide exception:", err);
    return {
      success: false,
      error: err.message || "Server error updating order status."
    };
  }
}
async function verifyPaymentServerSide(authHeader, orderId, action, rejectionReason) {
  const authCheck = await verifyAdminServerSide(authHeader);
  if (!authCheck.success || !authCheck.isAdmin) {
    return {
      success: false,
      error: authCheck.error || "Unauthorized access: Admin authorization required."
    };
  }
  if (!orderId) {
    return { success: false, error: "Order ID is required." };
  }
  if (action !== "verify" && action !== "reject") {
    return { success: false, error: 'Action must be either "verify" or "reject".' };
  }
  const supabase2 = getSupabaseServerClient();
  try {
    const { data: payRow, error: payFetchErr } = await supabase2.from("payments").select("id, payment_status").eq("order_id", orderId).maybeSingle();
    if (payFetchErr) {
      return { success: false, error: `Payment lookup error: ${payFetchErr.message}` };
    }
    let paymentId = payRow?.id;
    if (action === "verify") {
      const nowIso = (/* @__PURE__ */ new Date()).toISOString();
      if (paymentId) {
        const { error: updatePayErr } = await supabase2.from("payments").update({
          payment_status: "Verified",
          verified_at: nowIso,
          rejection_reason: null
        }).eq("id", paymentId);
        if (updatePayErr) {
          return { success: false, error: `Failed to verify payment: ${updatePayErr.message}` };
        }
      } else {
        const { data: newPay, error: insertPayErr } = await supabase2.from("payments").insert({
          order_id: orderId,
          transaction_id: "VERIFIED_BY_ADMIN",
          payment_status: "Verified",
          verified_at: nowIso
        }).select().single();
        if (insertPayErr) {
          return { success: false, error: `Failed to record verified payment: ${insertPayErr.message}` };
        }
        paymentId = newPay.id;
      }
      const { data: orderData } = await supabase2.from("orders").select("status").eq("id", orderId).single();
      let targetOrderStatus = orderData?.status || "Payment Verified";
      if (!orderData || orderData.status === "Pending Payment" || orderData.status === "Verification Pending") {
        targetOrderStatus = "Payment Verified";
        await supabase2.from("orders").update({
          status: targetOrderStatus,
          updated_at: nowIso
        }).eq("id", orderId);
      }
      return {
        success: true,
        orderId,
        paymentStatus: "Verified",
        orderStatus: targetOrderStatus
      };
    } else {
      const reason = rejectionReason?.trim() || "Payment details could not be verified by admin.";
      const nowIso = (/* @__PURE__ */ new Date()).toISOString();
      if (paymentId) {
        const { error: updatePayErr } = await supabase2.from("payments").update({
          payment_status: "Rejected",
          rejection_reason: reason
        }).eq("id", paymentId);
        if (updatePayErr) {
          return { success: false, error: `Failed to reject payment: ${updatePayErr.message}` };
        }
      } else {
        await supabase2.from("payments").insert({
          order_id: orderId,
          transaction_id: "REJECTED_BY_ADMIN",
          payment_status: "Rejected",
          rejection_reason: reason
        });
      }
      const { data: orderData } = await supabase2.from("orders").select("status").eq("id", orderId).single();
      let targetOrderStatus = orderData?.status || "Pending Payment";
      if (orderData && orderData.status === "Verification Pending") {
        targetOrderStatus = "Pending Payment";
        await supabase2.from("orders").update({
          status: targetOrderStatus,
          updated_at: nowIso
        }).eq("id", orderId);
      }
      return {
        success: true,
        orderId,
        paymentStatus: "Rejected",
        orderStatus: targetOrderStatus
      };
    }
  } catch (err) {
    console.error("verifyPaymentServerSide exception:", err);
    return {
      success: false,
      error: err.message || "Server error verifying payment."
    };
  }
}

// src/lib/adminCatalogService.ts
async function processImageUpload(supabase2, imageBase64) {
  let mimeType = "image/jpeg";
  let base64Data = imageBase64;
  if (imageBase64.includes(";base64,")) {
    const parts = imageBase64.split(";base64,");
    const header = parts[0];
    base64Data = parts[1];
    const matches = header.match(/data:(image\/[a-zA-Z0-9\+\-\.]+)/);
    if (matches && matches[1]) {
      mimeType = matches[1];
    }
  }
  const allowedMimeTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
  if (!allowedMimeTypes.includes(mimeType.toLowerCase())) {
    throw new Error("Invalid file format. Please upload a JPEG, PNG, or WebP image.");
  }
  const buffer = Buffer.from(base64Data, "base64");
  const maxSizeBytes = 5 * 1024 * 1024;
  if (buffer.length > maxSizeBytes) {
    throw new Error("Image size exceeds 5MB limit. Please upload a smaller image.");
  }
  const extMap = {
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/png": "png",
    "image/webp": "webp"
  };
  const ext = extMap[mimeType.toLowerCase()] || "jpg";
  const fileName = `product_${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${ext}`;
  const bucketName = "product-images";
  const { error: uploadErr } = await supabase2.storage.from(bucketName).upload(fileName, buffer, {
    contentType: mimeType,
    upsert: true
  });
  if (uploadErr) {
    console.warn("Supabase storage upload warning:", uploadErr.message);
    if (uploadErr.message?.includes("bucket not found") || uploadErr.message?.includes("Bucket")) {
      await supabase2.storage.createBucket(bucketName, { public: true });
      const { error: retryErr } = await supabase2.storage.from(bucketName).upload(fileName, buffer, {
        contentType: mimeType,
        upsert: true
      });
      if (retryErr) throw retryErr;
    } else {
      throw uploadErr;
    }
  }
  const { data: urlData } = supabase2.storage.from(bucketName).getPublicUrl(fileName);
  return urlData?.publicUrl || fileName;
}
async function getAdminProductsServerSide(authHeader) {
  const authCheck = await verifyAdminServerSide(authHeader);
  if (!authCheck.success || !authCheck.isAdmin) {
    return {
      success: false,
      error: authCheck.error || "Unauthorized access: Admin authorization required."
    };
  }
  const supabase2 = getSupabaseServerClient();
  try {
    const { data, error } = await supabase2.from("products").select("*").order("created_at", { ascending: true });
    if (error) {
      return { success: false, error: `Failed to fetch products: ${error.message}` };
    }
    const products = (data || []).map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description || "",
      price: Number(p.price),
      image_url: p.image_url || null,
      stock: p.stock !== null ? Number(p.stock) : null,
      is_available: Boolean(p.is_available),
      created_at: p.created_at,
      updated_at: p.updated_at
    }));
    return { success: true, products };
  } catch (err) {
    console.error("getAdminProductsServerSide exception:", err);
    return { success: false, error: err.message || "Server error fetching products." };
  }
}
async function createProductServerSide(authHeader, payload) {
  const authCheck = await verifyAdminServerSide(authHeader);
  if (!authCheck.success || !authCheck.isAdmin) {
    return {
      success: false,
      error: authCheck.error || "Unauthorized access: Admin authorization required."
    };
  }
  if (!payload || !payload.name?.trim()) {
    return { success: false, error: "Product name is required." };
  }
  if (payload.price === void 0 || payload.price === null || isNaN(payload.price) || payload.price < 0) {
    return { success: false, error: "Product price must be a non-negative number." };
  }
  const supabase2 = getSupabaseServerClient();
  try {
    let finalImageUrl = payload.image_url?.trim() || null;
    if (payload.imageBase64) {
      finalImageUrl = await processImageUpload(supabase2, payload.imageBase64);
    }
    const { data, error } = await supabase2.from("products").insert({
      name: payload.name.trim(),
      description: payload.description?.trim() || null,
      price: payload.price,
      image_url: finalImageUrl,
      stock: payload.stock !== void 0 ? payload.stock : null,
      is_available: payload.is_available !== void 0 ? payload.is_available : true
    }).select().single();
    if (error) {
      return { success: false, error: `Failed to create product: ${error.message}` };
    }
    return {
      success: true,
      id: data.id,
      message: `Product "${data.name}" created successfully.`
    };
  } catch (err) {
    console.error("createProductServerSide exception:", err);
    return { success: false, error: err.message || "Server error creating product." };
  }
}
async function updateProductServerSide(authHeader, productId, payload) {
  const authCheck = await verifyAdminServerSide(authHeader);
  if (!authCheck.success || !authCheck.isAdmin) {
    return {
      success: false,
      error: authCheck.error || "Unauthorized access: Admin authorization required."
    };
  }
  if (!productId) {
    return { success: false, error: "Product ID is required." };
  }
  const updateFields = {
    updated_at: (/* @__PURE__ */ new Date()).toISOString()
  };
  if (payload?.name !== void 0) {
    if (!payload.name.trim()) {
      return { success: false, error: "Product name cannot be empty." };
    }
    updateFields.name = payload.name.trim();
  }
  if (payload?.description !== void 0) {
    updateFields.description = payload.description.trim() || null;
  }
  if (payload?.stock !== void 0) {
    updateFields.stock = payload.stock;
  }
  if (payload?.price !== void 0) {
    if (isNaN(payload.price) || payload.price < 0) {
      return { success: false, error: "Product price must be a non-negative number." };
    }
    updateFields.price = payload.price;
  }
  if (payload?.image_url !== void 0) {
    updateFields.image_url = payload.image_url?.trim() || null;
  }
  if (payload?.is_available !== void 0) {
    updateFields.is_available = Boolean(payload.is_available);
  }
  const supabase2 = getSupabaseServerClient();
  try {
    if (payload?.imageBase64) {
      updateFields.image_url = await processImageUpload(supabase2, payload.imageBase64);
    }
    const { error } = await supabase2.from("products").update(updateFields).eq("id", productId);
    if (error) {
      return { success: false, error: `Failed to update product: ${error.message}` };
    }
    return {
      success: true,
      id: productId,
      message: "Product updated successfully."
    };
  } catch (err) {
    console.error("updateProductServerSide exception:", err);
    return { success: false, error: err.message || "Server error updating product." };
  }
}
async function getAdminToppingsServerSide(authHeader) {
  const authCheck = await verifyAdminServerSide(authHeader);
  if (!authCheck.success || !authCheck.isAdmin) {
    return {
      success: false,
      error: authCheck.error || "Unauthorized access: Admin authorization required."
    };
  }
  const supabase2 = getSupabaseServerClient();
  try {
    const { data, error } = await supabase2.from("toppings").select("*").order("created_at", { ascending: true });
    if (error) {
      return { success: false, error: `Failed to fetch toppings: ${error.message}` };
    }
    const toppings = (data || []).map((t) => ({
      id: t.id,
      name: t.name,
      is_enabled: Boolean(t.is_enabled),
      created_at: t.created_at
    }));
    return { success: true, toppings };
  } catch (err) {
    console.error("getAdminToppingsServerSide exception:", err);
    return { success: false, error: err.message || "Server error fetching toppings." };
  }
}
async function createToppingServerSide(authHeader, payload) {
  const authCheck = await verifyAdminServerSide(authHeader);
  if (!authCheck.success || !authCheck.isAdmin) {
    return {
      success: false,
      error: authCheck.error || "Unauthorized access: Admin authorization required."
    };
  }
  if (!payload || !payload.name?.trim()) {
    return { success: false, error: "Topping name is required." };
  }
  const supabase2 = getSupabaseServerClient();
  try {
    const { data, error } = await supabase2.from("toppings").insert({
      name: payload.name.trim(),
      is_enabled: payload.is_enabled !== void 0 ? payload.is_enabled : true
    }).select().single();
    if (error) {
      return { success: false, error: `Failed to create topping: ${error.message}` };
    }
    return {
      success: true,
      id: data.id,
      message: `Topping "${data.name}" created successfully.`
    };
  } catch (err) {
    console.error("createToppingServerSide exception:", err);
    return { success: false, error: err.message || "Server error creating topping." };
  }
}
async function updateToppingServerSide(authHeader, toppingId, payload) {
  const authCheck = await verifyAdminServerSide(authHeader);
  if (!authCheck.success || !authCheck.isAdmin) {
    return {
      success: false,
      error: authCheck.error || "Unauthorized access: Admin authorization required."
    };
  }
  if (!toppingId) {
    return { success: false, error: "Topping ID is required." };
  }
  const updateFields = {};
  if (payload?.name !== void 0) {
    if (!payload.name.trim()) {
      return { success: false, error: "Topping name cannot be empty." };
    }
    updateFields.name = payload.name.trim();
  }
  if (payload?.is_enabled !== void 0) {
    updateFields.is_enabled = Boolean(payload.is_enabled);
  }
  if (Object.keys(updateFields).length === 0) {
    return { success: false, error: "No fields provided to update." };
  }
  const supabase2 = getSupabaseServerClient();
  try {
    const { error } = await supabase2.from("toppings").update(updateFields).eq("id", toppingId);
    if (error) {
      return { success: false, error: `Failed to update topping: ${error.message}` };
    }
    return {
      success: true,
      id: toppingId,
      message: "Topping updated successfully."
    };
  } catch (err) {
    console.error("updateToppingServerSide exception:", err);
    return { success: false, error: err.message || "Server error updating topping." };
  }
}
async function getProductToppingsServerSide(authHeader, productId) {
  const authCheck = await verifyAdminServerSide(authHeader);
  if (!authCheck.success || !authCheck.isAdmin) {
    return {
      success: false,
      error: authCheck.error || "Unauthorized access: Admin authorization required."
    };
  }
  if (!productId) {
    return { success: false, error: "Product ID is required." };
  }
  const supabase2 = getSupabaseServerClient();
  try {
    const { data, error } = await supabase2.from("product_toppings").select("topping_id").eq("product_id", productId);
    if (error) {
      return { success: false, error: `Failed to fetch product toppings: ${error.message}` };
    }
    const toppingIds = (data || []).map((row) => row.topping_id);
    return { success: true, toppingIds };
  } catch (err) {
    console.error("getProductToppingsServerSide exception:", err);
    return { success: false, error: err.message || "Server error fetching product toppings." };
  }
}
async function updateProductToppingsServerSide(authHeader, productId, toppingIds) {
  const authCheck = await verifyAdminServerSide(authHeader);
  if (!authCheck.success || !authCheck.isAdmin) {
    return {
      success: false,
      error: authCheck.error || "Unauthorized access: Admin authorization required."
    };
  }
  if (!productId) {
    return { success: false, error: "Product ID is required." };
  }
  const validToppingIds = Array.isArray(toppingIds) ? toppingIds.filter((id) => Boolean(id)) : [];
  const supabase2 = getSupabaseServerClient();
  try {
    const { error: delErr } = await supabase2.from("product_toppings").delete().eq("product_id", productId);
    if (delErr) {
      return { success: false, error: `Failed to clear existing toppings: ${delErr.message}` };
    }
    if (validToppingIds.length > 0) {
      const rowsToInsert = validToppingIds.map((tid) => ({
        product_id: productId,
        topping_id: tid
      }));
      const { error: insErr } = await supabase2.from("product_toppings").insert(rowsToInsert);
      if (insErr) {
        return { success: false, error: `Failed to link new toppings: ${insErr.message}` };
      }
    }
    return {
      success: true,
      id: productId,
      message: "Product topping relationships updated successfully."
    };
  } catch (err) {
    console.error("updateProductToppingsServerSide exception:", err);
    return { success: false, error: err.message || "Server error updating product toppings." };
  }
}
async function getProductPricingServerSide(authHeader, productId) {
  const authCheck = await verifyAdminServerSide(authHeader);
  if (!authCheck.success || !authCheck.isAdmin) {
    return {
      success: false,
      error: authCheck.error || "Unauthorized access: Admin authorization required."
    };
  }
  if (!productId) {
    return { success: false, error: "Product ID is required." };
  }
  const supabase2 = getSupabaseServerClient();
  try {
    const { data, error } = await supabase2.from("topping_pricing").select("*").eq("product_id", productId).order("topping_count", { ascending: true });
    if (error) {
      return { success: false, error: `Failed to fetch pricing rules: ${error.message}` };
    }
    const pricingRules = (data || []).map((p) => ({
      id: p.id,
      product_id: p.product_id,
      topping_count: Number(p.topping_count),
      extra_price: Number(p.extra_price)
    }));
    return { success: true, pricingRules };
  } catch (err) {
    console.error("getProductPricingServerSide exception:", err);
    return { success: false, error: err.message || "Server error fetching pricing rules." };
  }
}
async function updateProductPricingServerSide(authHeader, productId, rules) {
  const authCheck = await verifyAdminServerSide(authHeader);
  if (!authCheck.success || !authCheck.isAdmin) {
    return {
      success: false,
      error: authCheck.error || "Unauthorized access: Admin authorization required."
    };
  }
  if (!productId) {
    return { success: false, error: "Product ID is required." };
  }
  const validRules = Array.isArray(rules) ? rules : [];
  for (const r of validRules) {
    if (!r.topping_count || isNaN(r.topping_count) || r.topping_count <= 0) {
      return { success: false, error: "Topping count must be a positive integer greater than 0." };
    }
    if (r.extra_price === void 0 || isNaN(r.extra_price) || r.extra_price < 0) {
      return { success: false, error: "Extra price must be a non-negative number." };
    }
  }
  const supabase2 = getSupabaseServerClient();
  try {
    const { error: delErr } = await supabase2.from("topping_pricing").delete().eq("product_id", productId);
    if (delErr) {
      return { success: false, error: `Failed to clear existing pricing rules: ${delErr.message}` };
    }
    if (validRules.length > 0) {
      const rowsToInsert = validRules.map((r) => ({
        product_id: productId,
        topping_count: r.topping_count,
        extra_price: r.extra_price
      }));
      const { error: insErr } = await supabase2.from("topping_pricing").insert(rowsToInsert);
      if (insErr) {
        return { success: false, error: `Failed to insert pricing rules: ${insErr.message}` };
      }
    }
    return {
      success: true,
      id: productId,
      message: "Product topping pricing rules updated successfully."
    };
  } catch (err) {
    console.error("updateProductPricingServerSide exception:", err);
    return { success: false, error: err.message || "Server error updating pricing rules." };
  }
}

// src/lib/adminSettingsService.ts
async function getAdminSettingsServerSide(authHeader) {
  const authCheck = await verifyAdminServerSide(authHeader);
  if (!authCheck.success || !authCheck.isAdmin) {
    return {
      success: false,
      error: authCheck.error || "Unauthorized access: Admin authorization required."
    };
  }
  const supabase2 = getSupabaseServerClient();
  try {
    const { data, error } = await supabase2.from("admin_settings").select("*").eq("id", 1).single();
    if (error || !data) {
      return { success: false, error: `Failed to fetch admin settings: ${error?.message || "Row not found"}` };
    }
    const deliveryFee = Number(data.delivery_fee);
    const settings = {
      id: 1,
      easypaisa_number: data.easypaisa_number || "03402694079",
      easypaisa_account_title: data.easypaisa_account_title || "KASHMENA",
      whatsapp_number: data.whatsapp_number || "923000000000",
      delivery_fee: isNaN(deliveryFee) ? 100 : deliveryFee,
      stall_location: data.stall_location || "Karachi, Pakistan",
      opening_hours: data.opening_hours || "4:00 PM - 12:00 AM",
      is_taking_orders: Boolean(data.is_taking_orders),
      updated_at: data.updated_at
    };
    return { success: true, settings };
  } catch (err) {
    console.error("getAdminSettingsServerSide exception:", err);
    return { success: false, error: err.message || "Server error fetching admin settings." };
  }
}
async function updateAdminSettingsServerSide(authHeader, payload) {
  const authCheck = await verifyAdminServerSide(authHeader);
  if (!authCheck.success || !authCheck.isAdmin) {
    return {
      success: false,
      error: authCheck.error || "Unauthorized access: Admin authorization required."
    };
  }
  if (!payload) {
    return { success: false, error: "No update fields provided." };
  }
  const updateFields = {
    updated_at: (/* @__PURE__ */ new Date()).toISOString()
  };
  if (payload.delivery_fee !== void 0) {
    const fee = Number(payload.delivery_fee);
    if (isNaN(fee) || fee < 0) {
      return { success: false, error: "Delivery fee must be a non-negative number." };
    }
    updateFields.delivery_fee = fee;
  }
  if (payload.easypaisa_number !== void 0) {
    const epNum = payload.easypaisa_number.trim();
    if (!epNum || epNum.length < 8) {
      return { success: false, error: "Please enter a valid EasyPaisa account number." };
    }
    updateFields.easypaisa_number = epNum;
  }
  if (payload.easypaisa_account_title !== void 0) {
    const epTitle = payload.easypaisa_account_title.trim();
    if (!epTitle) {
      return { success: false, error: "EasyPaisa account title cannot be empty." };
    }
    updateFields.easypaisa_account_title = epTitle;
  }
  if (payload.whatsapp_number !== void 0) {
    const waNum = payload.whatsapp_number.trim().replace(/\D/g, "");
    if (!waNum || waNum.length < 10) {
      return { success: false, error: "Please enter a valid WhatsApp Business number (minimum 10 digits)." };
    }
    updateFields.whatsapp_number = waNum;
  }
  if (payload.is_taking_orders !== void 0) {
    updateFields.is_taking_orders = Boolean(payload.is_taking_orders);
  }
  if (payload.stall_location !== void 0) {
    updateFields.stall_location = payload.stall_location.trim() || "Karachi, Pakistan";
  }
  if (payload.opening_hours !== void 0) {
    updateFields.opening_hours = payload.opening_hours.trim() || "4:00 PM - 12:00 AM";
  }
  const supabase2 = getSupabaseServerClient();
  try {
    const { data, error } = await supabase2.from("admin_settings").update(updateFields).eq("id", 1).select().single();
    if (error || !data) {
      return { success: false, error: `Failed to update admin settings: ${error?.message || "Row not updated"}` };
    }
    const deliveryFee = Number(data.delivery_fee);
    const updatedSettings = {
      id: 1,
      easypaisa_number: data.easypaisa_number,
      easypaisa_account_title: data.easypaisa_account_title,
      whatsapp_number: data.whatsapp_number,
      delivery_fee: isNaN(deliveryFee) ? 100 : deliveryFee,
      stall_location: data.stall_location,
      opening_hours: data.opening_hours,
      is_taking_orders: Boolean(data.is_taking_orders),
      updated_at: data.updated_at
    };
    return {
      success: true,
      settings: updatedSettings,
      message: "Business settings updated successfully."
    };
  } catch (err) {
    console.error("updateAdminSettingsServerSide exception:", err);
    return { success: false, error: err.message || "Server error updating admin settings." };
  }
}

// src/server/app.ts
import express from "express";
import dotenv from "dotenv";
dotenv.config();
var app = express();
app.use(express.json({ limit: "10mb" }));
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    app: "Mina Cafe Karachi",
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  });
});
app.get("/api/products", async (_req, res) => {
  try {
    const result = await fetchProductsFromSupabase();
    res.json(result);
  } catch (error) {
    res.status(500).json({
      products: [],
      error: error.message || "Server error reading products from database",
      isConfigured: false
    });
  }
});
app.get("/api/settings", async (_req, res) => {
  try {
    const result = await fetchAdminSettings();
    res.json(result);
  } catch (error) {
    res.status(500).json({
      settings: null,
      deliveryFee: 100,
      error: error.message || "Server error fetching settings"
    });
  }
});
app.post("/api/orders", async (req, res) => {
  try {
    const result = await createOrderServerSide(req.body);
    if (!result.success) {
      res.status(400).json(result);
      return;
    }
    res.status(201).json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || "An unexpected error occurred while processing your order."
    });
  }
});
app.post("/api/payments/submit", async (req, res) => {
  try {
    const result = await submitPaymentServerSide(req.body);
    if (!result.success) {
      res.status(400).json(result);
      return;
    }
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || "An unexpected error occurred while submitting payment."
    });
  }
});
app.get("/api/orders/track/:trackingToken", async (req, res) => {
  try {
    const { trackingToken } = req.params;
    const result = await getTrackingOrderServerSide(trackingToken);
    if (!result.success) {
      res.status(404).json(result);
      return;
    }
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || "An error occurred while tracking the order."
    });
  }
});
app.get("/api/admin/verify", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const result = await verifyAdminServerSide(authHeader);
    if (!result.success || !result.isAdmin) {
      res.status(401).json(result);
      return;
    }
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      isAdmin: false,
      error: error.message || "An unexpected error occurred during admin verification."
    });
  }
});
app.get("/api/admin/orders", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const { search, status, paymentStatus } = req.query;
    const result = await getAdminOrdersServerSide(authHeader, {
      search: typeof search === "string" ? search : void 0,
      status: typeof status === "string" ? status : void 0,
      paymentStatus: typeof paymentStatus === "string" ? paymentStatus : void 0
    });
    if (!result.success) {
      res.status(result.error?.includes("Unauthorized") ? 401 : 400).json(result);
      return;
    }
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || "Error retrieving admin orders list."
    });
  }
});
app.get("/api/admin/orders/:id", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const { id } = req.params;
    const result = await getAdminOrderDetailServerSide(authHeader, id);
    if (!result.success) {
      res.status(result.error?.includes("Unauthorized") ? 401 : 404).json(result);
      return;
    }
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || "Error retrieving order detail."
    });
  }
});
app.put("/api/admin/orders/:id/status", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const { id } = req.params;
    const { status } = req.body;
    const result = await updateOrderStatusServerSide(authHeader, id, status);
    if (!result.success) {
      res.status(result.error?.includes("Unauthorized") ? 401 : 400).json(result);
      return;
    }
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || "Error updating order status."
    });
  }
});
app.put("/api/admin/payments/:orderId/verify", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const { orderId } = req.params;
    const { action, rejectionReason } = req.body;
    const result = await verifyPaymentServerSide(authHeader, orderId, action, rejectionReason);
    if (!result.success) {
      res.status(result.error?.includes("Unauthorized") ? 401 : 400).json(result);
      return;
    }
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || "Error processing payment verification."
    });
  }
});
app.get("/api/admin/catalog/products", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const result = await getAdminProductsServerSide(authHeader);
    if (!result.success) {
      res.status(result.error?.includes("Unauthorized") ? 401 : 400).json(result);
      return;
    }
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message || "Server error fetching products." });
  }
});
app.post("/api/admin/catalog/products", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const result = await createProductServerSide(authHeader, req.body);
    if (!result.success) {
      res.status(result.error?.includes("Unauthorized") ? 401 : 400).json(result);
      return;
    }
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message || "Server error creating product." });
  }
});
app.put("/api/admin/catalog/products/:id", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const { id } = req.params;
    const result = await updateProductServerSide(authHeader, id, req.body);
    if (!result.success) {
      res.status(result.error?.includes("Unauthorized") ? 401 : 400).json(result);
      return;
    }
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message || "Server error updating product." });
  }
});
app.get("/api/admin/catalog/toppings", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const result = await getAdminToppingsServerSide(authHeader);
    if (!result.success) {
      res.status(result.error?.includes("Unauthorized") ? 401 : 400).json(result);
      return;
    }
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message || "Server error fetching toppings." });
  }
});
app.post("/api/admin/catalog/toppings", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const result = await createToppingServerSide(authHeader, req.body);
    if (!result.success) {
      res.status(result.error?.includes("Unauthorized") ? 401 : 400).json(result);
      return;
    }
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message || "Server error creating topping." });
  }
});
app.put("/api/admin/catalog/toppings/:id", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const { id } = req.params;
    const result = await updateToppingServerSide(authHeader, id, req.body);
    if (!result.success) {
      res.status(result.error?.includes("Unauthorized") ? 401 : 400).json(result);
      return;
    }
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message || "Server error updating topping." });
  }
});
app.get("/api/admin/catalog/products/:id/toppings", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const { id } = req.params;
    const result = await getProductToppingsServerSide(authHeader, id);
    if (!result.success) {
      res.status(result.error?.includes("Unauthorized") ? 401 : 400).json(result);
      return;
    }
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message || "Server error fetching product toppings." });
  }
});
app.put("/api/admin/catalog/products/:id/toppings", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const { id } = req.params;
    const { toppingIds } = req.body;
    const result = await updateProductToppingsServerSide(authHeader, id, toppingIds);
    if (!result.success) {
      res.status(result.error?.includes("Unauthorized") ? 401 : 400).json(result);
      return;
    }
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message || "Server error updating product toppings." });
  }
});
app.get("/api/admin/catalog/products/:id/pricing", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const { id } = req.params;
    const result = await getProductPricingServerSide(authHeader, id);
    if (!result.success) {
      res.status(result.error?.includes("Unauthorized") ? 401 : 400).json(result);
      return;
    }
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message || "Server error fetching product pricing." });
  }
});
app.put("/api/admin/catalog/products/:id/pricing", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const { id } = req.params;
    const { rules } = req.body;
    const result = await updateProductPricingServerSide(authHeader, id, rules);
    if (!result.success) {
      res.status(result.error?.includes("Unauthorized") ? 401 : 400).json(result);
      return;
    }
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message || "Server error updating product pricing." });
  }
});
app.get("/api/admin/settings", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const result = await getAdminSettingsServerSide(authHeader);
    if (!result.success) {
      res.status(result.error?.includes("Unauthorized") ? 401 : 400).json(result);
      return;
    }
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message || "Server error fetching admin settings." });
  }
});
app.put("/api/admin/settings", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const result = await updateAdminSettingsServerSide(authHeader, req.body);
    if (!result.success) {
      res.status(result.error?.includes("Unauthorized") ? 401 : 400).json(result);
      return;
    }
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message || "Server error updating admin settings." });
  }
});
var app_default = app;
export {
  app_default as default
};
