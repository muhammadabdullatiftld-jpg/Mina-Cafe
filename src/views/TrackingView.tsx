import React, { useState, useEffect } from 'react';
import { formatPKR, setPageTitleAndMeta } from '../lib/utils';
import { generateWhatsAppOrderUrl } from '../lib/whatsapp';
import {
  Clock,
  CheckCircle2,
  AlertCircle,
  Truck,
  MapPin,
  Phone,
  User,
  ShoppingBag,
  RefreshCw,
  ExternalLink,
  MessageCircle,
  ArrowLeft,
  Copy,
  Check,
} from 'lucide-react';

interface TrackingViewProps {
  trackingToken: string;
  onNavigateToMenu: () => void;
}

const ORDER_STAGES = [
  { key: 'Pending Payment', label: 'Pending Payment' },
  { key: 'Verification Pending', label: 'Verification Pending' },
  { key: 'Payment Verified', label: 'Payment Verified' },
  { key: 'Preparing', label: 'Preparing' },
  { key: 'Ready', label: 'Ready for Delivery' },
  { key: 'Completed', label: 'Delivered' },
];

export const TrackingView: React.FC<TrackingViewProps> = ({
  trackingToken,
  onNavigateToMenu,
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [trackingData, setTrackingData] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);

  const fetchTrackingInfo = async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);

    setError(null);

    try {
      const response = await fetch(`/api/orders/track/${encodeURIComponent(trackingToken)}`);
      const data = await response.json();

      if (!response.ok || !data.success) {
        setError(data.error || 'Could not locate order details for this tracking link.');
        setTrackingData(null);
        return;
      }

      setTrackingData(data);
      if (data.order?.orderRef) {
        setPageTitleAndMeta(
          `Track Order ${data.order.orderRef}`,
          `Track live status for order ${data.order.orderRef} at Mina Cafe Karachi.`
        );
      }
    } catch (err: any) {
      console.error('Tracking fetch error:', err);
      setError('Network error while retrieving order status.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTrackingInfo();
  }, [trackingToken]);

  const handleCopyTrackingLink = () => {
    const url = `${window.location.origin}/track/${trackingToken}`;
    navigator.clipboard.writeText(url);
    setCopiedToken(true);
    setTimeout(() => setCopiedToken(false), 2500);
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-4">
        <div className="w-12 h-12 border-4 border-[#E86024] border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs font-semibold text-[#8C7A70]">Loading your order status...</p>
      </div>
    );
  }

  if (error || !trackingData?.order) {
    return (
      <div className="max-w-xl mx-auto px-4 py-12 space-y-6">
        <div className="bg-[#FFFDF9] border border-rose-200 rounded-3xl p-8 text-center space-y-4 shadow-sm">
          <div className="w-14 h-14 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="font-fraunces text-xl font-bold text-[#2A201C]">
            Order Not Found
          </h2>
          <p className="text-xs sm:text-sm text-[#6B5B52]">
            {error || 'We could not find an order matching this secure tracking token.'}
          </p>
          <button
            onClick={onNavigateToMenu}
            className="px-6 py-3 rounded-2xl bg-[#E86024] hover:bg-[#D05018] text-white text-xs font-bold uppercase tracking-wider inline-flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Menu</span>
          </button>
        </div>
      </div>
    );
  }

  const { order, items = [], payment, settings } = trackingData;
  const isCancelled = order.status === 'Cancelled';

  // Determine current stage index in timeline
  const currentStageIndex = ORDER_STAGES.findIndex((s) => s.key === order.status);

  // Generate WhatsApp message URL
  const whatsAppUrl = generateWhatsAppOrderUrl(settings?.whatsappNumber || '923000000000', {
    orderRef: order.orderRef,
    customerName: order.customerName,
    phone: order.phone,
    address: order.address,
    city: order.city,
    items: items.map((i: any) => ({
      productName: i.productName,
      quantity: i.quantity,
      selectedToppings: i.selectedToppings,
      itemTotal: i.itemTotal,
    })),
    subtotal: order.subtotal,
    deliveryFee: order.deliveryFee,
    totalAmount: order.totalAmount,
    transactionId: payment?.transactionId,
    notes: order.notes,
  });

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-8">
      {/* Top Header Card */}
      <div className="bg-[#FFFDF9] border border-[#F0E6D8] rounded-3xl p-6 sm:p-8 space-y-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#F0E6D8] pb-6">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-widest text-[#E86024]">
              Mina Cafe Order Status
            </span>
            <h1 className="font-fraunces text-2xl sm:text-3xl font-bold text-[#2A201C] pt-1">
              Order #{order.orderRef}
            </h1>
            <p className="text-xs text-[#8C7A70] pt-1">
              Placed on {new Date(order.createdAt).toLocaleString('en-PK', { dateStyle: 'medium', timeStyle: 'short' })}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchTrackingInfo(true)}
              disabled={refreshing}
              className="p-2.5 rounded-xl border border-[#EADFCF] bg-[#FAF6EE] hover:bg-[#F0E6D8] text-[#2A201C] text-xs font-semibold inline-flex items-center gap-1.5 transition-all"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-[#E86024] ${refreshing ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>

            <button
              onClick={handleCopyTrackingLink}
              className="p-2.5 rounded-xl border border-[#EADFCF] bg-[#FAF6EE] hover:bg-[#F0E6D8] text-[#2A201C] text-xs font-semibold inline-flex items-center gap-1.5 transition-all"
            >
              {copiedToken ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700">Link Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-[#E86024]" />
                  <span>Copy Link</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Status Timeline */}
        {isCancelled ? (
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-center space-y-2">
            <div className="inline-flex items-center justify-center p-2 rounded-full bg-rose-100 text-rose-700">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-rose-800 text-sm">Order Cancelled</h3>
            <p className="text-xs text-rose-600">
              This order has been marked as cancelled. Please contact Mina Cafe on WhatsApp if you have questions.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#8C7A70]">
              Delivery Progress Timeline
            </h3>

            {/* Stepper bar */}
            <div className="relative">
              <div className="hidden md:grid grid-cols-6 gap-2">
                {ORDER_STAGES.map((stage, idx) => {
                  const isDone = currentStageIndex > idx;
                  const isCurrent = currentStageIndex === idx;

                  return (
                    <div key={stage.key} className="flex flex-col items-center text-center space-y-2">
                      <div
                        className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                          isDone
                            ? 'bg-emerald-600 text-white'
                            : isCurrent
                            ? 'bg-[#E86024] text-white ring-4 ring-[#E86024]/20 animate-pulse'
                            : 'bg-[#EADFCF] text-[#8C7A70]'
                        }`}
                      >
                        {isDone ? <CheckCircle2 className="w-5 h-5" /> : idx + 1}
                      </div>
                      <span
                        className={`text-[11px] font-semibold leading-tight ${
                          isCurrent
                            ? 'text-[#E86024] font-bold'
                            : isDone
                            ? 'text-emerald-800'
                            : 'text-[#8C7A70]'
                        }`}
                      >
                        {stage.label}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Mobile Stepper */}
              <div className="md:hidden space-y-3">
                {ORDER_STAGES.map((stage, idx) => {
                  const isDone = currentStageIndex > idx;
                  const isCurrent = currentStageIndex === idx;

                  return (
                    <div
                      key={stage.key}
                      className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                        isCurrent
                          ? 'bg-[#FFF0E6] border-[#FCD5C1] text-[#E86024]'
                          : isDone
                          ? 'bg-emerald-50/70 border-emerald-200 text-emerald-800'
                          : 'bg-[#FAF6EE] border-[#EADFCF] text-[#8C7A70] opacity-60'
                      }`}
                    >
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                          isDone
                            ? 'bg-emerald-600 text-white'
                            : isCurrent
                            ? 'bg-[#E86024] text-white'
                            : 'bg-[#EADFCF] text-[#8C7A70]'
                        }`}
                      >
                        {isDone ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-xs font-bold block">{stage.label}</span>
                        {isCurrent && (
                          <span className="text-[10px] text-[#E86024] font-semibold block">
                            Current Stage
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* WhatsApp Confirmation Banner */}
      <div className="bg-[#25D366]/10 border border-[#25D366]/30 rounded-3xl p-6 sm:p-8 space-y-4 text-center">
        <div className="w-12 h-12 bg-[#25D366] text-white rounded-2xl flex items-center justify-center mx-auto shadow-sm">
          <MessageCircle className="w-7 h-7" />
        </div>
        <div className="space-y-1">
          <h3 className="font-fraunces text-lg font-bold text-[#128C7E]">
            Confirm Order via WhatsApp
          </h3>
          <p className="text-xs text-[#2A201C] max-w-md mx-auto">
            Connect directly with Mina Cafe on WhatsApp to verify your payment and expedite order preparation in Karachi.
          </p>
        </div>

        <a
          href={whatsAppUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold text-xs sm:text-sm uppercase tracking-wider shadow-md transition-all active:scale-[0.98] min-h-[48px]"
        >
          <MessageCircle className="w-4 h-4 fill-white text-transparent" />
          <span>Confirm Order on WhatsApp</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>

      {/* Payment & Customer Information Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Payment Details */}
        <div className="bg-[#FFFDF9] border border-[#F0E6D8] rounded-3xl p-6 space-y-4">
          <h3 className="font-fraunces text-base font-bold text-[#2A201C] border-b border-[#F0E6D8] pb-3 flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#E86024]" />
            EasyPaisa Payment Info
          </h3>

          <div className="space-y-2.5 text-xs">
            <div className="flex justify-between">
              <span className="text-[#8C7A70]">Payment Method:</span>
              <span className="font-bold text-[#2A201C]">EasyPaisa Mobile Account</span>
            </div>

            <div className="flex justify-between">
              <span className="text-[#8C7A70]">Account Title:</span>
              <span className="font-bold text-[#2A201C]">
                {settings?.easypaisaAccountTitle || 'KASHMENA'}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-[#8C7A70]">EasyPaisa Number:</span>
              <span className="font-mono font-bold text-[#2A201C]">
                {settings?.easypaisaNumber || '03402694079'}
              </span>
            </div>

            <div className="flex justify-between items-center border-t border-[#F0E6D8] pt-2">
              <span className="text-[#8C7A70]">Transaction ID:</span>
              <span className="font-mono font-bold text-[#E86024]">
                {payment?.transactionId || 'PENDING'}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-[#8C7A70]">Payment Verification:</span>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                {payment?.paymentStatus || 'Verification Pending'}
              </span>
            </div>

            {payment?.paymentProofUrl && (
              <div className="pt-2 border-t border-[#F0E6D8]">
                <span className="text-[#8C7A70] block mb-1">Payment Proof Submitted:</span>
                <a
                  href={payment.paymentProofUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-[#E86024] underline hover:text-[#D05018] inline-flex items-center gap-1 font-semibold"
                >
                  View Uploaded Receipt
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Customer & Address Details */}
        <div className="bg-[#FFFDF9] border border-[#F0E6D8] rounded-3xl p-6 space-y-4">
          <h3 className="font-fraunces text-base font-bold text-[#2A201C] border-b border-[#F0E6D8] pb-3 flex items-center gap-2">
            <User className="w-4 h-4 text-[#E86024]" />
            Customer & Delivery Details
          </h3>

          <div className="space-y-2.5 text-xs">
            <div className="flex justify-between">
              <span className="text-[#8C7A70] flex items-center gap-1">
                <User className="w-3 h-3 text-[#E86024]" /> Name:
              </span>
              <span className="font-bold text-[#2A201C]">{order.customerName}</span>
            </div>

            <div className="flex justify-between">
              <span className="text-[#8C7A70] flex items-center gap-1">
                <Phone className="w-3 h-3 text-[#E86024]" /> Phone:
              </span>
              <span className="font-mono font-bold text-[#2A201C]">{order.phone}</span>
            </div>

            <div className="flex justify-between">
              <span className="text-[#8C7A70] flex items-center gap-1">
                <MapPin className="w-3 h-3 text-[#E86024]" /> City:
              </span>
              <span className="font-bold text-[#2A201C]">{order.city}</span>
            </div>

            <div className="border-t border-[#F0E6D8] pt-2">
              <span className="text-[#8C7A70] block mb-1 flex items-center gap-1">
                <MapPin className="w-3 h-3 text-[#E86024]" /> Delivery Address:
              </span>
              <p className="font-medium text-[#2A201C] bg-[#FAF6EE] p-2.5 rounded-xl border border-[#EADFCF]">
                {order.address}
              </p>
            </div>

            {order.notes && (
              <div className="border-t border-[#F0E6D8] pt-2">
                <span className="text-[#8C7A70] block mb-1">Notes:</span>
                <p className="text-xs text-[#6B5B52] italic bg-[#FAF6EE] p-2 rounded-lg border border-[#EADFCF]">
                  "{order.notes}"
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Order Items Summary */}
      <div className="bg-[#FFFDF9] border border-[#F0E6D8] rounded-3xl p-6 sm:p-8 space-y-4">
        <h3 className="font-fraunces text-lg font-bold text-[#2A201C] border-b border-[#F0E6D8] pb-3 flex items-center gap-2">
          <ShoppingBag className="w-5 h-5 text-[#E86024]" />
          Order Items Breakdown
        </h3>

        <div className="divide-y divide-[#F0E6D8]">
          {items.map((item: any) => (
            <div key={item.id} className="py-3 flex justify-between items-start text-xs sm:text-sm">
              <div>
                <span className="font-bold text-[#2A201C]">{item.quantity}x</span>{' '}
                <span className="font-semibold text-[#2A201C]">{item.productName}</span>
                {item.selectedToppings && item.selectedToppings.length > 0 && (
                  <div className="text-xs text-[#E86024] font-medium pt-0.5">
                    + Toppings: {item.selectedToppings.join(', ')}
                  </div>
                )}
              </div>
              <span className="font-mono font-bold text-[#2A201C]">
                {formatPKR(item.itemTotal)}
              </span>
            </div>
          ))}
        </div>

        <div className="border-t-2 border-[#F0E6D8] pt-4 space-y-2 text-xs sm:text-sm">
          <div className="flex justify-between text-[#6B5B52]">
            <span>Subtotal:</span>
            <span className="font-mono font-semibold">{formatPKR(order.subtotal)}</span>
          </div>

          <div className="flex justify-between text-[#6B5B52]">
            <span className="flex items-center gap-1">
              <Truck className="w-3.5 h-3.5 text-[#E86024]" />
              Delivery Fee (Karachi):
            </span>
            <span className="font-mono font-semibold text-[#E86024]">
              {formatPKR(order.deliveryFee)}
            </span>
          </div>

          <div className="border-t border-[#F0E6D8] pt-3 flex justify-between items-center font-bold text-base text-[#2A201C]">
            <span>Grand Total:</span>
            <span className="font-fraunces font-black text-xl text-[#E86024]">
              {formatPKR(order.totalAmount)}
            </span>
          </div>
        </div>
      </div>

      {/* Footer Navigation Action */}
      <div className="text-center pt-2">
        <button
          onClick={onNavigateToMenu}
          className="px-8 py-3.5 rounded-2xl bg-[#E86024] hover:bg-[#D05018] text-white font-bold text-xs uppercase tracking-wider inline-flex items-center gap-2 transition-all shadow-md"
        >
          <span>Return to Menu Catalog</span>
        </button>
      </div>
    </div>
  );
};
