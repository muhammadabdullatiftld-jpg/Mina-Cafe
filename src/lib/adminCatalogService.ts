import { verifyAdminServerSide } from './adminAuthService.js';
import { getSupabaseServerClient } from './supabaseServer.js';
import { Product, Topping, ProductTopping, ToppingPricing } from '../types/index.js';

export interface AdminProductsResult {
  success: boolean;
  products?: Product[];
  error?: string;
}

export interface AdminToppingsResult {
  success: boolean;
  toppings?: Topping[];
  error?: string;
}

export interface AdminProductToppingsResult {
  success: boolean;
  toppingIds?: string[];
  error?: string;
}

export interface AdminToppingPricingResult {
  success: boolean;
  pricingRules?: ToppingPricing[];
  error?: string;
}

export interface AdminMutationResult {
  success: boolean;
  id?: string;
  error?: string;
  message?: string;
}

// ==========================================
// 1. PRODUCT MANAGEMENT SERVER-SIDE APIs
// ==========================================

async function processImageUpload(supabase: any, imageBase64: string): Promise<string> {
  let mimeType = 'image/jpeg';
  let base64Data = imageBase64;

  if (imageBase64.includes(';base64,')) {
    const parts = imageBase64.split(';base64,');
    const header = parts[0];
    base64Data = parts[1];
    const matches = header.match(/data:(image\/[a-zA-Z0-9\+\-\.]+)/);
    if (matches && matches[1]) {
      mimeType = matches[1];
    }
  }

  const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (!allowedMimeTypes.includes(mimeType.toLowerCase())) {
    throw new Error('Invalid file format. Please upload a JPEG, PNG, or WebP image.');
  }

  const buffer = Buffer.from(base64Data, 'base64');
  const maxSizeBytes = 5 * 1024 * 1024; // 5 MB
  if (buffer.length > maxSizeBytes) {
    throw new Error('Image size exceeds 5MB limit. Please upload a smaller image.');
  }

  const extMap: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
  };
  const ext = extMap[mimeType.toLowerCase()] || 'jpg';
  const fileName = `product_${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${ext}`;

  const bucketName = 'product-images';

  const { error: uploadErr } = await supabase.storage
    .from(bucketName)
    .upload(fileName, buffer, {
      contentType: mimeType,
      upsert: true,
    });

  if (uploadErr) {
    console.warn('Supabase storage upload warning:', uploadErr.message);
    if (uploadErr.message?.includes('bucket not found') || uploadErr.message?.includes('Bucket')) {
      await supabase.storage.createBucket(bucketName, { public: true });
      const { error: retryErr } = await supabase.storage
        .from(bucketName)
        .upload(fileName, buffer, {
          contentType: mimeType,
          upsert: true,
        });
      if (retryErr) throw retryErr;
    } else {
      throw uploadErr;
    }
  }

  const { data: urlData } = supabase.storage.from(bucketName).getPublicUrl(fileName);
  return urlData?.publicUrl || fileName;
}

/**
 * Fetch all products for admin (including both available and disabled products).
 */
export async function getAdminProductsServerSide(authHeader?: string): Promise<AdminProductsResult> {
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
      .from('products')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      return { success: false, error: `Failed to fetch products: ${error.message}` };
    }

    const products: Product[] = (data || []).map((p: any) => ({
      id: p.id,
      name: p.name,
      description: p.description || '',
      price: Number(p.price),
      image_url: p.image_url || null,
      stock: p.stock !== null ? Number(p.stock) : null,
      is_available: Boolean(p.is_available),
      created_at: p.created_at,
      updated_at: p.updated_at,
    }));

    return { success: true, products };
  } catch (err: any) {
    console.error('getAdminProductsServerSide exception:', err);
    return { success: false, error: err.message || 'Server error fetching products.' };
  }
}

/**
 * Create a new product.
 */
export async function createProductServerSide(
  authHeader?: string,
  payload?: {
    name: string;
    description?: string;
    price: number;
    image_url?: string | null;
    imageBase64?: string | null;
    stock?: number | null;
    is_available?: boolean;
  }
): Promise<AdminMutationResult> {
  const authCheck = await verifyAdminServerSide(authHeader);
  if (!authCheck.success || !authCheck.isAdmin) {
    return {
      success: false,
      error: authCheck.error || 'Unauthorized access: Admin authorization required.',
    };
  }

  if (!payload || !payload.name?.trim()) {
    return { success: false, error: 'Product name is required.' };
  }

  if (payload.price === undefined || payload.price === null || isNaN(payload.price) || payload.price < 0) {
    return { success: false, error: 'Product price must be a non-negative number.' };
  }

  const supabase = getSupabaseServerClient();

  try {
    let finalImageUrl = payload.image_url?.trim() || null;
    if (payload.imageBase64) {
      finalImageUrl = await processImageUpload(supabase, payload.imageBase64);
    }

    const { data, error } = await supabase
      .from('products')
      .insert({
        name: payload.name.trim(),
        description: payload.description?.trim() || null,
        price: payload.price,
        image_url: finalImageUrl,
        stock: payload.stock !== undefined ? payload.stock : null,
        is_available: payload.is_available !== undefined ? payload.is_available : true,
      })
      .select()
      .single();

    if (error) {
      return { success: false, error: `Failed to create product: ${error.message}` };
    }

    return {
      success: true,
      id: data.id,
      message: `Product "${data.name}" created successfully.`,
    };
  } catch (err: any) {
    console.error('createProductServerSide exception:', err);
    return { success: false, error: err.message || 'Server error creating product.' };
  }
}

/**
 * Update an existing product.
 */
export async function updateProductServerSide(
  authHeader?: string,
  productId?: string,
  payload?: {
    name?: string;
    description?: string;
    price?: number;
    image_url?: string | null;
    imageBase64?: string | null;
    stock?: number | null;
    is_available?: boolean;
  }
): Promise<AdminMutationResult> {
  const authCheck = await verifyAdminServerSide(authHeader);
  if (!authCheck.success || !authCheck.isAdmin) {
    return {
      success: false,
      error: authCheck.error || 'Unauthorized access: Admin authorization required.',
    };
  }

  if (!productId) {
    return { success: false, error: 'Product ID is required.' };
  }

  const updateFields: Record<string, any> = {
    updated_at: new Date().toISOString(),
  };

  if (payload?.name !== undefined) {
    if (!payload.name.trim()) {
      return { success: false, error: 'Product name cannot be empty.' };
    }
    updateFields.name = payload.name.trim();
  }

  if (payload?.description !== undefined) {
    updateFields.description = payload.description.trim() || null;
  }

  if (payload?.stock !== undefined) {
    updateFields.stock = payload.stock;
  }

  if (payload?.price !== undefined) {
    if (isNaN(payload.price) || payload.price < 0) {
      return { success: false, error: 'Product price must be a non-negative number.' };
    }
    updateFields.price = payload.price;
  }

  if (payload?.image_url !== undefined) {
    updateFields.image_url = payload.image_url?.trim() || null;
  }

  if (payload?.is_available !== undefined) {
    updateFields.is_available = Boolean(payload.is_available);
  }

  const supabase = getSupabaseServerClient();

  try {
    if (payload?.imageBase64) {
      updateFields.image_url = await processImageUpload(supabase, payload.imageBase64);
    }

    const { error } = await supabase
      .from('products')
      .update(updateFields)
      .eq('id', productId);

    if (error) {
      return { success: false, error: `Failed to update product: ${error.message}` };
    }

    return {
      success: true,
      id: productId,
      message: 'Product updated successfully.',
    };
  } catch (err: any) {
    console.error('updateProductServerSide exception:', err);
    return { success: false, error: err.message || 'Server error updating product.' };
  }
}

// ==========================================
// 2. TOPPING MANAGEMENT SERVER-SIDE APIs
// ==========================================

/**
 * Fetch all toppings for admin.
 */
export async function getAdminToppingsServerSide(authHeader?: string): Promise<AdminToppingsResult> {
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
      .from('toppings')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      return { success: false, error: `Failed to fetch toppings: ${error.message}` };
    }

    const toppings: Topping[] = (data || []).map((t: any) => ({
      id: t.id,
      name: t.name,
      is_enabled: Boolean(t.is_enabled),
      created_at: t.created_at,
    }));

    return { success: true, toppings };
  } catch (err: any) {
    console.error('getAdminToppingsServerSide exception:', err);
    return { success: false, error: err.message || 'Server error fetching toppings.' };
  }
}

/**
 * Create a new topping.
 */
export async function createToppingServerSide(
  authHeader?: string,
  payload?: {
    name: string;
    is_enabled?: boolean;
  }
): Promise<AdminMutationResult> {
  const authCheck = await verifyAdminServerSide(authHeader);
  if (!authCheck.success || !authCheck.isAdmin) {
    return {
      success: false,
      error: authCheck.error || 'Unauthorized access: Admin authorization required.',
    };
  }

  if (!payload || !payload.name?.trim()) {
    return { success: false, error: 'Topping name is required.' };
  }

  const supabase = getSupabaseServerClient();

  try {
    const { data, error } = await supabase
      .from('toppings')
      .insert({
        name: payload.name.trim(),
        is_enabled: payload.is_enabled !== undefined ? payload.is_enabled : true,
      })
      .select()
      .single();

    if (error) {
      return { success: false, error: `Failed to create topping: ${error.message}` };
    }

    return {
      success: true,
      id: data.id,
      message: `Topping "${data.name}" created successfully.`,
    };
  } catch (err: any) {
    console.error('createToppingServerSide exception:', err);
    return { success: false, error: err.message || 'Server error creating topping.' };
  }
}

/**
 * Update an existing topping.
 */
export async function updateToppingServerSide(
  authHeader?: string,
  toppingId?: string,
  payload?: {
    name?: string;
    is_enabled?: boolean;
  }
): Promise<AdminMutationResult> {
  const authCheck = await verifyAdminServerSide(authHeader);
  if (!authCheck.success || !authCheck.isAdmin) {
    return {
      success: false,
      error: authCheck.error || 'Unauthorized access: Admin authorization required.',
    };
  }

  if (!toppingId) {
    return { success: false, error: 'Topping ID is required.' };
  }

  const updateFields: Record<string, any> = {};

  if (payload?.name !== undefined) {
    if (!payload.name.trim()) {
      return { success: false, error: 'Topping name cannot be empty.' };
    }
    updateFields.name = payload.name.trim();
  }

  if (payload?.is_enabled !== undefined) {
    updateFields.is_enabled = Boolean(payload.is_enabled);
  }

  if (Object.keys(updateFields).length === 0) {
    return { success: false, error: 'No fields provided to update.' };
  }

  const supabase = getSupabaseServerClient();

  try {
    const { error } = await supabase
      .from('toppings')
      .update(updateFields)
      .eq('id', toppingId);

    if (error) {
      return { success: false, error: `Failed to update topping: ${error.message}` };
    }

    return {
      success: true,
      id: toppingId,
      message: 'Topping updated successfully.',
    };
  } catch (err: any) {
    console.error('updateToppingServerSide exception:', err);
    return { success: false, error: err.message || 'Server error updating topping.' };
  }
}

// ==========================================
// 3. PRODUCT-TOPPING RELATIONSHIPS
// ==========================================

/**
 * Get linked topping IDs for a product.
 */
export async function getProductToppingsServerSide(
  authHeader?: string,
  productId?: string
): Promise<AdminProductToppingsResult> {
  const authCheck = await verifyAdminServerSide(authHeader);
  if (!authCheck.success || !authCheck.isAdmin) {
    return {
      success: false,
      error: authCheck.error || 'Unauthorized access: Admin authorization required.',
    };
  }

  if (!productId) {
    return { success: false, error: 'Product ID is required.' };
  }

  const supabase = getSupabaseServerClient();

  try {
    const { data, error } = await supabase
      .from('product_toppings')
      .select('topping_id')
      .eq('product_id', productId);

    if (error) {
      return { success: false, error: `Failed to fetch product toppings: ${error.message}` };
    }

    const toppingIds = (data || []).map((row: any) => row.topping_id);
    return { success: true, toppingIds };
  } catch (err: any) {
    console.error('getProductToppingsServerSide exception:', err);
    return { success: false, error: err.message || 'Server error fetching product toppings.' };
  }
}

/**
 * Update linked toppings for a product.
 */
export async function updateProductToppingsServerSide(
  authHeader?: string,
  productId?: string,
  toppingIds?: string[]
): Promise<AdminMutationResult> {
  const authCheck = await verifyAdminServerSide(authHeader);
  if (!authCheck.success || !authCheck.isAdmin) {
    return {
      success: false,
      error: authCheck.error || 'Unauthorized access: Admin authorization required.',
    };
  }

  if (!productId) {
    return { success: false, error: 'Product ID is required.' };
  }

  const validToppingIds = Array.isArray(toppingIds) ? toppingIds.filter((id) => Boolean(id)) : [];

  const supabase = getSupabaseServerClient();

  try {
    // 1. Delete existing connections for product_id
    const { error: delErr } = await supabase
      .from('product_toppings')
      .delete()
      .eq('product_id', productId);

    if (delErr) {
      return { success: false, error: `Failed to clear existing toppings: ${delErr.message}` };
    }

    // 2. Insert new connections
    if (validToppingIds.length > 0) {
      const rowsToInsert = validToppingIds.map((tid) => ({
        product_id: productId,
        topping_id: tid,
      }));

      const { error: insErr } = await supabase.from('product_toppings').insert(rowsToInsert);

      if (insErr) {
        return { success: false, error: `Failed to link new toppings: ${insErr.message}` };
      }
    }

    return {
      success: true,
      id: productId,
      message: 'Product topping relationships updated successfully.',
    };
  } catch (err: any) {
    console.error('updateProductToppingsServerSide exception:', err);
    return { success: false, error: err.message || 'Server error updating product toppings.' };
  }
}

// ==========================================
// 4. TOPPING PRICING MANAGEMENT
// ==========================================

/**
 * Get topping pricing rules for a product.
 */
export async function getProductPricingServerSide(
  authHeader?: string,
  productId?: string
): Promise<AdminToppingPricingResult> {
  const authCheck = await verifyAdminServerSide(authHeader);
  if (!authCheck.success || !authCheck.isAdmin) {
    return {
      success: false,
      error: authCheck.error || 'Unauthorized access: Admin authorization required.',
    };
  }

  if (!productId) {
    return { success: false, error: 'Product ID is required.' };
  }

  const supabase = getSupabaseServerClient();

  try {
    const { data, error } = await supabase
      .from('topping_pricing')
      .select('*')
      .eq('product_id', productId)
      .order('topping_count', { ascending: true });

    if (error) {
      return { success: false, error: `Failed to fetch pricing rules: ${error.message}` };
    }

    const pricingRules: ToppingPricing[] = (data || []).map((p: any) => ({
      id: p.id,
      product_id: p.product_id,
      topping_count: Number(p.topping_count),
      extra_price: Number(p.extra_price),
    }));

    return { success: true, pricingRules };
  } catch (err: any) {
    console.error('getProductPricingServerSide exception:', err);
    return { success: false, error: err.message || 'Server error fetching pricing rules.' };
  }
}

/**
 * Update topping pricing rules for a product.
 * Expects an array of rules: [{ topping_count: 1, extra_price: 0 }, { topping_count: 3, extra_price: 100 }]
 */
export async function updateProductPricingServerSide(
  authHeader?: string,
  productId?: string,
  rules?: { topping_count: number; extra_price: number }[]
): Promise<AdminMutationResult> {
  const authCheck = await verifyAdminServerSide(authHeader);
  if (!authCheck.success || !authCheck.isAdmin) {
    return {
      success: false,
      error: authCheck.error || 'Unauthorized access: Admin authorization required.',
    };
  }

  if (!productId) {
    return { success: false, error: 'Product ID is required.' };
  }

  const validRules = Array.isArray(rules) ? rules : [];

  // Validate rule structure
  for (const r of validRules) {
    if (!r.topping_count || isNaN(r.topping_count) || r.topping_count <= 0) {
      return { success: false, error: 'Topping count must be a positive integer greater than 0.' };
    }
    if (r.extra_price === undefined || isNaN(r.extra_price) || r.extra_price < 0) {
      return { success: false, error: 'Extra price must be a non-negative number.' };
    }
  }

  const supabase = getSupabaseServerClient();

  try {
    // 1. Delete existing rules for this product
    const { error: delErr } = await supabase
      .from('topping_pricing')
      .delete()
      .eq('product_id', productId);

    if (delErr) {
      return { success: false, error: `Failed to clear existing pricing rules: ${delErr.message}` };
    }

    // 2. Insert new rules
    if (validRules.length > 0) {
      const rowsToInsert = validRules.map((r) => ({
        product_id: productId,
        topping_count: r.topping_count,
        extra_price: r.extra_price,
      }));

      const { error: insErr } = await supabase.from('topping_pricing').insert(rowsToInsert);

      if (insErr) {
        return { success: false, error: `Failed to insert pricing rules: ${insErr.message}` };
      }
    }

    return {
      success: true,
      id: productId,
      message: 'Product topping pricing rules updated successfully.',
    };
  } catch (err: any) {
    console.error('updateProductPricingServerSide exception:', err);
    return { success: false, error: err.message || 'Server error updating pricing rules.' };
  }
}
