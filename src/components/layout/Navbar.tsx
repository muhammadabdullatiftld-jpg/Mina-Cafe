import React, { useState } from 'react';
import { KarachiNotice } from '../common/KarachiNotice';
import { useCart } from '../../context/CartContext';
import { Utensils, MapPin, Menu as MenuIcon, X, Instagram, ShoppingBag } from 'lucide-react';

interface NavbarProps {
  currentPath: string;
  onNavigate: (path: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentPath, onNavigate }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { cartCount } = useCart();

  const handleNavClick = (path: string) => {
    onNavigate(path);
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 bg-[#FAF6EE]/95 backdrop-blur-md border-b border-[#EADFCF]">
      {/* Top Banner Notice */}
      <KarachiNotice variant="banner" />

      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo */}
          <button
            onClick={() => handleNavClick('/')}
            className="flex items-center gap-2.5 text-left group focus:outline-none"
          >
            <div className="w-10 h-10 rounded-full bg-[#E86024] text-[#FFFDF9] flex items-center justify-center font-fraunces font-bold text-xl shadow-xs group-hover:scale-105 transition-transform">
              M
            </div>
            <div>
              <span className="font-fraunces text-xl font-black tracking-tight text-[#2A201C] block leading-none">
                MINA CAFE
              </span>
              <span className="text-[10px] uppercase tracking-wider font-semibold text-[#E86024] block mt-1">
                Karachi • Fresh & Creamy
              </span>
            </div>
          </button>

          {/* Desktop Links & Cart */}
          <nav className="hidden md:flex items-center gap-6">
            <button
              onClick={() => handleNavClick('/')}
              className={`text-sm font-medium transition-colors py-2 ${
                currentPath === '/' ? 'text-[#E86024] font-semibold border-b-2 border-[#E86024]' : 'text-[#6B5B52] hover:text-[#2A201C]'
              }`}
            >
              Home
            </button>

            <button
              onClick={() => handleNavClick('/menu')}
              className={`text-sm font-medium transition-colors py-2 flex items-center gap-1.5 ${
                currentPath.startsWith('/menu') || currentPath.startsWith('/product')
                  ? 'text-[#E86024] font-semibold border-b-2 border-[#E86024]'
                  : 'text-[#6B5B52] hover:text-[#2A201C]'
              }`}
            >
              <Utensils className="w-4 h-4" />
              Menu Catalog
            </button>

            {/* Cart Button */}
            <button
              onClick={() => handleNavClick('/cart')}
              className={`text-xs font-bold px-4 py-2 rounded-full transition-all flex items-center gap-2 min-h-[40px] ${
                currentPath === '/cart' || currentPath === '/checkout'
                  ? 'bg-[#E86024] text-white shadow-sm'
                  : 'bg-[#FFF0E6] text-[#E86024] hover:bg-[#E86024] hover:text-white border border-[#FCDAC8]'
              }`}
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Cart</span>
              {cartCount > 0 && (
                <span className="bg-white text-[#E86024] text-[11px] font-black px-2 py-0.2 rounded-full shadow-xs">
                  {cartCount}
                </span>
              )}
            </button>

            <a
              href="https://www.instagram.com/mina.cafe_/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-semibold px-3 py-1.5 rounded-full text-[#6B5B52] hover:text-[#2A201C] flex items-center gap-1"
            >
              <Instagram className="w-3.5 h-3.5 text-[#E86024]" />
              Instagram
            </a>
          </nav>

          {/* Mobile Hamburguer Toggle + Mobile Cart */}
          <div className="flex md:hidden items-center gap-2">
            <button
              onClick={() => handleNavClick('/cart')}
              className="relative p-2 rounded-full bg-[#FFF0E6] text-[#E86024] hover:bg-[#E86024] hover:text-white transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center border border-[#FCDAC8]"
              aria-label="View Cart"
            >
              <ShoppingBag className="w-5 h-5" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-[#E86024] text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-white shadow-xs">
                  {cartCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl text-[#2A201C] hover:bg-[#F0E6D8] transition-colors focus:outline-none min-h-[40px] min-w-[40px] flex items-center justify-center"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <MenuIcon className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-[#FFFDF9] border-b border-[#EADFCF] px-4 py-4 space-y-3 animate-in slide-in-from-top-2 duration-150">
          <button
            onClick={() => handleNavClick('/')}
            className={`w-full text-left px-4 py-3 rounded-xl text-base font-medium ${
              currentPath === '/' ? 'bg-[#FFF0E6] text-[#E86024] font-semibold' : 'text-[#2A201C] hover:bg-[#FAF6EE]'
            }`}
          >
            Home
          </button>

          <button
            onClick={() => handleNavClick('/menu')}
            className={`w-full text-left px-4 py-3 rounded-xl text-base font-medium flex items-center justify-between ${
              currentPath.startsWith('/menu') || currentPath.startsWith('/product')
                ? 'bg-[#FFF0E6] text-[#E86024] font-semibold'
                : 'text-[#2A201C] hover:bg-[#FAF6EE]'
            }`}
          >
            <span className="flex items-center gap-2">
              <Utensils className="w-5 h-5 text-[#E86024]" />
              Menu Catalog
            </span>
            <span className="text-xs bg-[#E86024] text-white px-2 py-0.5 rounded-full">4 Items</span>
          </button>

          <button
            onClick={() => handleNavClick('/cart')}
            className={`w-full text-left px-4 py-3 rounded-xl text-base font-medium flex items-center justify-between ${
              currentPath === '/cart' ? 'bg-[#FFF0E6] text-[#E86024] font-semibold' : 'text-[#2A201C] hover:bg-[#FAF6EE]'
            }`}
          >
            <span className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-[#E86024]" />
              Guest Shopping Cart
            </span>
            <span className="text-xs font-bold bg-[#FFF0E6] text-[#E86024] px-2.5 py-0.5 rounded-full border border-[#FCDAC8]">
              {cartCount} {cartCount === 1 ? 'item' : 'items'}
            </span>
          </button>

          <div className="pt-2 border-t border-[#F0E6D8] flex items-center justify-between text-xs text-[#6B5B52]">
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-[#E86024]" />
              Karachi Delivery Only
            </span>
            <a
              href="https://www.instagram.com/mina.cafe_/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-[#E86024] font-medium"
            >
              <Instagram className="w-3.5 h-3.5" />
              Follow on Instagram
            </a>
          </div>
        </div>
      )}
    </header>
  );
};
