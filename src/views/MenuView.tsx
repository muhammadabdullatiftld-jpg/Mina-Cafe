import React, { useEffect, useState } from 'react';
import { Product } from '../types';
import { fetchProductsFromSupabase } from '../lib/productsService';
import { setPageTitleAndMeta } from '../lib/utils';
import { ProductCard } from '../components/menu/ProductCard';
import { SupabaseStatusNotice } from '../components/common/SupabaseStatusNotice';
import { Utensils, Search, Filter, RefreshCw } from 'lucide-react';

interface MenuViewProps {
  onSelectProduct: (productId: string) => void;
}

export const MenuView: React.FC<MenuViewProps> = ({ onSelectProduct }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConfigured, setIsConfigured] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const loadProducts = async () => {
    setLoading(true);
    const res = await fetchProductsFromSupabase();
    setProducts(res.products);
    setError(res.error);
    setIsConfigured(res.isConfigured);
    setLoading(false);
  };

  useEffect(() => {
    setPageTitleAndMeta(
      'Menu & Prices',
      'Explore Fresh Fruit Glasses & Creamy Milk Bottles menu in Karachi. Simple online ordering.'
    );
    loadProducts();
  }, []);

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.description && p.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FFF0E6] text-[#E86024] text-xs font-semibold">
          <Utensils className="w-3.5 h-3.5" />
          <span>Karachi Online Menu</span>
        </div>
        <h1 className="font-fraunces text-3xl sm:text-4xl font-black text-[#2A201C]">
          Mina Cafe Menu
        </h1>
        <p className="text-xs sm:text-sm text-[#6B5B52]">
          Choose your favorite fresh fruit glass or chilled creamy milk bottle. All orders are freshly prepared upon receipt in Karachi.
        </p>
      </div>

      {/* Supabase connection status check notice */}
      <SupabaseStatusNotice error={error} isConfigured={isConfigured} itemCount={products.length} />

      {/* Search Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-[#FFFDF9] border border-[#F0E6D8] p-3 sm:p-4 rounded-2xl shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-[#8C7A70] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search menu items..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-[#FAF6EE] border border-[#EADFCF] rounded-xl text-xs sm:text-sm text-[#2A201C] focus:outline-none focus:border-[#E86024]"
          />
        </div>

        <div className="flex items-center justify-between w-full sm:w-auto gap-3 text-xs text-[#6B5B52]">
          <span>Showing {filteredProducts.length} items</span>
          <button
            onClick={loadProducts}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#FAF6EE] hover:bg-[#F0E6D8] rounded-xl border border-[#E0D5C5] font-medium text-[#2A201C] transition-colors"
            title="Refresh menu from Supabase"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Product List Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="bg-[#FFFDF9] border border-[#F0E6D8] rounded-2xl p-5 space-y-3 animate-pulse">
              <div className="aspect-4/3 bg-[#F0E6D8] rounded-xl"></div>
              <div className="h-5 bg-[#F0E6D8] rounded w-3/4"></div>
              <div className="h-4 bg-[#F0E6D8] rounded w-1/2"></div>
              <div className="h-10 bg-[#F0E6D8] rounded-xl mt-4"></div>
            </div>
          ))}
        </div>
      ) : filteredProducts.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {filteredProducts.map((product) => (
            <ProductCard key={product.id} product={product} onSelect={onSelectProduct} />
          ))}
        </div>
      ) : (
        <div className="bg-[#FFFDF9] border border-[#F0E6D8] rounded-2xl p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-[#FFF0E6] text-[#E86024] flex items-center justify-center mx-auto">
            <Filter className="w-6 h-6" />
          </div>
          <h3 className="font-fraunces text-lg font-bold text-[#2A201C]">No products found</h3>
          <p className="text-xs text-[#6B5B52]">Try adjusting your search filter or refreshing the menu.</p>
        </div>
      )}
    </div>
  );
};
