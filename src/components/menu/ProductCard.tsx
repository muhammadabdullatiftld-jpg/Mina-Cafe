import React from 'react';
import { Product } from '../../types';
import { formatPKR } from '../../lib/utils';
import { Utensils, ChevronRight } from 'lucide-react';

interface ProductCardProps {
  product: Product;
  onSelect: (productId: string) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onSelect }) => {
  // Placeholder illustrations tailored to fruit glass / milk bottles if image_url is absent
  const isBottle = product.name.toLowerCase().includes('bottle');
  const isFruitGlass = product.name.toLowerCase().includes('fruit') || product.name.toLowerCase().includes('glass');

  return (
    <div className="bg-[#FFFDF9] border border-[#F0E6D8] rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between group">
      <div>
        {/* Product Image or SVG Graphic Badge */}
        <div className="relative aspect-4/3 bg-[#FAF6EE] overflow-hidden flex items-center justify-center p-6 border-b border-[#F0E6D8]">
          {product.image_url ? (
            <img
              src={product.image_url}
              alt={product.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              onError={(e) => {
                // Fallback to placeholder if image load fails
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-center space-y-2">
              <div className="w-16 h-16 rounded-full bg-[#FFF0E6] text-[#E86024] flex items-center justify-center font-fraunces font-bold text-2xl shadow-xs group-hover:scale-110 transition-transform">
                {isBottle ? '🥛' : isFruitGlass ? '🍓' : '✨'}
              </div>
              <span className="text-[11px] font-semibold text-[#8C7A70] uppercase tracking-wider">
                Mina Cafe Fresh
              </span>
            </div>
          )}

          {/* Availability Badge */}
          <div className="absolute top-3 right-3">
            {product.is_available ? (
              <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200 shadow-xs">
                Available
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-rose-100 text-rose-800 border border-rose-200 shadow-xs">
                Sold Out
              </span>
            )}
          </div>
        </div>

        {/* Product Details */}
        <div className="p-5 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-fraunces text-lg font-bold text-[#2A201C] group-hover:text-[#E86024] transition-colors leading-snug">
              {product.name}
            </h3>
            <span className="font-fraunces text-lg font-black text-[#E86024] shrink-0">
              {formatPKR(product.price)}
            </span>
          </div>

          <p className="text-xs sm:text-sm text-[#6B5B52] leading-relaxed line-clamp-2 min-h-[2.5rem]">
            {product.description || 'Prepared fresh with premium ingredients.'}
          </p>
        </div>
      </div>

      {/* Action CTA */}
      <div className="px-5 pb-5 pt-1">
        <button
          onClick={() => onSelect(product.id)}
          disabled={!product.is_available}
          className={`w-full py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-1.5 transition-all focus:outline-none min-h-[44px] ${
            product.is_available
              ? 'bg-[#2A201C] text-[#FAF6EE] hover:bg-[#E86024] hover:text-white shadow-xs'
              : 'bg-[#EADFCF] text-[#8C7A70] cursor-not-allowed'
          }`}
        >
          {product.is_available ? (
            <>
              View Details
              <ChevronRight className="w-4 h-4" />
            </>
          ) : (
            'Currently Unavailable'
          )}
        </button>
      </div>
    </div>
  );
};
