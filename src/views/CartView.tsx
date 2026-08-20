import React, { useEffect, useState } from 'react';
import { useCart } from '../context/CartContext';
import { formatPKR, setPageTitleAndMeta } from '../lib/utils';
import { KarachiNotice } from '../components/common/KarachiNotice';
import { fetchAdminSettings } from '../lib/settingsService';
import { ShoppingBag, Trash2, Plus, Minus, ArrowRight, ArrowLeft, Truck, AlertCircle } from 'lucide-react';

interface CartViewProps {
  onNavigateToCheckout: () => void;
  onNavigateToMenu: () => void;
}

export const CartView: React.FC<CartViewProps> = ({
  onNavigateToCheckout,
  onNavigateToMenu,
}) => {
  const { cartItems, cartCount, cartSubtotal, updateQuantity, removeFromCart, clearCart, orderType, setOrderType } = useCart();
  const [deliveryFee, setDeliveryFee] = useState<number | null>(null);
  const [loadingFee, setLoadingFee] = useState(true);
  const [feeError, setFeeError] = useState<string | null>(null);

  useEffect(() => {
    setPageTitleAndMeta('Your Shopping Cart', 'Review your fresh fruit glass and milk bottle order in Karachi.');

    const loadSettings = async () => {
      setLoadingFee(true);
      const res = await fetchAdminSettings();
      if (res.deliveryFee !== null) {
        setDeliveryFee(res.deliveryFee);
      } else {
        setFeeError('Could not load delivery fee settings.');
        setDeliveryFee(100); // safe fallback display
      }
      setLoadingFee(false);
    };

    loadSettings();
  }, []);

  const activeDeliveryFee = orderType === 'takeaway' ? 0 : (deliveryFee ?? 100);
  const grandTotal = cartSubtotal + (cartItems.length > 0 ? activeDeliveryFee : 0);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E0D5C5] pb-5">
        <div>
          <button
            onClick={onNavigateToMenu}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#E86024] hover:underline mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Continue Shopping
          </button>
          <h1 className="font-fraunces text-2xl sm:text-3xl font-bold text-[#2A201C] flex items-center gap-2">
            <ShoppingBag className="w-7 h-7 text-[#E86024]" />
            Your Guest Cart ({cartCount} {cartCount === 1 ? 'item' : 'items'})
          </h1>
        </div>

        {cartItems.length > 0 && (
          <button
            onClick={clearCart}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-3 py-2 rounded-xl transition-colors self-start sm:self-auto min-h-[40px]"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear Cart
          </button>
        )}
      </div>

      <KarachiNotice variant="banner" />

      {cartItems.length === 0 ? (
        /* Empty Cart State */
        <div className="bg-[#FFFDF9] border border-[#F0E6D8] rounded-3xl p-10 sm:p-16 text-center space-y-5 max-w-lg mx-auto shadow-xs">
          <div className="w-20 h-20 rounded-full bg-[#FFF0E6] text-[#E86024] flex items-center justify-center mx-auto text-3xl font-fraunces">
            🛒
          </div>
          <div className="space-y-2">
            <h2 className="font-fraunces text-2xl font-bold text-[#2A201C]">Your Cart is Empty</h2>
            <p className="text-xs sm:text-sm text-[#6B5B52]">
              Looks like you haven't added any fresh fruit glasses or creamy milk bottles yet.
            </p>
          </div>
          <button
            onClick={onNavigateToMenu}
            className="px-6 py-3.5 rounded-2xl bg-[#E86024] hover:bg-[#D05018] text-white text-xs font-bold uppercase tracking-wider inline-flex items-center gap-2 shadow-md transition-all active:scale-[0.98] min-h-[48px]"
          >
            <span>Explore Menu Catalog</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      ) : (
        /* Cart Items Grid & Summary Sidebar */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* Cart Item List */}
          <div className="lg:col-span-2 space-y-4">
            {cartItems.map((item) => {
              const isBottle = item.productName.toLowerCase().includes('bottle');
              const isFruitGlass = item.productName.toLowerCase().includes('fruit') || item.productName.toLowerCase().includes('glass');

              return (
                <div
                  key={item.cartItemId}
                  className="bg-[#FFFDF9] border border-[#F0E6D8] rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs"
                >
                  {/* Item Image + Details */}
                  <div className="flex items-start gap-4 flex-1">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-[#FAF6EE] border border-[#F0E6D8] overflow-hidden flex items-center justify-center shrink-0 relative">
                      {item.productImage ? (
                        <img
                          src={item.productImage}
                          alt={item.productName}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <span className="text-2xl">{isBottle ? '🥛' : isFruitGlass ? '🍓' : '✨'}</span>
                      )}
                    </div>

                    <div className="space-y-1">
                      <h3 className="font-fraunces font-bold text-base text-[#2A201C]">
                        {item.productName}
                      </h3>

                      {/* Selected Toppings */}
                      {item.selectedToppingNames && item.selectedToppingNames.length > 0 ? (
                        <div className="flex flex-wrap items-center gap-1.5 my-1">
                          <span className="text-[10px] font-bold text-[#8C7A70] uppercase">Toppings:</span>
                          {item.selectedToppingNames.map((tName, i) => (
                            <span
                              key={i}
                              className="text-[11px] font-semibold bg-[#FFF0E6] text-[#E86024] px-2 py-0.5 rounded-md border border-[#FCD5C1]"
                            >
                              + {tName}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[11px] text-[#8C7A70]">Standard preparation (No extra toppings)</p>
                      )}

                      {/* Pricing Breakdown */}
                      <div className="text-xs text-[#6B5B52] space-x-2">
                        <span>Unit Base: {formatPKR(item.basePrice)}</span>
                        {item.toppingExtraPrice > 0 && (
                          <span className="text-[#E86024] font-semibold">
                            (+ {formatPKR(item.toppingExtraPrice)} toppings)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Quantity Controls & Total */}
                  <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-4 pt-3 sm:pt-0 border-t sm:border-0 border-[#F0E6D8]">
                    {/* Qty +/- */}
                    <div className="flex items-center gap-2 bg-[#FAF6EE] border border-[#EADFCF] rounded-xl p-1">
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.cartItemId, item.quantity - 1)}
                        className="w-7 h-7 rounded-lg bg-white text-[#2A201C] hover:bg-[#F0E6D8] flex items-center justify-center font-bold text-xs transition-colors"
                        title="Decrease quantity"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="font-bold text-xs text-[#2A201C] w-5 text-center">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.cartItemId, item.quantity + 1)}
                        className="w-7 h-7 rounded-lg bg-white text-[#2A201C] hover:bg-[#F0E6D8] flex items-center justify-center font-bold text-xs transition-colors"
                        title="Increase quantity"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    {/* Item Total */}
                    <div className="text-right">
                      <div className="text-sm font-black text-[#2A201C] font-fraunces">
                        {formatPKR(item.itemTotal)}
                      </div>
                      <div className="text-[10px] text-[#8C7A70]">
                        {item.quantity} x {formatPKR(item.unitPrice)}
                      </div>
                    </div>

                    {/* Remove Item */}
                    <button
                      type="button"
                      onClick={() => removeFromCart(item.cartItemId)}
                      className="p-2 text-[#8C7A70] hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center"
                      title="Remove item"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Cart Summary Card */}
          <div className="bg-[#FFFDF9] border border-[#F0E6D8] rounded-3xl p-6 shadow-sm space-y-6 sticky top-24">
            <h2 className="font-fraunces text-lg font-bold text-[#2A201C] border-b border-[#F0E6D8] pb-3">
              Order Calculation
            </h2>

            <div className="space-y-4 text-xs sm:text-sm text-[#2A201C]">
              {/* Order Type Toggle */}
              <div className="bg-[#FAF6EE] p-1 rounded-xl flex items-center border border-[#EADFCF]">
                <button
                  type="button"
                  onClick={() => setOrderType('delivery')}
                  className={`flex-1 py-2 text-center text-xs font-bold rounded-lg transition-all ${
                    orderType === 'delivery'
                      ? 'bg-white shadow-sm text-[#E86024]'
                      : 'text-[#6B5B52] hover:text-[#2A201C]'
                  }`}
                >
                  Home Delivery
                </button>
                <button
                  type="button"
                  onClick={() => setOrderType('takeaway')}
                  className={`flex-1 py-2 text-center text-xs font-bold rounded-lg transition-all ${
                    orderType === 'takeaway'
                      ? 'bg-white shadow-sm text-[#E86024]'
                      : 'text-[#6B5B52] hover:text-[#2A201C]'
                  }`}
                >
                  Self Takeaway
                </button>
              </div>

              <div className="flex justify-between mt-2">
                <span className="text-[#6B5B52]">Subtotal ({cartCount} items):</span>
                <span className="font-bold font-fraunces">{formatPKR(cartSubtotal)}</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-[#6B5B52] flex items-center gap-1.5">
                  <Truck className="w-3.5 h-3.5 text-[#E86024]" />
                  {orderType === 'takeaway' ? 'Delivery Fee (Takeaway):' : 'Delivery Fee (Karachi):'}
                </span>
                <span className={`font-bold font-fraunces ${orderType === 'takeaway' ? 'text-emerald-600' : 'text-[#E86024]'}`}>
                  {loadingFee ? 'Loading...' : (orderType === 'takeaway' ? 'Free (Pickup)' : formatPKR(activeDeliveryFee))}
                </span>
              </div>

              {feeError && (
                <p className="text-[11px] text-amber-700 bg-amber-50 p-2 rounded-lg flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  {feeError}
                </p>
              )}

              <div className="border-t border-[#F0E6D8] pt-3 flex justify-between items-center text-sm sm:text-base font-bold">
                <span>Grand Total:</span>
                <span className="text-xl font-black font-fraunces text-[#E86024]">
                  {formatPKR(grandTotal)}
                </span>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <button
                type="button"
                onClick={onNavigateToCheckout}
                className="w-full py-4 px-6 rounded-2xl bg-[#E86024] hover:bg-[#D05018] text-white text-xs sm:text-sm font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.98] min-h-[50px]"
              >
                <span>Proceed to Checkout</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={onNavigateToMenu}
                className="w-full py-2.5 text-xs font-semibold text-[#6B5B52] hover:text-[#2A201C] text-center block"
              >
                + Add More Items From Menu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
