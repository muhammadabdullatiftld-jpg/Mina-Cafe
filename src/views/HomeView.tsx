import React, { useEffect, useState } from 'react';
import { Product } from '../types';
import { fetchProductsFromSupabase } from '../lib/productsService';
import { setPageTitleAndMeta } from '../lib/utils';
import { ProductCard } from '../components/menu/ProductCard';
import { SupabaseStatusNotice } from '../components/common/SupabaseStatusNotice';
import { Utensils, MapPin, Clock, Instagram, Sparkles, ArrowRight, ShieldCheck, Heart } from 'lucide-react';

interface HomeViewProps {
  onNavigate: (path: string) => void;
  onSelectProduct: (productId: string) => void;
}

export const HomeView: React.FC<HomeViewProps> = ({ onNavigate, onSelectProduct }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConfigured, setIsConfigured] = useState(true);

  useEffect(() => {
    setPageTitleAndMeta(
      'Mina Cafe | Fresh Fruit Glasses & Creamy Milk Bottles in Karachi',
      'Fresh seasonal fruit glasses & creamy milk bottles handcrafted in Karachi. Fast online ordering & delivery.'
    );

    const loadProducts = async () => {
      setLoading(true);
      const res = await fetchProductsFromSupabase();
      setProducts(res.products);
      setError(res.error);
      setIsConfigured(res.isConfigured);
      setLoading(false);
    };

    loadProducts();
  }, []);

  return (
    <div className="space-y-12 pb-16">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-b from-[#FFFDF9] to-[#FAF6EE] pt-8 sm:pt-14 pb-12 border-b border-[#EADFCF] px-4 overflow-hidden">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#FFF0E6] border border-[#FCDAC8] text-[#E86024] text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Karachi's New Favorite Food Stall</span>
          </div>

          {/* Main Display Headline */}
          <h1 className="font-fraunces text-3xl sm:text-5xl md:text-6xl font-black text-[#2A201C] leading-[1.15] tracking-tight">
            Fresh Fruit Glasses & <br className="hidden sm:inline" />
            <span className="text-[#E86024]">Creamy Milk Bottles</span>
          </h1>

          {/* Subtitle */}
          <p className="text-sm sm:text-lg text-[#6B5B52] max-w-2xl mx-auto leading-relaxed">
            Handcrafted with seasonal Karachi fruits, rich condensed milk, and honey. Delivered fresh to your doorstep across Karachi.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              onClick={() => onNavigate('/menu')}
              className="w-full sm:w-auto px-8 py-3.5 rounded-full bg-[#E86024] hover:bg-[#D05018] text-white font-bold text-sm sm:text-base shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 group min-h-[48px]"
            >
              <Utensils className="w-5 h-5" />
              Order Fresh Menu
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>

            <a
              href="https://www.instagram.com/mina.cafe_/"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto px-6 py-3.5 rounded-full bg-[#FFFDF9] hover:bg-[#F0E6D8] text-[#2A201C] border border-[#E0D5C5] font-semibold text-sm transition-all flex items-center justify-center gap-2 min-h-[48px]"
            >
              <Instagram className="w-4 h-4 text-[#E86024]" />
              Watch Instagram Reels
            </a>
          </div>

          {/* Delivery Note */}
          <div className="pt-3 flex items-center justify-center gap-2 text-xs font-semibold text-[#8C7A70]">
            <ShieldCheck className="w-4 h-4 text-[#E86024]" />
            <span>Delivering Exclusively in Karachi</span>
          </div>
        </div>
      </section>

      {/* Database Status Notice if Supabase setup needed */}
      <SupabaseStatusNotice error={error} isConfigured={isConfigured} itemCount={products.length} />

      {/* Featured Menu Catalog Section */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-8">
          <div>
            <span className="text-xs font-bold text-[#E86024] uppercase tracking-widest">Our Selection</span>
            <h2 className="font-fraunces text-2xl sm:text-3xl font-black text-[#2A201C] mt-1">
              Fresh Daily Menu
            </h2>
          </div>
          <button
            onClick={() => onNavigate('/menu')}
            className="text-xs sm:text-sm font-bold text-[#E86024] hover:text-[#D05018] flex items-center gap-1 group self-start sm:self-auto"
          >
            View All Products ({products.length > 0 ? products.length : '4'})
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        {/* Product Cards Grid */}
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
        ) : products.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} onSelect={onSelectProduct} />
            ))}
          </div>
        ) : (
          /* Default initial menu preview cards if Supabase table is empty or unseeded */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-[#FFFDF9] border border-[#F0E6D8] rounded-2xl p-5 space-y-3 text-center">
              <div className="text-4xl py-4">🍓</div>
              <h3 className="font-fraunces font-bold text-lg text-[#2A201C]">Fresh Fruit Glass</h3>
              <p className="text-xs text-[#6B5B52]">Fresh seasonal fruits with honey or condensed milk.</p>
              <div className="text-[#E86024] font-bold text-base">Rs. 200</div>
            </div>

            <div className="bg-[#FFFDF9] border border-[#F0E6D8] rounded-2xl p-5 space-y-3 text-center">
              <div className="text-4xl py-4">🥛</div>
              <h3 className="font-fraunces font-bold text-lg text-[#2A201C]">Creamy Milk Bottle</h3>
              <p className="text-xs text-[#6B5B52]">Rich, creamy and milky with premium fruits.</p>
              <div className="text-[#E86024] font-bold text-base">Rs. 200</div>
            </div>

            <div className="bg-[#FFFDF9] border border-[#F0E6D8] rounded-2xl p-5 space-y-3 text-center">
              <div className="text-4xl py-4">🍓</div>
              <h3 className="font-fraunces font-bold text-lg text-[#2A201C]">Strawberry Milk Bottle</h3>
              <p className="text-xs text-[#6B5B52]">Strawberry flavour with creamy milk.</p>
              <div className="text-[#E86024] font-bold text-base">Rs. 250</div>
            </div>

            <div className="bg-[#FFFDF9] border border-[#F0E6D8] rounded-2xl p-5 space-y-3 text-center">
              <div className="text-4xl py-4">🍫</div>
              <h3 className="font-fraunces font-bold text-lg text-[#2A201C]">Chocolate Milk Bottle</h3>
              <p className="text-xs text-[#6B5B52]">Chocolate and milk with a rich taste.</p>
              <div className="text-[#E86024] font-bold text-base">Rs. 250</div>
            </div>
          </div>
        )}
      </section>

      {/* Brand & Location Information Banner */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-4">
        <div className="bg-[#2A201C] text-[#FAF6EE] rounded-3xl p-6 sm:p-10 relative overflow-hidden shadow-lg">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center relative z-10">
            <div className="space-y-4">
              <span className="text-xs font-bold uppercase tracking-widest text-[#FFAE80]">
                About Mina Cafe
              </span>
              <h2 className="font-fraunces text-2xl sm:text-3xl font-bold leading-tight">
                Karachi's Small Startup with Big Flavors
              </h2>
              <p className="text-xs sm:text-sm text-[#C2B2A8] leading-relaxed">
                Mina Cafe started as a food stall in Karachi with a simple goal: serving genuine, ice-chilled fresh seasonal fruits and thick, flavorful milk bottles crafted right before your eyes.
              </p>
              <div className="pt-2 flex items-center gap-4 text-xs text-[#FFAE80]">
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-[#E86024]" />
                  <span>Stall in Karachi</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-[#E86024]" />
                  <span>4:00 PM – 12:00 AM</span>
                </div>
              </div>
            </div>

            <div className="bg-[#3D302A] border border-[#4D3F38] rounded-2xl p-6 space-y-4">
              <h3 className="font-fraunces text-lg font-bold text-[#FAF6EE] flex items-center gap-2">
                <Heart className="w-5 h-5 text-[#E86024] fill-[#E86024]" />
                Freshness Promise
              </h3>
              <ul className="space-y-2.5 text-xs text-[#C2B2A8]">
                <li className="flex items-start gap-2">
                  <span className="text-[#E86024] font-bold">✓</span>
                  <span>100% fresh seasonal fruits chopped daily</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#E86024] font-bold">✓</span>
                  <span>Pure condensed milk & premium toppings</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#E86024] font-bold">✓</span>
                  <span>Strictly Karachi delivery area</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
