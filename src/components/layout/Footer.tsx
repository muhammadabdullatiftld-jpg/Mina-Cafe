import React from 'react';
import { MapPin, Clock, Instagram, Heart } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-[#2A201C] text-[#EADFCF] pt-12 pb-8 border-t border-[#3D302A]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pb-8 border-b border-[#3D302A]">
          {/* Column 1: Brand Info */}
          <div>
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-8 h-8 rounded-full bg-[#E86024] text-white flex items-center justify-center font-fraunces font-bold text-lg">
                M
              </div>
              <span className="font-fraunces text-2xl font-bold tracking-tight text-[#FAF6EE]">
                MINA CAFE
              </span>
            </div>
            <p className="text-sm text-[#A09088] leading-relaxed">
              Handcrafted fresh fruit glasses & creamy milk bottles in Karachi. Simple online ordering, pure ingredients, and fast delivery to your doorstep.
            </p>
          </div>

          {/* Column 2: Location & Operating Hours */}
          <div className="space-y-3">
            <h4 className="font-fraunces text-base font-semibold text-[#FAF6EE]">Location & Stall</h4>
            <div className="flex items-start gap-2.5 text-xs text-[#C2B2A8]">
              <MapPin className="w-4 h-4 text-[#E86024] shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-[#FAF6EE]">Physical Food Stall</p>
                <p>Karachi, Pakistan <span className="text-[#A09088] text-[11px] block mt-0.5">(Exact stall address configuration coming soon)</span></p>
              </div>
            </div>

            <div className="flex items-start gap-2.5 text-xs text-[#C2B2A8] pt-1">
              <Clock className="w-4 h-4 text-[#E86024] shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-[#FAF6EE]">Operating Hours</p>
                <p>4:00 PM – 12:00 AM (Mon – Sun)</p>
              </div>
            </div>
          </div>

          {/* Column 3: Social & Delivery Notice */}
          <div className="space-y-3">
            <h4 className="font-fraunces text-base font-semibold text-[#FAF6EE]">Connect & Order</h4>
            <p className="text-xs text-[#A09088]">
              Follow our reels and daily fresh updates on Instagram.
            </p>
            <a
              href="https://www.instagram.com/mina.cafe_/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#3D302A] text-[#FAF6EE] hover:bg-[#E86024] hover:text-white transition-colors text-xs font-semibold border border-[#4D3F38]"
            >
              <Instagram className="w-4 h-4 text-[#FFAE80]" />
              Visit @mina_cafe Instagram
            </a>
            <div className="pt-2 text-xs text-[#FFAE80] font-medium flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#E86024] animate-pulse"></span>
              Delivering exclusively across Karachi
            </div>
          </div>
        </div>

        {/* Footer Bottom */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-[#A09088] gap-4">
          <p>© {new Date().getFullYear()} Mina Cafe Karachi. All rights reserved.</p>
          <p className="flex items-center gap-1">
            Handcrafted with <Heart className="w-3.5 h-3.5 text-[#E86024] fill-[#E86024]" /> in Karachi
          </p>
        </div>
      </div>
    </footer>
  );
};
