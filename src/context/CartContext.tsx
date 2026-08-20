import React, { createContext, useContext, useState, useEffect } from 'react';
import { CartItem, Product, ToppingPriceResult } from '../types';

interface CartContextType {
  cartItems: CartItem[];
  cartCount: number;
  cartSubtotal: number;
  addToCart: (
    product: Product,
    quantity: number,
    selectedToppingIds: string[],
    selectedToppingNames: string[],
    priceResult: ToppingPriceResult
  ) => { success: boolean; message?: string };
  updateQuantity: (cartItemId: string, newQuantity: number) => void;
  removeFromCart: (cartItemId: string) => void;
  clearCart: () => void;
  orderType: 'delivery' | 'takeaway';
  setOrderType: (type: 'delivery' | 'takeaway') => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const LOCAL_STORAGE_KEY = 'mina_cafe_guest_cart_v1';

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cartItems, setCartItems] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.error('Error reading cart from localStorage', e);
    }
    return [];
  });

  const [orderType, setOrderType] = useState<'delivery' | 'takeaway'>('delivery');

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(cartItems));
    } catch (e) {
      console.error('Error saving cart to localStorage', e);
    }
  }, [cartItems]);

  const cartCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);
  const cartSubtotal = cartItems.reduce((acc, item) => acc + item.itemTotal, 0);

  const addToCart = (
    product: Product,
    quantity: number,
    selectedToppingIds: string[],
    selectedToppingNames: string[],
    priceResult: ToppingPriceResult
  ) => {
    // Check if topping price combination is configured
    if (!priceResult.isConfigured || priceResult.totalPrice === null) {
      return {
        success: false,
        message: priceResult.message || 'This topping combination is currently unpriced and cannot be added.',
      };
    }

    if (quantity < 1) {
      return { success: false, message: 'Quantity must be at least 1.' };
    }

    // Generate unique ID based on product ID and sorted topping IDs
    const sortedToppingIds = [...selectedToppingIds].sort();
    const cartItemId = `${product.id}_${sortedToppingIds.join('-') || 'no_toppings'}`;

    const basePrice = Number(product.price);
    const toppingExtraPrice = Number(priceResult.extraPrice);
    const unitPrice = Number(priceResult.totalPrice);

    setCartItems((prev) => {
      const existingIndex = prev.findIndex((item) => item.cartItemId === cartItemId);

      if (existingIndex > -1) {
        // Item already in cart, update quantity
        const updated = [...prev];
        const existing = updated[existingIndex];
        const newQty = existing.quantity + quantity;
        updated[existingIndex] = {
          ...existing,
          quantity: newQty,
          itemTotal: unitPrice * newQty,
        };
        return updated;
      }

      // Add new item
      const newItem: CartItem = {
        cartItemId,
        productId: product.id,
        productName: product.name,
        productImage: product.image_url,
        basePrice,
        quantity,
        selectedToppingIds: sortedToppingIds,
        selectedToppingNames,
        toppingExtraPrice,
        unitPrice,
        itemTotal: unitPrice * quantity,
      };

      return [...prev, newItem];
    });

    return { success: true };
  };

  const updateQuantity = (cartItemId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(cartItemId);
      return;
    }

    setCartItems((prev) =>
      prev.map((item) => {
        if (item.cartItemId === cartItemId) {
          return {
            ...item,
            quantity: newQuantity,
            itemTotal: item.unitPrice * newQuantity,
          };
        }
        return item;
      })
    );
  };

  const removeFromCart = (cartItemId: string) => {
    setCartItems((prev) => prev.filter((item) => item.cartItemId !== cartItemId));
  };

  const clearCart = () => {
    setCartItems([]);
  };

  return (
    <CartContext.Provider
      value={{
        cartItems,
        cartCount,
        cartSubtotal,
        addToCart,
        updateQuantity,
        removeFromCart,
        clearCart,
        orderType,
        setOrderType,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
