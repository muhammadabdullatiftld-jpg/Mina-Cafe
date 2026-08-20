import React, { useEffect, useState } from 'react';
import { ProductWithToppings, ToppingPriceResult } from '../types';
import { fetchProductByIdFromSupabase } from '../lib/productsService';
import { setPageTitleAndMeta, formatPKR } from '../lib/utils';
import { ToppingSelector } from '../components/menu/ToppingSelector';
import { KarachiNotice } from '../components/common/KarachiNotice';
import { useCart } from '../context/CartContext';
import { ArrowLeft, Plus, Minus, AlertCircle, ShoppingBag, CheckCircle, ArrowRight } from 'lucide-react';

interface ProductDetailViewProps {
  productId: string;
  onBackToMenu: () => void;
  onNavigateToCart?: () => void;
}

export const ProductDetailView: React.FC<ProductDetailViewProps> = ({
  productId,
  onBackToMenu,
  onNavigateToCart,
}) => {
  const { addToCart } = useCart();
  const [product, setProduct] = useState<ProductWithToppings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [selectedToppings, setSelectedToppings] = useState<string[]>([]);
  const [toppingPriceResult, setToppingPriceResult] = useState<ToppingPriceResult>({
    isConfigured: true,
    extraPrice: 0,
    totalPrice: null,
  });
  const [addedMessage, setAddedMessage] = useState<string | null>(null);

  useEffect(() => {
    const loadProduct = async () => {
      setLoading(true);
      const res = await fetchProductByIdFromSupabase(productId);
      if (res.product) {
        setProduct(res.product);
        setPageTitleAndMeta(
          res.product.name,
          `${res.product.name} - ${res.product.description || 'Fresh fruit glass & milk bottle in Karachi.'}`
        );
      } else {
        setError(res.error || 'Product not found.');
      }
      setLoading(false);
    };

    loadProduct();
  }, [productId]);

  const handleToppingChange = (selectedIds: string[], priceResult: ToppingPriceResult) => {
    setSelectedToppings(selectedIds);
    setToppingPriceResult(priceResult);
    setAddedMessage(null);
  };

  const isBottle = product?.name.toLowerCase().includes('bottle');
  const isFruitGlass = product?.name.toLowerCase().includes('fruit') || product?.name.toLowerCase().includes('glass');

  // Calculate unit item total
  const unitPrice = toppingPriceResult.totalPrice ?? product?.price ?? 0;
  const grandTotal = unitPrice * quantity;

  const handleAddToCart = () => {
    if (!product) return;

    // Get selected topping names
    const selectedToppingNames = product.toppings
      ? product.toppings.filter((t) => selectedToppings.includes(t.id)).map((t) => t.name)
      : [];

    // If product has no toppings, construct a default price result
    const finalPriceResult: ToppingPriceResult = (product.toppings && product.toppings.length > 0)
      ? toppingPriceResult
      : {
          isConfigured: true,
          extraPrice: 0,
          totalPrice: product.price,
        };

    const result = addToCart(
      product,
      quantity,
      selectedToppings,
      selectedToppingNames,
      finalPriceResult
    );

    if (result.success) {
      setAddedMessage(`Added ${quantity} x "${product.name}" to your cart!`);
    } else {
      setError(result.message || 'Could not add item to cart.');
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-8">
      {/* Back Button */}
      <button
        onClick={onBackToMenu}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#FFFDF9] border border-[#E0D5C5] text-xs font-semibold text-[#2A201C] hover:bg-[#F0E6D8] transition-colors focus:outline-none min-h-[44px]"
      >
        <ArrowLeft className="w-4 h-4 text-[#E86024]" />
        Back to Menu Catalog
      </button>

      {/* Added Toast Banner */}
      {addedMessage && (
        <div className="bg-emerald-900 text-emerald-100 border border-emerald-700 p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 animate-fadeIn">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
            <span className="text-xs sm:text-sm font-semibold">{addedMessage}</span>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={onBackToMenu}
              className="px-3 py-1.5 rounded-lg bg-emerald-800 hover:bg-emerald-700 text-xs font-bold text-white transition-colors"
            >
              Keep Shopping
            </button>
            {onNavigateToCart && (
              <button
                onClick={onNavigateToCart}
                className="px-4 py-1.5 rounded-lg bg-[#E86024] hover:bg-[#D05018] text-xs font-bold text-white flex items-center gap-1.5 transition-colors"
              >
                <span>View Cart</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      )}

      {loading ? (
        <div className="bg-[#FFFDF9] border border-[#F0E6D8] rounded-3xl p-8 space-y-6 animate-pulse">
          <div className="h-64 bg-[#F0E6D8] rounded-2xl"></div>
          <div className="h-8 bg-[#F0E6D8] rounded w-1/2"></div>
          <div className="h-4 bg-[#F0E6D8] rounded w-3/4"></div>
        </div>
      ) : error || !product ? (
        <div className="bg-[#FFFDF9] border border-[#F0E6D8] rounded-3xl p-10 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="font-fraunces text-xl font-bold text-[#2A201C]">Product Unavailable</h2>
          <p className="text-xs text-[#6B5B52]">{error || 'Unable to load product details.'}</p>
          <button
            onClick={onBackToMenu}
            className="px-6 py-2.5 rounded-xl bg-[#E86024] text-white text-xs font-semibold"
          >
            Return to Menu
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
          {/* Column 1: Image View */}
          <div className="bg-[#FFFDF9] border border-[#F0E6D8] rounded-3xl p-6 shadow-xs space-y-4">
            <div className="aspect-square bg-[#FAF6EE] rounded-2xl flex items-center justify-center overflow-hidden border border-[#F0E6D8] relative">
              {product.image_url ? (
                <img
                  src={product.image_url}
                  alt={product.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              ) : (
                <div className="text-center p-6 space-y-3">
                  <div className="w-24 h-24 rounded-full bg-[#FFF0E6] text-[#E86024] flex items-center justify-center font-fraunces font-bold text-4xl mx-auto shadow-xs">
                    {isBottle ? '🥛' : isFruitGlass ? '🍓' : '✨'}
                  </div>
                  <span className="text-xs font-semibold text-[#8C7A70] uppercase tracking-wider block">
                    Mina Cafe Handcrafted
                  </span>
                </div>
              )}

              {/* Availability Tag */}
              <div className="absolute top-4 right-4">
                {product.is_available ? (
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                    In Stock
                  </span>
                ) : (
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-200">
                    Sold Out
                  </span>
                )}
              </div>
            </div>

            {/* Karachi Notice Card */}
            <KarachiNotice variant="card" />
          </div>

          {/* Column 2: Product Specs & Toppings */}
          <div className="space-y-6">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-[#E86024]">
                Mina Cafe Product
              </span>
              <h1 className="font-fraunces text-2xl sm:text-3xl font-bold text-[#2A201C] mt-1">
                {product.name}
              </h1>
              <div className="text-2xl font-black text-[#E86024] font-fraunces mt-2">
                {formatPKR(product.price)}
                <span className="text-xs font-normal text-[#6B5B52] ml-2 font-sans">
                  Base Price
                </span>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-[#6B5B52] leading-relaxed bg-[#FFFDF9] p-4 rounded-2xl border border-[#F0E6D8]">
              {product.description || 'Prepared fresh upon order with pure ingredients in Karachi.'}
            </p>

            {/* Toppings Selector Component (If product has connected toppings) */}
            {product.toppings && product.toppings.length > 0 && (
              <ToppingSelector
                basePrice={product.price}
                toppings={product.toppings}
                pricingRules={product.topping_pricing || []}
                onSelectionChange={handleToppingChange}
              />
            )}

            {/* Quantity Selector */}
            <div className="bg-[#FFFDF9] border border-[#F0E6D8] rounded-2xl p-4 flex items-center justify-between">
              <span className="font-fraunces font-bold text-sm text-[#2A201C]">Quantity</span>
              <div className="flex items-center gap-3 bg-[#FAF6EE] border border-[#EADFCF] rounded-xl p-1">
                <button
                  type="button"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  disabled={quantity <= 1}
                  className="w-8 h-8 rounded-lg bg-white text-[#2A201C] hover:bg-[#F0E6D8] flex items-center justify-center font-bold text-sm disabled:opacity-40 transition-colors"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="font-bold text-sm text-[#2A201C] w-6 text-center">{quantity}</span>
                <button
                  type="button"
                  onClick={() => setQuantity(quantity + 1)}
                  className="w-8 h-8 rounded-lg bg-white text-[#2A201C] hover:bg-[#F0E6D8] flex items-center justify-center font-bold text-sm transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Total Summary & Add to Cart */}
            <div className="bg-[#2A201C] text-[#FAF6EE] rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between text-xs text-[#C2B2A8]">
                <span>Total Amount ({quantity} x {formatPKR(unitPrice)}):</span>
                <span className="text-lg font-black font-fraunces text-[#FFAE80]">
                  {toppingPriceResult.isConfigured ? formatPKR(grandTotal) : 'Unavailable'}
                </span>
              </div>

              {/* Warning if combination is not priced */}
              {!toppingPriceResult.isConfigured && (
                <p className="text-xs text-amber-300 bg-amber-950/60 p-2.5 rounded-xl border border-amber-800/80">
                  ⚠️ This topping combination (2 toppings) is currently unpriced. Please select 1 or 3 toppings to proceed.
                </p>
              )}

              <button
                type="button"
                onClick={handleAddToCart}
                disabled={!product.is_available || !toppingPriceResult.isConfigured}
                className={`w-full py-3.5 px-6 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all min-h-[48px] ${
                  product.is_available && toppingPriceResult.isConfigured
                    ? 'bg-[#E86024] hover:bg-[#D05018] text-white shadow-md active:scale-[0.99]'
                    : 'bg-[#4D3F38] text-[#8C7A70] cursor-not-allowed'
                }`}
              >
                <ShoppingBag className="w-4.5 h-4.5" />
                {product.is_available && toppingPriceResult.isConfigured
                  ? 'Add to Cart'
                  : !product.is_available
                  ? 'Currently Sold Out'
                  : 'Select Valid Topping Amount'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

