import { supabase, isSupabaseConfigured } from './supabase';
import { Product, ProductWithToppings, Topping, ToppingPricing } from '../types';

export interface ProductsFetchResult {
  products: Product[];
  error: string | null;
  isConfigured: boolean;
}

export interface ProductDetailFetchResult {
  product: ProductWithToppings | null;
  error: string | null;
  isConfigured: boolean;
}

/**
 * Fetch all products directly from Supabase
 */
export async function fetchProductsFromSupabase(): Promise<ProductsFetchResult> {
  if (!isSupabaseConfigured()) {
    return {
      products: [],
      error: 'Supabase URL or Anon Key is missing. Please add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to environment variables.',
      isConfigured: false,
    };
  }

  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching products from Supabase:', error);
      return {
        products: [],
        error: `Supabase query error: ${error.message}. Make sure the schema in supabase_schema.sql has been executed in your Supabase SQL editor.`,
        isConfigured: true,
      };
    }

    return {
      products: (data as Product[]) || [],
      error: null,
      isConfigured: true,
    };
  } catch (err: any) {
    return {
      products: [],
      error: err.message || 'Failed to connect to Supabase database.',
      isConfigured: true,
    };
  }
}

/**
 * Fetch a single product by ID or name slug, including linked toppings and pricing rules
 */
export async function fetchProductByIdFromSupabase(id: string): Promise<ProductDetailFetchResult> {
  if (!isSupabaseConfigured()) {
    return {
      product: null,
      error: 'Supabase URL or Anon Key is missing. Please add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to environment variables.',
      isConfigured: false,
    };
  }

  try {
    // 1. Fetch main product row
    const { data: productData, error: productError } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .single();

    if (productError || !productData) {
      // Try searching by exact name or slug if UUID lookup failed
      const { data: fallbackData } = await supabase
        .from('products')
        .select('*')
        .ilike('name', id.replace(/-/g, ' '))
        .limit(1)
        .single();

      if (!fallbackData) {
        return {
          product: null,
          error: 'Product not found in Supabase database.',
          isConfigured: true,
        };
      }
      return fetchProductByIdFromSupabase(fallbackData.id);
    }

    const productId = productData.id;

    // 2. Fetch linked toppings via product_toppings junction table
    const { data: ptData } = await supabase
      .from('product_toppings')
      .select('topping_id')
      .eq('product_id', productId);

    let toppings: Topping[] = [];
    if (ptData && ptData.length > 0) {
      const toppingIds = ptData.map((pt) => pt.topping_id);
      const { data: toppingRows } = await supabase
        .from('toppings')
        .select('*')
        .in('id', toppingIds)
        .eq('is_enabled', true);

      toppings = (toppingRows as Topping[]) || [];
    }

    // 3. Fetch topping pricing rules
    const { data: pricingRows } = await supabase
      .from('topping_pricing')
      .select('*')
      .eq('product_id', productId);

    const toppingPricing = (pricingRows as ToppingPricing[]) || [];

    const fullProduct: ProductWithToppings = {
      ...productData,
      toppings,
      topping_pricing: toppingPricing,
    };

    return {
      product: fullProduct,
      error: null,
      isConfigured: true,
    };
  } catch (err: any) {
    return {
      product: null,
      error: err.message || 'Failed to fetch product details from Supabase.',
      isConfigured: true,
    };
  }
}
