import React, { useState, useEffect } from 'react';
import { useAdminAuth } from '../context/AdminAuthContext';
import { setPageTitleAndMeta } from '../lib/utils';
import { AdminOrdersList } from '../components/admin/AdminOrdersList';
import { AdminProductsManager } from '../components/admin/AdminProductsManager';
import { AdminToppingsManager } from '../components/admin/AdminToppingsManager';
import { AdminSettingsManager } from '../components/admin/AdminSettingsManager';
import {
  ShieldCheck,
  LogOut,
  ShoppingBag,
  Package,
  Layers,
  Settings,
  Store,
  ExternalLink,
  CheckCircle2,
  Clock,
  UserCheck,
} from 'lucide-react';

interface AdminDashboardShellProps {
  onNavigateHome: () => void;
  onLogout: () => void;
}

export const AdminDashboardShell: React.FC<AdminDashboardShellProps> = ({
  onNavigateHome,
  onLogout,
}) => {
  const { adminUser, logout } = useAdminAuth();
  const [activeTab, setActiveTab] = useState<'orders' | 'products' | 'toppings' | 'settings'>('orders');

  useEffect(() => {
    setPageTitleAndMeta('Admin Dashboard', 'Mina Cafe Karachi Administrative Control Panel');
  }, []);

  const handleLogout = async () => {
    await logout();
    onLogout();
  };

  return (
    <div className="min-h-screen bg-[#FAF6EE] flex flex-col font-sans text-[#2A201C]">
      {/* Top Admin Header Bar */}
      <header className="bg-[#FFFDF9] border-b border-[#F0E6D8] sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between gap-4">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-[#E86024] text-white rounded-xl flex items-center justify-center font-fraunces font-black text-lg shadow-sm">
              M
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-fraunces font-bold text-base text-[#2A201C] leading-none">
                  Mina Cafe
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-[#FFF0E6] text-[#E86024] px-2 py-0.5 rounded border border-[#FCD5C1]">
                  Admin Portal
                </span>
              </div>
              <span className="text-[11px] text-[#8C7A70] block pt-0.5">
                Karachi Delivery Operations
              </span>
            </div>
          </div>

          {/* Right Header Actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={onNavigateHome}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#EADFCF] bg-[#FAF6EE] hover:bg-[#F0E6D8] text-xs font-bold text-[#2A201C] transition-colors"
            >
              <Store className="w-3.5 h-3.5 text-[#E86024]" />
              <span>Customer Storefront</span>
              <ExternalLink className="w-3 h-3 text-[#8C7A70]" />
            </button>

            {adminUser && (
              <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FAF6EE] border border-[#EADFCF] text-xs text-[#2A201C]">
                <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span className="font-mono font-bold text-[11px]">{adminUser.email}</span>
              </div>
            )}

            <button
              onClick={handleLogout}
              className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold inline-flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Admin Area */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Title Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E0D5C5] pb-4">
          <div>
            <h1 className="font-fraunces text-2xl sm:text-3xl font-bold text-[#2A201C]">
              Admin Management Portal
            </h1>
            <p className="text-xs sm:text-sm text-[#8C7A70] pt-0.5">
              Manage live orders, catalog products, topping options, and pricing rules for Mina Cafe Karachi.
            </p>
          </div>

          <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold shrink-0">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Server Authenticated Admin</span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto border-b border-[#E0D5C5] pb-2">
          <button
            onClick={() => setActiveTab('orders')}
            className={`px-4 py-2 rounded-xl text-xs font-bold shrink-0 flex items-center gap-1.5 transition-colors ${
              activeTab === 'orders'
                ? 'bg-[#E86024] text-white shadow-xs'
                : 'bg-[#FFFDF9] text-[#2A201C] border border-[#EADFCF] hover:bg-[#FAF6EE]'
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>Orders & Payments</span>
          </button>

          <button
            onClick={() => setActiveTab('products')}
            className={`px-4 py-2 rounded-xl text-xs font-bold shrink-0 flex items-center gap-1.5 transition-colors ${
              activeTab === 'products'
                ? 'bg-[#E86024] text-white shadow-xs'
                : 'bg-[#FFFDF9] text-[#2A201C] border border-[#EADFCF] hover:bg-[#FAF6EE]'
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            <span>Products Management</span>
          </button>

          <button
            onClick={() => setActiveTab('toppings')}
            className={`px-4 py-2 rounded-xl text-xs font-bold shrink-0 flex items-center gap-1.5 transition-colors ${
              activeTab === 'toppings'
                ? 'bg-[#E86024] text-white shadow-xs'
                : 'bg-[#FFFDF9] text-[#2A201C] border border-[#EADFCF] hover:bg-[#FAF6EE]'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Toppings Catalog</span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-2 rounded-xl text-xs font-bold shrink-0 flex items-center gap-1.5 transition-colors ${
              activeTab === 'settings'
                ? 'bg-[#E86024] text-white shadow-xs'
                : 'bg-[#FFFDF9] text-[#2A201C] border border-[#EADFCF] hover:bg-[#FAF6EE]'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Business & Store Settings</span>
          </button>
        </div>

        {/* Active Tab Content */}
        {activeTab === 'orders' && <AdminOrdersList />}
        {activeTab === 'products' && <AdminProductsManager />}
        {activeTab === 'toppings' && <AdminToppingsManager />}
        {activeTab === 'settings' && <AdminSettingsManager />}
      </div>
    </div>
  );
};
