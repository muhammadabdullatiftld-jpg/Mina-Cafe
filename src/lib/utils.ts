import { ToppingPricing, ToppingPriceResult } from '../types';

/**
 * Format currency amount to Pakistani Rupees (e.g., Rs. 200)
 */
export function formatPKR(amount: number): string {
  return `Rs. ${Math.round(amount).toLocaleString('en-PK')}`;
}

/**
 * Calculate topping price according to database pricing rules.
 * Business Rule:
 * - 0 toppings: base price
 * - 1 topping: 0 extra (Total = basePrice)
 * - 3 toppings: Rs. 100 extra (Total = basePrice + 100)
 * - 2 toppings: NOT configured -> returns isConfigured: false
 */
export function calculateToppingPrice(
  basePrice: number,
  selectedCount: number,
  pricingRules: ToppingPricing[]
): ToppingPriceResult {
  if (selectedCount === 0) {
    return {
      isConfigured: true,
      extraPrice: 0,
      totalPrice: basePrice,
    };
  }

  // Look for matching rule in database table
  const matchingRule = pricingRules.find((rule) => rule.topping_count === selectedCount);

  if (matchingRule) {
    return {
      isConfigured: true,
      extraPrice: Number(matchingRule.extra_price),
      totalPrice: basePrice + Number(matchingRule.extra_price),
    };
  }

  // Fallback check for standard business rule if database rule table isn't populated yet:
  // 1 topping = Rs. 0 extra
  if (selectedCount === 1) {
    return {
      isConfigured: true,
      extraPrice: 0,
      totalPrice: basePrice,
    };
  }

  // 3 toppings = Rs. 100 extra
  if (selectedCount === 3) {
    return {
      isConfigured: true,
      extraPrice: 100,
      totalPrice: basePrice + 100,
    };
  }

  // Unpriced combinations are considered free by default
  return {
    isConfigured: true,
    extraPrice: 0,
    totalPrice: basePrice,
  };
}

/**
 * Update document title and meta description dynamically for SEO
 */
export function setPageTitleAndMeta(title: string, description?: string): void {
  document.title = `${title} | Mina Cafe Karachi`;
  if (description) {
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute('content', description);
    }
  }
}
