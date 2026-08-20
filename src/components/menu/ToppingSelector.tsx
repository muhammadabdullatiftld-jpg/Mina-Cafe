import React, { useState, useEffect } from 'react';
import { Topping, ToppingPricing, ToppingPriceResult } from '../../types';
import { calculateToppingPrice, formatPKR } from '../../lib/utils';
import { Check, AlertCircle, Sparkles, Info } from 'lucide-react';

interface ToppingSelectorProps {
  basePrice: number;
  toppings: Topping[];
  pricingRules: ToppingPricing[];
  onSelectionChange: (selectedToppingIds: string[], priceResult: ToppingPriceResult) => void;
}

export const ToppingSelector: React.FC<ToppingSelectorProps> = ({
  basePrice,
  toppings,
  pricingRules,
  onSelectionChange,
}) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Calculate current price result whenever selection changes
  const priceResult = calculateToppingPrice(basePrice, selectedIds.length, pricingRules);

  useEffect(() => {
    onSelectionChange(selectedIds, priceResult);
  }, [selectedIds]);

  const toggleTopping = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  if (!toppings || toppings.length === 0) {
    return null;
  }

  return (
    <div className="bg-[#FFFDF9] border border-[#F0E6D8] rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-fraunces text-base font-bold text-[#2A201C] flex items-center gap-2">
            Customize Toppings
            <span className="text-xs bg-[#FFF0E6] text-[#E86024] px-2 py-0.5 rounded-full font-medium">
              Optional
            </span>
          </h4>
          <p className="text-xs text-[#6B5B52] mt-0.5">
            1 topping included in Rs. {basePrice} • All 3 toppings +Rs. 100
          </p>
        </div>
      </div>

      {/* Checkbox List */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        {toppings.map((topping) => {
          const isSelected = selectedIds.includes(topping.id);
          return (
            <button
              key={topping.id}
              type="button"
              onClick={() => toggleTopping(topping.id)}
              className={`flex items-center justify-between p-3 rounded-xl border text-left transition-all min-h-[48px] focus:outline-none ${
                isSelected
                  ? 'bg-[#FFF0E6] border-[#E86024] text-[#E86024] font-semibold shadow-xs ring-1 ring-[#E86024]'
                  : 'bg-[#FAF6EE] border-[#EADFCF] text-[#2A201C] hover:border-[#D0C2B0]'
              }`}
            >
              <span className="text-sm">{topping.name}</span>
              <div
                className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 transition-colors ${
                  isSelected ? 'bg-[#E86024] text-white' : 'border border-[#C2B2A8] bg-white'
                }`}
              >
                {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
              </div>
            </button>
          );
        })}
      </div>

      {/* Dynamic Status / Pricing Notice */}
      <div className="pt-2">
        {selectedIds.length === 2 && !priceResult.isConfigured ? (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs flex items-start gap-2 animate-in fade-in duration-200">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-950">Combination Not Configured</p>
              <p className="mt-0.5 leading-relaxed text-amber-800">
                The price for selecting <strong>exactly 2 toppings</strong> is not configured yet. Please select <strong>1 topping</strong> (included in base price) or <strong>all 3 toppings</strong> (+Rs. 100).
              </p>
            </div>
          </div>
        ) : selectedIds.length === 3 ? (
          <div className="p-3 bg-[#FFF0E6] border border-[#FCDAC8] rounded-xl text-[#E86024] text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              <span className="font-semibold">All 3 Toppings Selected</span>
            </div>
            <span className="font-bold">+Rs. 100 Extra</span>
          </div>
        ) : selectedIds.length === 1 ? (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-emerald-600" />
              <span>1 Topping Included</span>
            </div>
            <span className="font-semibold text-emerald-700">+Rs. 0 Extra</span>
          </div>
        ) : (
          <div className="p-2.5 bg-[#FAF6EE] rounded-xl text-xs text-[#6B5B52] flex items-center justify-between border border-[#EADFCF]">
            <span>No extra toppings selected</span>
            <span className="font-medium text-[#2A201C]">{formatPKR(basePrice)}</span>
          </div>
        )}
      </div>
    </div>
  );
};
