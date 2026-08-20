import React, { useState } from 'react';
import { Database, AlertCircle, CheckCircle2, ChevronDown, ChevronUp, Copy } from 'lucide-react';

interface SupabaseStatusNoticeProps {
  error: string | null;
  isConfigured: boolean;
  itemCount: number;
}

export const SupabaseStatusNotice: React.FC<SupabaseStatusNoticeProps> = ({
  error,
  isConfigured,
  itemCount,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!error && isConfigured && itemCount > 0) {
    return null; // Database is working perfectly and populated
  }

  const handleCopySQL = () => {
    const sqlText = `-- Mina Cafe Database Schema
-- Run this in Supabase SQL Editor:
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(150) NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  image_url TEXT,
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);`;
    navigator.clipboard.writeText(sqlText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto my-6 px-4">
      <div className="bg-[#FFFDF9] border-2 border-[#E86024]/30 rounded-2xl p-5 shadow-xs">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-[#FFF0E6] text-[#E86024] shrink-0 mt-0.5">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-fraunces text-base font-bold text-[#2A201C] flex items-center gap-2">
                Supabase Database Connection
                {!isConfigured ? (
                  <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-medium">Pending Setup</span>
                ) : error ? (
                  <span className="text-xs bg-rose-100 text-rose-800 px-2 py-0.5 rounded-full font-medium">Schema Action Needed</span>
                ) : (
                  <span className="text-xs bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Connected (0 Items)
                  </span>
                )}
              </h3>
              <p className="text-xs sm:text-sm text-[#6B5B52] mt-1">
                {!isConfigured
                  ? 'Add your VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to environment variables to read live products from Supabase.'
                  : error
                  ? error
                  : 'Your Supabase database is connected! Execute supabase_schema.sql in your Supabase SQL Editor to insert Mina Cafe products.'}
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 text-[#6B5B52] hover:text-[#2A201C] rounded-lg hover:bg-[#FAF6EE] transition-colors shrink-0"
            title="Toggle setup instructions"
          >
            {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
        </div>

        {isExpanded && (
          <div className="mt-4 pt-4 border-t border-[#F0E6D8] space-y-3 text-xs sm:text-sm text-[#2A201C]">
            <p className="font-semibold text-[#2A201C]">Quick Setup Steps for Mina Cafe Database:</p>
            <ol className="list-decimal pl-5 space-y-1.5 text-[#6B5B52]">
              <li>Open your <strong>Supabase Dashboard</strong> and go to the <strong>SQL Editor</strong>.</li>
              <li>Open the file <code className="bg-[#FAF6EE] px-1.5 py-0.5 rounded border border-[#E0D5C5] text-[#E86024]">/supabase_schema.sql</code> in this project repository.</li>
              <li>Paste and click <strong>Run</strong> in Supabase SQL Editor.</li>
              <li>Ensure <code className="bg-[#FAF6EE] px-1.5 py-0.5 rounded border border-[#E0D5C5] text-[#2A201C]">VITE_SUPABASE_URL</code> and <code className="bg-[#FAF6EE] px-1.5 py-0.5 rounded border border-[#E0D5C5] text-[#2A201C]">VITE_SUPABASE_ANON_KEY</code> are configured.</li>
            </ol>
            <div className="pt-1">
              <button
                onClick={handleCopySQL}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#FAF6EE] hover:bg-[#F0E6D8] border border-[#E0D5C5] rounded-lg text-xs font-medium text-[#2A201C] transition-colors"
              >
                <Copy className="w-3.5 h-3.5 text-[#E86024]" />
                {copied ? 'Copied Schema Outline!' : 'Copy SQL Table Outline'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
