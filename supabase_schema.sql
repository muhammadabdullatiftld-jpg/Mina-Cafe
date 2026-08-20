-- ==========================================
-- MINA CAFE DATABASE SCHEMA FOR SUPABASE
-- Run this in your Supabase SQL Editor
-- ==========================================

-- 1. PRODUCTS TABLE
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(150) NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
  image_url TEXT,
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. TOPPINGS TABLE
CREATE TABLE IF NOT EXISTS toppings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  is_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. PRODUCT_TOPPINGS (Junction Table)
CREATE TABLE IF NOT EXISTS product_toppings (
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  topping_id UUID REFERENCES toppings(id) ON DELETE CASCADE,
  PRIMARY KEY (product_id, topping_id)
);

-- 4. TOPPING PRICING RULES TABLE
CREATE TABLE IF NOT EXISTS topping_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  topping_count INT NOT NULL CHECK (topping_count > 0),
  extra_price DECIMAL(10,2) NOT NULL CHECK (extra_price >= 0),
  UNIQUE(product_id, topping_count)
);

-- 5. ADMIN SETTINGS TABLE
CREATE TABLE IF NOT EXISTS admin_settings (
  id INT PRIMARY KEY DEFAULT 1,
  easypaisa_number VARCHAR(20) NOT NULL DEFAULT '03402694079',
  easypaisa_account_title VARCHAR(100) NOT NULL DEFAULT 'KASHMENA',
  whatsapp_number VARCHAR(20) NOT NULL DEFAULT '923000000000',
  delivery_fee DECIMAL(10,2) NOT NULL DEFAULT 100.00,
  stall_location TEXT NOT NULL DEFAULT 'Karachi, Pakistan',
  opening_hours VARCHAR(100) NOT NULL DEFAULT '4:00 PM - 12:00 AM',
  is_taking_orders BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT single_settings_row CHECK (id = 1)
);

-- Insert default admin settings if not present
INSERT INTO admin_settings (id, easypaisa_number, easypaisa_account_title, whatsapp_number, delivery_fee, stall_location, opening_hours, is_taking_orders)
VALUES (1, '03402694079', 'KASHMENA', '923000000000', 100.00, 'Karachi Stall', '4:00 PM - 12:00 AM', true)
ON CONFLICT (id) DO UPDATE SET
  easypaisa_number = EXCLUDED.easypaisa_number,
  easypaisa_account_title = EXCLUDED.easypaisa_account_title;

-- 6. ORDERS TABLE (Database Enforced Karachi City Constraint)
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_ref VARCHAR(20) UNIQUE NOT NULL,
  tracking_token VARCHAR(64) UNIQUE NOT NULL,
  customer_name VARCHAR(100) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  address TEXT NOT NULL,
  city VARCHAR(50) NOT NULL DEFAULT 'Karachi',
  subtotal DECIMAL(10,2) NOT NULL,
  delivery_fee DECIMAL(10,2) NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'Pending Payment'
    CHECK (status IN (
      'Pending Payment',
      'Verification Pending',
      'Payment Verified',
      'Preparing',
      'Ready',
      'Completed',
      'Cancelled'
    )),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT karachi_only_constraint CHECK (LOWER(TRIM(city)) = 'karachi')
);

-- 7. ORDER ITEMS TABLE
CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  product_name VARCHAR(150) NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  quantity INT NOT NULL CHECK (quantity > 0),
  selected_toppings JSONB DEFAULT '[]'::jsonb,
  toppings_extra_price DECIMAL(10,2) DEFAULT 0.00,
  item_total DECIMAL(10,2) NOT NULL
);

-- 8. PAYMENTS TABLE
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  transaction_id VARCHAR(100) NOT NULL DEFAULT 'PENDING',
  payment_proof_url TEXT,
  payment_status VARCHAR(30) DEFAULT 'Verification Pending'
    CHECK (payment_status IN ('Verification Pending', 'Verified', 'Rejected')),
  rejection_reason TEXT,
  verified_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. ADMIN USERS TABLE
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE,
  email VARCHAR(255) NOT NULL UNIQUE,
  role VARCHAR(50) NOT NULL DEFAULT 'admin',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE toppings ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_toppings ENABLE ROW LEVEL SECURITY;
ALTER TABLE topping_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Allow public read access to active products, toppings, and settings
CREATE POLICY "Public read products" ON products FOR SELECT USING (true);
CREATE POLICY "Public read toppings" ON toppings FOR SELECT USING (true);
CREATE POLICY "Public read product_toppings" ON product_toppings FOR SELECT USING (true);
CREATE POLICY "Public read topping_pricing" ON topping_pricing FOR SELECT USING (true);
CREATE POLICY "Public read admin_settings" ON admin_settings FOR SELECT USING (true);

-- Orders, order items, and payments are inserted securely via server-side API using service_role key
-- Public read allows tracking order status
CREATE POLICY "Public read orders" ON orders FOR SELECT USING (true);
CREATE POLICY "Public read order_items" ON order_items FOR SELECT USING (true);
CREATE POLICY "Public read payments" ON payments FOR SELECT USING (true);

-- ==========================================
-- INITIAL SEED DATA FOR MINA CAFE
-- ==========================================

DO $$
DECLARE
  v_fruit_glass_id UUID;
  v_creamy_bottle_id UUID;
  v_strawberry_bottle_id UUID;
  v_chocolate_bottle_id UUID;
  v_honey_id UUID;
  v_condensed_milk_id UUID;
  v_chocolate_topping_id UUID;
BEGIN

  -- Insert Products
  INSERT INTO products (name, description, price, is_available)
  VALUES ('Fresh Fruit Glass', 'Fresh seasonal fruits.', 200.00, true)
  RETURNING id INTO v_fruit_glass_id;

  INSERT INTO products (name, description, price, is_available)
  VALUES ('Creamy Milk Bottle', 'Rich, creamy and milky with premium fruits.', 200.00, true)
  RETURNING id INTO v_creamy_bottle_id;

  INSERT INTO products (name, description, price, is_available)
  VALUES ('Strawberry Milk Bottle', 'Strawberry flavour with creamy milk.', 250.00, true)
  RETURNING id INTO v_strawberry_bottle_id;

  INSERT INTO products (name, description, price, is_available)
  VALUES ('Chocolate Milk Bottle', 'Chocolate and milk with a rich taste.', 250.00, true)
  RETURNING id INTO v_chocolate_bottle_id;

  -- Insert Toppings
  INSERT INTO toppings (name, is_enabled)
  VALUES ('Honey', true)
  RETURNING id INTO v_honey_id;

  INSERT INTO toppings (name, is_enabled)
  VALUES ('Condensed Milk', true)
  RETURNING id INTO v_condensed_milk_id;

  INSERT INTO toppings (name, is_enabled)
  VALUES ('Chocolate', true)
  RETURNING id INTO v_chocolate_topping_id;

  -- Link Fresh Fruit Glass to all 3 Toppings
  INSERT INTO product_toppings (product_id, topping_id) VALUES
    (v_fruit_glass_id, v_honey_id),
    (v_fruit_glass_id, v_condensed_milk_id),
    (v_fruit_glass_id, v_chocolate_topping_id);

  -- Insert Topping Pricing Rules for Fresh Fruit Glass
  -- 1 topping = Rs. 0 extra
  -- 3 toppings = Rs. 100 extra
  -- (2 toppings is intentionally NOT inserted)
  INSERT INTO topping_pricing (product_id, topping_count, extra_price) VALUES
    (v_fruit_glass_id, 1, 0.00),
    (v_fruit_glass_id, 3, 100.00);

END $$;
