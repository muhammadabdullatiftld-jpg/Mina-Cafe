export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image_url: string | null;
  stock?: number | null;
  is_available: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Topping {
  id: string;
  name: string;
  is_enabled: boolean;
  created_at?: string;
}

export interface ProductTopping {
  product_id: string;
  topping_id: string;
}

export interface ToppingPricing {
  id: string;
  product_id: string;
  topping_count: number;
  extra_price: number;
}

export interface ProductWithToppings extends Product {
  toppings: Topping[];
  topping_pricing: ToppingPricing[];
}

export interface ToppingPriceResult {
  isConfigured: boolean;
  extraPrice: number;
  totalPrice: number | null;
  message?: string;
}

export interface CartItem {
  cartItemId: string;
  productId: string;
  productName: string;
  productImage: string | null;
  basePrice: number;
  quantity: number;
  selectedToppingIds: string[];
  selectedToppingNames: string[];
  toppingExtraPrice: number;
  unitPrice: number;
  itemTotal: number;
}

export interface AdminSettings {
  id: number;
  easypaisa_number: string;
  easypaisa_account_title: string;
  whatsapp_number: string;
  delivery_fee: number;
  stall_location: string;
  opening_hours: string;
  is_taking_orders: boolean;
  updated_at?: string;
}

export interface CheckoutCustomerData {
  customerName: string;
  phone: string;
  address: string;
  city: string;
  notes?: string;
}

export interface OrderCreateItem {
  productId: string;
  quantity: number;
  selectedToppingIds: string[];
}

export interface OrderCreatePayload {
  customer: CheckoutCustomerData;
  items: OrderCreateItem[];
}

export interface OrderCreateResponse {
  success: boolean;
  orderId?: string;
  orderRef?: string;
  trackingToken?: string;
  subtotal?: number;
  deliveryFee?: number;
  totalAmount?: number;
  error?: string;
  details?: any;
}

