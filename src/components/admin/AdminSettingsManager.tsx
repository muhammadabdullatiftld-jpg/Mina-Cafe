import React, { useState, useEffect } from 'react';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { AdminSettings } from '../../types';
import {
  Settings,
  Store,
  Truck,
  CreditCard,
  MessageCircle,
  Save,
  CheckCircle2,
  AlertCircle,
  Loader2,
  MapPin,
  Clock,
  ShieldCheck,
  RefreshCw,
  Info,
} from 'lucide-react';

export const AdminSettingsManager: React.FC = () => {
  const { session } = useAdminAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Settings State
  const [isTakingOrders, setIsTakingOrders] = useState<boolean>(true);
  const [deliveryFee, setDeliveryFee] = useState<string>('100');
  const [easypaisaNumber, setEasypaisaNumber] = useState<string>('03402694079');
  const [easypaisaTitle, setEasypaisaTitle] = useState<string>('KASHMENA');
  const [whatsappNumber, setWhatsappNumber] = useState<string>('923000000000');
  const [stallLocation, setStallLocation] = useState<string>('Karachi, Pakistan');
  const [openingHours, setOpeningHours] = useState<string>('4:00 PM - 12:00 AM');
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const fetchSettings = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = session?.access_token;
      const res = await fetch('/api/admin/settings', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to fetch business settings.');
      }

      const s: AdminSettings = data.settings;
      setIsTakingOrders(s.is_taking_orders);
      setDeliveryFee(String(s.delivery_fee));
      setEasypaisaNumber(s.easypaisa_number || '03402694079');
      setEasypaisaTitle(s.easypaisa_account_title || 'KASHMENA');
      setWhatsappNumber(s.whatsapp_number || '923000000000');
      setStallLocation(s.stall_location || 'Karachi, Pakistan');
      setOpeningHours(s.opening_hours || '4:00 PM - 12:00 AM');
      setLastUpdated(s.updated_at || null);
    } catch (err: any) {
      setError(err.message || 'Error loading settings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session?.access_token) {
      fetchSettings();
    }
  }, [session?.access_token]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    // Basic Client Validation
    const feeNum = Number(deliveryFee);
    if (isNaN(feeNum) || feeNum < 0) {
      setError('Delivery fee must be a valid non-negative number.');
      return;
    }

    if (!easypaisaNumber.trim()) {
      setError('EasyPaisa account number cannot be empty.');
      return;
    }

    if (!easypaisaTitle.trim()) {
      setError('EasyPaisa account title cannot be empty.');
      return;
    }

    const cleanWa = whatsappNumber.trim().replace(/\D/g, '');
    if (!cleanWa || cleanWa.length < 10) {
      setError('WhatsApp Business number must be at least 10 digits.');
      return;
    }

    setSaving(true);
    try {
      const token = session?.access_token;
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          is_taking_orders: isTakingOrders,
          delivery_fee: feeNum,
          easypaisa_number: easypaisaNumber.trim(),
          easypaisa_account_title: easypaisaTitle.trim(),
          whatsapp_number: cleanWa,
          stall_location: stallLocation.trim(),
          opening_hours: openingHours.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to update business settings.');
      }

      setSuccessMsg(data.message || 'Business settings updated successfully!');
      if (data.settings) {
        const s: AdminSettings = data.settings;
        setIsTakingOrders(s.is_taking_orders);
        setDeliveryFee(String(s.delivery_fee));
        setEasypaisaNumber(s.easypaisa_number);
        setEasypaisaTitle(s.easypaisa_account_title);
        setWhatsappNumber(s.whatsapp_number);
        setStallLocation(s.stall_location);
        setOpeningHours(s.opening_hours);
        setLastUpdated(s.updated_at || new Date().toISOString());
      }
    } catch (err: any) {
      setError(err.message || 'Error saving settings.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-[#FFFDF9] border border-[#EADFCF] rounded-2xl p-8 text-center my-6">
        <Loader2 className="w-8 h-8 text-[#E86024] animate-spin mx-auto mb-3" />
        <p className="text-sm font-semibold text-[#8C7A70]">Loading Business Settings...</p>
      </div>
    );
  }

  const isWhatsappPlaceholder = whatsappNumber === '923000000000';

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-[#FFFDF9] border border-[#EADFCF] rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-[#E86024]" />
            <h2 className="text-lg font-bold text-[#2A201C]">Business & Store Settings</h2>
          </div>
          <p className="text-xs sm:text-sm text-[#8C7A70] mt-1">
            Configure live store availability, delivery charges, EasyPaisa payment receiver details, and WhatsApp contact number.
          </p>
        </div>

        <button
          onClick={fetchSettings}
          disabled={saving}
          className="self-start sm:self-auto px-3.5 py-2 rounded-xl bg-[#FAF6EE] border border-[#EADFCF] text-xs font-semibold text-[#2A201C] hover:bg-[#F2E8D8] transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Settings</span>
        </button>
      </div>

      {/* Alerts */}
      {error && (
        <div className="p-4 rounded-xl bg-[#FDF2F2] border border-[#F8B4B4] text-[#9B1C1C] text-sm flex items-start gap-3">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-bold">Update Failed:</span> {error}
          </div>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-xl bg-[#EDF7ED] border border-[#A2E0A2] text-[#1B5E20] text-sm flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5 text-[#2E7D32]" />
          <div className="flex-1">
            <span className="font-bold">Success:</span> {successMsg}
          </div>
        </div>
      )}

      <form onSubmit={handleSaveSettings} className="space-y-6">
        {/* Section 1: Shop Open / Closed Status */}
        <div className="bg-[#FFFDF9] border border-[#EADFCF] rounded-2xl p-5 sm:p-6 shadow-xs">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[#F2E8D8]">
            <Store className="w-5 h-5 text-[#E86024]" />
            <h3 className="text-base font-bold text-[#2A201C]">Shop Availability Status</h3>
          </div>

          <div className="space-y-4">
            <p className="text-xs text-[#8C7A70]">
              Control whether Mina Cafe is currently open to accept online customer checkout and orders.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label
                className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex items-center gap-3.5 ${
                  isTakingOrders
                    ? 'border-[#2E7D32] bg-[#F2F9F2]'
                    : 'border-[#EADFCF] bg-[#FFFDF9] hover:bg-[#FAF6EE]'
                }`}
              >
                <input
                  type="radio"
                  name="isTakingOrders"
                  checked={isTakingOrders === true}
                  onChange={() => setIsTakingOrders(true)}
                  className="w-4 h-4 text-[#2E7D32] accent-[#2E7D32]"
                />
                <div>
                  <div className="text-sm font-bold text-[#1B5E20] flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#2E7D32] animate-pulse"></span>
                    <span>Shop Open (Taking Orders)</span>
                  </div>
                  <p className="text-xs text-[#4B634B] mt-0.5">
                    Customers can browse, add to cart, and complete checkout.
                  </p>
                </div>
              </label>

              <label
                className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex items-center gap-3.5 ${
                  !isTakingOrders
                    ? 'border-[#C81E1E] bg-[#FDF2F2]'
                    : 'border-[#EADFCF] bg-[#FFFDF9] hover:bg-[#FAF6EE]'
                }`}
              >
                <input
                  type="radio"
                  name="isTakingOrders"
                  checked={isTakingOrders === false}
                  onChange={() => setIsTakingOrders(false)}
                  className="w-4 h-4 text-[#C81E1E] accent-[#C81E1E]"
                />
                <div>
                  <div className="text-sm font-bold text-[#9B1C1C] flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#C81E1E]"></span>
                    <span>Shop Closed (Orders Paused)</span>
                  </div>
                  <p className="text-xs text-[#7F1D1D] mt-0.5">
                    Public notice is shown and new checkouts are safely blocked.
                  </p>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Section 2: Delivery Fee */}
        <div className="bg-[#FFFDF9] border border-[#EADFCF] rounded-2xl p-5 sm:p-6 shadow-xs">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[#F2E8D8]">
            <Truck className="w-5 h-5 text-[#E86024]" />
            <h3 className="text-base font-bold text-[#2A201C]">Karachi Delivery Fee</h3>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[#2A201C] uppercase tracking-wide mb-1.5">
                Delivery Fee (PKR) <span className="text-[#E86024]">*</span>
              </label>
              <div className="relative max-w-xs">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-[#8C7A70]">
                  Rs.
                </span>
                <input
                  type="number"
                  min="0"
                  step="50"
                  value={deliveryFee}
                  onChange={(e) => setDeliveryFee(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#EADFCF] bg-white text-sm font-bold text-[#2A201C] focus:outline-hidden focus:border-[#E86024] focus:ring-1 focus:ring-[#E86024]"
                  placeholder="100"
                  required
                />
              </div>
              <p className="text-xs text-[#8C7A70] mt-1.5">
                Enter 0 for free delivery. Updated fee applies to future checkouts; completed historical orders are never recalculated.
              </p>
            </div>
          </div>
        </div>

        {/* Section 3: EasyPaisa Account Details */}
        <div className="bg-[#FFFDF9] border border-[#EADFCF] rounded-2xl p-5 sm:p-6 shadow-xs">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[#F2E8D8]">
            <CreditCard className="w-5 h-5 text-[#E86024]" />
            <h3 className="text-base font-bold text-[#2A201C]">EasyPaisa Payment Receiver Info</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#2A201C] uppercase tracking-wide mb-1.5">
                EasyPaisa Mobile/Account Number <span className="text-[#E86024]">*</span>
              </label>
              <input
                type="text"
                value={easypaisaNumber}
                onChange={(e) => setEasypaisaNumber(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#EADFCF] bg-white text-sm font-bold text-[#2A201C] focus:outline-hidden focus:border-[#E86024] focus:ring-1 focus:ring-[#E86024]"
                placeholder="03402694079"
                required
              />
              <p className="text-xs text-[#8C7A70] mt-1">
                Displayed to customers on the EasyPaisa payment instructions screen.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#2A201C] uppercase tracking-wide mb-1.5">
                EasyPaisa Account Title <span className="text-[#E86024]">*</span>
              </label>
              <input
                type="text"
                value={easypaisaTitle}
                onChange={(e) => setEasypaisaTitle(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#EADFCF] bg-white text-sm font-bold text-[#2A201C] focus:outline-hidden focus:border-[#E86024] focus:ring-1 focus:ring-[#E86024]"
                placeholder="KASHMENA"
                required
              />
              <p className="text-xs text-[#8C7A70] mt-1">
                Account owner title for verification before sending funds.
              </p>
            </div>
          </div>
        </div>

        {/* Section 4: WhatsApp Business Number */}
        <div className="bg-[#FFFDF9] border border-[#EADFCF] rounded-2xl p-5 sm:p-6 shadow-xs">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[#F2E8D8]">
            <MessageCircle className="w-5 h-5 text-[#25D366]" />
            <h3 className="text-base font-bold text-[#2A201C]">WhatsApp Business Contact Number</h3>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-[#2A201C] uppercase tracking-wide mb-1.5">
                Official WhatsApp Business Number <span className="text-[#E86024]">*</span>
              </label>
              <input
                type="text"
                value={whatsappNumber}
                onChange={(e) => setWhatsappNumber(e.target.value)}
                className="w-full max-w-md px-3.5 py-2.5 rounded-xl border border-[#EADFCF] bg-white text-sm font-bold text-[#2A201C] focus:outline-hidden focus:border-[#E86024] focus:ring-1 focus:ring-[#E86024]"
                placeholder="923000000000 or 03001234567"
                required
              />
              <p className="text-xs text-[#8C7A70] mt-1">
                Customer order confirmation WhatsApp button will redirect to this number.
              </p>
            </div>

            {isWhatsappPlaceholder && (
              <div className="p-3.5 rounded-xl bg-[#FFF8E7] border border-[#F2D696] text-xs text-[#7A5A00] flex items-start gap-2.5">
                <Info className="w-4 h-4 shrink-0 text-[#E86024] mt-0.5" />
                <div>
                  <span className="font-bold">Placeholder Notice:</span> Current WhatsApp number is set to placeholder <code className="bg-[#FFEBB3] px-1 py-0.5 rounded text-[#2A201C] font-mono">923000000000</code>. Replace this with Mina Cafe's official phone number when available.
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Section 5: Stall Info (Location & Hours) */}
        <div className="bg-[#FFFDF9] border border-[#EADFCF] rounded-2xl p-5 sm:p-6 shadow-xs">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[#F2E8D8]">
            <MapPin className="w-5 h-5 text-[#E86024]" />
            <h3 className="text-base font-bold text-[#2A201C]">Stall Location & Operating Hours</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#2A201C] uppercase tracking-wide mb-1.5">
                Stall Location Info
              </label>
              <input
                type="text"
                value={stallLocation}
                onChange={(e) => setStallLocation(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#EADFCF] bg-white text-sm text-[#2A201C] focus:outline-hidden focus:border-[#E86024] focus:ring-1 focus:ring-[#E86024]"
                placeholder="Karachi, Pakistan"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#2A201C] uppercase tracking-wide mb-1.5">
                Operating Hours Display Text
              </label>
              <input
                type="text"
                value={openingHours}
                onChange={(e) => setOpeningHours(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#EADFCF] bg-white text-sm text-[#2A201C] focus:outline-hidden focus:border-[#E86024] focus:ring-1 focus:ring-[#E86024]"
                placeholder="4:00 PM - 12:00 AM"
              />
            </div>
          </div>
        </div>

        {/* Save Controls */}
        <div className="bg-[#FFFDF9] border border-[#EADFCF] rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-[#8C7A70] flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-[#2E7D32]" />
            <span>Updates require authenticated admin authorization.</span>
            {lastUpdated && (
              <span className="hidden md:inline text-[#A8988E]">
                • Last saved: {new Date(lastUpdated).toLocaleTimeString()}
              </span>
            )}
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[#E86024] text-white text-sm font-bold shadow-sm hover:bg-[#D45018] active:scale-98 disabled:opacity-50 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving Settings...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save All Business Settings</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
