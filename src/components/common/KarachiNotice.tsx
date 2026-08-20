import React from 'react';
import { MapPin } from 'lucide-react';

interface KarachiNoticeProps {
  className?: string;
  variant?: 'banner' | 'card' | 'inline';
}

export const KarachiNotice: React.FC<KarachiNoticeProps> = ({
  className = '',
  variant = 'banner',
}) => {
  if (variant === 'inline') {
    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FFF0E6] text-[#E86024] text-xs font-medium border border-[#FCDAC8] ${className}`}>
        <MapPin className="w-3.5 h-3.5 shrink-0" />
        Karachi Delivery Only
      </span>
    );
  }

  if (variant === 'card') {
    return (
      <div className={`bg-[#FFFDF9] border border-[#F0E6D8] rounded-2xl p-4 shadow-xs text-center ${className}`}>
        <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-[#FFF0E6] text-[#E86024] mb-2">
          <MapPin className="w-5 h-5" />
        </div>
        <h4 className="font-fraunces text-base font-semibold text-[#2A201C]">Delivery Area</h4>
        <p className="text-sm text-[#6B5B52] mt-1">
          We currently deliver only in <strong className="text-[#2A201C] font-semibold">Karachi</strong>.
        </p>
      </div>
    );
  }

  return (
    <div className={`bg-[#2A201C] text-[#FAF6EE] py-2 px-4 text-center text-xs sm:text-sm font-medium flex items-center justify-center gap-2 border-b border-[#3D302A] ${className}`}>
      <MapPin className="w-4 h-4 text-[#E86024] shrink-0" />
      <span>We currently deliver only in <strong className="text-[#FFAE80] font-semibold">Karachi</strong>.</span>
    </div>
  );
};
