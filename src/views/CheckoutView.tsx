import React, { useState, useEffect } from 'react';
import { useCart } from '../context/CartContext';
import { formatPKR, setPageTitleAndMeta } from '../lib/utils';
import { fetchAdminSettings } from '../lib/settingsService';
import { OrderCreateResponse, AdminSettings } from '../types';
import { generateWhatsAppOrderUrl } from '../lib/whatsapp';
import { KarachiNotice } from '../components/common/KarachiNotice';
import {
  ShoppingBag,
  ArrowLeft,
  CheckCircle,
  Truck,
  AlertCircle,
  Clock,
  MapPin,
  Phone,
  User,
  FileText,
  Copy,
  Check,
  Upload,
  MessageCircle,
  ExternalLink,
  Loader2,
  ShieldCheck,
  CreditCard,
  Image as ImageIcon,
} from 'lucide-react';

interface CheckoutViewProps {
  onNavigateToMenu: () => void;
  onNavigateToCart: () => void;
  onNavigateToTracking?: (trackingToken: string) => void;
}

export const CheckoutView: React.FC<CheckoutViewProps> = ({
  onNavigateToMenu,
  onNavigateToCart,
  onNavigateToTracking,
}) => {
  const { cartItems, cartCount, cartSubtotal, clearCart, orderType } = useCart();

  // Step 1 Form state
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city] = useState('Karachi');
  const [notes, setNotes] = useState('');

  // Settings
  const [adminSettings, setAdminSettings] = useState<AdminSettings | null>(null);
  const [deliveryFee, setDeliveryFee] = useState<number>(100);
  const [loadingSettings, setLoadingSettings] = useState(true);

  // Statuses
  const [submittingOrder, setSubmittingOrder] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);

  // Completed order step (1: Order placed, 2: Payment submitted)
  const [createdOrder, setCreatedOrder] = useState<OrderCreateResponse | null>(null);

  // Step 2 Payment form state
  const [transactionId, setTransactionId] = useState('');
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paymentSubmitted, setPaymentSubmitted] = useState(false);

  // UI state
  const [copiedNumber, setCopiedNumber] = useState(false);

  useEffect(() => {
    setPageTitleAndMeta(
      'Karachi Delivery Checkout | Mina Cafe',
      'Complete your order for fresh fruit glass and milk bottles in Karachi.'
    );

    const loadSettings = async () => {
      setLoadingSettings(true);
      const res = await fetchAdminSettings();
      if (res.settings) {
        setAdminSettings(res.settings);
      }
      if (res.deliveryFee !== null) {
        setDeliveryFee(res.deliveryFee);
      }
      setLoadingSettings(false);
    };

    loadSettings();
  }, []);

  const activeDeliveryFee = orderType === 'takeaway' ? 0 : deliveryFee;
  const grandTotal = cartSubtotal + (cartItems.length > 0 ? activeDeliveryFee : 0);

  // EasyPaisa account details from confirmed config or fallback
  const easypaisaNumber = adminSettings?.easypaisa_number || '03402694079';
  const easypaisaTitle = adminSettings?.easypaisa_account_title || 'KASHMENA';
  const whatsappNumber = adminSettings?.whatsapp_number || '923000000000';

  /* Step 1: Submit Order */
  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setOrderError(null);

    if (!customerName.trim() || customerName.trim().length < 2) {
      setOrderError('Please enter your full name (at least 2 characters).');
      return;
    }

    if (!phone.trim() || phone.trim().length < 10) {
      setOrderError('Please enter a valid phone or WhatsApp number (min 10 digits).');
      return;
    }

    if (orderType === 'delivery') {
      if (!address.trim() || address.trim().length < 5) {
        setOrderError('Please enter a complete delivery address in Karachi.');
        return;
      }

      if (city.toLowerCase() !== 'karachi') {
        setOrderError('We currently deliver only in Karachi.');
        return;
      }
    }

    if (cartItems.length === 0) {
      setOrderError('Your cart is empty. Please add items before checking out.');
      return;
    }

    setSubmittingOrder(true);

    try {
      const payload = {
        customer: {
          customerName: customerName.trim(),
          phone: phone.trim(),
          address: orderType === 'takeaway' ? 'Takeaway (Self Pickup)' : address.trim(),
          city: 'Karachi',
          notes: notes.trim() || undefined,
        },
        items: cartItems.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          selectedToppingIds: item.selectedToppingIds,
        })),
      };

      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data: OrderCreateResponse = await response.json();

      if (!response.ok || !data.success) {
        setOrderError(data.error || 'Could not place your order. Please check your details.');
        setSubmittingOrder(false);
        return;
      }

      // Success! Clear guest cart & store created order
      clearCart();
      setCreatedOrder(data);
    } catch (err: any) {
      console.error('Order creation error:', err);
      setOrderError(err.message || 'Network error occurred while creating order.');
    } finally {
      setSubmittingOrder(false);
    }
  };

  /* Step 2: Copy EasyPaisa Number */
  const handleCopyNumber = () => {
    navigator.clipboard.writeText(easypaisaNumber);
    setCopiedNumber(true);
    setTimeout(() => setCopiedNumber(false), 2500);
  };

  /* File upload validation and conversion */
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPaymentError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
    if (!validTypes.includes(file.type.toLowerCase())) {
      setPaymentError('Invalid image format. Please upload a JPEG, PNG, or WebP image.');
      return;
    }

    const maxSizeBytes = 5 * 1024 * 1024; // 5 MB
    if (file.size > maxSizeBytes) {
      setPaymentError('Screenshot image exceeds 5MB limit. Please upload a smaller image.');
      return;
    }

    setScreenshotFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setScreenshotPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  /* Step 2: Submit Payment Details */
  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setPaymentError(null);

    if (!createdOrder?.trackingToken) {
      setPaymentError('Missing tracking token. Please refresh or recreate order.');
      return;
    }

    if (!transactionId.trim() || transactionId.trim().length < 3) {
      setPaymentError('Please enter a valid EasyPaisa Transaction ID.');
      return;
    }

    setSubmittingPayment(true);

    try {
      const payload = {
        trackingToken: createdOrder.trackingToken,
        transactionId: transactionId.trim(),
        screenshotBase64: screenshotPreview || undefined,
        screenshotFileName: screenshotFile?.name || undefined,
      };

      const response = await fetch('/api/payments/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setPaymentError(data.error || 'Could not process payment submission.');
        setSubmittingPayment(false);
        return;
      }

      setPaymentSubmitted(true);
    } catch (err: any) {
      console.error('Payment submission error:', err);
      setPaymentError(err.message || 'Network error submitting payment proof.');
    } finally {
      setSubmittingPayment(false);
    }
  };

  /* Render Step 3: Payment Submitted & WhatsApp Confirmation */
  if (createdOrder && paymentSubmitted) {
    const whatsAppUrl = generateWhatsAppOrderUrl(whatsappNumber, {
      orderRef: createdOrder.orderRef || 'MINA-ORDER',
      customerName,
      phone,
      address,
      city: 'Karachi',
      items: [], // Summary will display total
      subtotal: createdOrder.subtotal ?? 0,
      deliveryFee: createdOrder.deliveryFee ?? activeDeliveryFee,
      totalAmount: createdOrder.totalAmount ?? grandTotal,
      transactionId,
      notes,
    });

    return (
      <div className="max-w-2xl mx-auto px-4 py-8 sm:py-12 space-y-6">
        <div className="bg-[#FFFDF9] border border-[#F0E6D8] rounded-3xl p-6 sm:p-10 text-center space-y-6 shadow-md">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
            <CheckCircle className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-widest text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
              Payment Details Received
            </span>
            <h1 className="font-fraunces text-2xl sm:text-3xl font-bold text-[#2A201C] pt-1">
              Thank You, {customerName}!
            </h1>
            <p className="text-xs sm:text-sm text-[#6B5B52]">
              Your EasyPaisa transaction ID <strong className="font-bold text-[#2A201C]">{transactionId}</strong> has been logged for verification.
            </p>
          </div>

          {/* Reference Card */}
          <div className="bg-[#FAF6EE] border border-[#EADFCF] rounded-2xl p-5 text-left space-y-3">
            <div className="flex items-center justify-between border-b border-[#E0D5C5] pb-2.5 text-xs">
              <span className="text-[#8C7A70]">Order Reference:</span>
              <span className="font-fraunces font-bold text-base text-[#E86024]">
                {createdOrder.orderRef}
              </span>
            </div>

            <div className="flex items-center justify-between border-b border-[#E0D5C5] pb-2.5 text-xs">
              <span className="text-[#8C7A70]">EasyPaisa TRX ID:</span>
              <span className="font-mono font-bold text-[#2A201C]">{transactionId}</span>
            </div>

            <div className="flex items-center justify-between border-b border-[#E0D5C5] pb-2.5 text-xs">
              <span className="text-[#8C7A70]">Order & Payment Status:</span>
              <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200 inline-flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                Verification Pending
              </span>
            </div>

            <div className="flex items-center justify-between pt-1 text-xs">
              <span className="text-[#8C7A70]">Total Amount:</span>
              <span className="font-bold text-sm text-[#2A201C]">
                {formatPKR(createdOrder.totalAmount ?? grandTotal)}
              </span>
            </div>
          </div>

          {/* WhatsApp Action Button */}
          <div className="bg-[#25D366]/10 border border-[#25D366]/30 rounded-2xl p-5 text-center space-y-3">
            <div className="space-y-1">
              <h3 className="font-fraunces text-base font-bold text-[#128C7E] flex items-center justify-center gap-1.5">
                <MessageCircle className="w-5 h-5 text-[#25D366]" />
                Confirm Order on WhatsApp
              </h3>
              <p className="text-xs text-[#6B5B52]">
                Click below to send your pre-filled order confirmation to Mina Cafe on WhatsApp.
              </p>
            </div>

            <a
              href={whatsAppUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3.5 px-6 rounded-2xl bg-[#25D366] hover:bg-[#20bd5a] text-white text-xs sm:text-sm font-bold uppercase tracking-wider inline-flex items-center justify-center gap-2 transition-all shadow-md active:scale-[0.98]"
            >
              <MessageCircle className="w-4 h-4 fill-white text-transparent" />
              <span>Confirm Order on WhatsApp</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          {/* Track Order Action Button */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <button
              onClick={() => {
                if (onNavigateToTracking && createdOrder.trackingToken) {
                  onNavigateToTracking(createdOrder.trackingToken);
                } else if (createdOrder.trackingToken) {
                  window.location.href = `/track/${createdOrder.trackingToken}`;
                }
              }}
              className="py-3 px-5 rounded-2xl bg-[#2A201C] hover:bg-black text-white text-xs font-bold uppercase tracking-wider inline-flex items-center justify-center gap-2 transition-colors min-h-[46px]"
            >
              <span>Track My Order</span>
            </button>

            <button
              onClick={onNavigateToMenu}
              className="py-3 px-5 rounded-2xl bg-[#FAF6EE] hover:bg-[#F0E6D8] border border-[#EADFCF] text-[#2A201C] text-xs font-bold uppercase tracking-wider inline-flex items-center justify-center gap-2 transition-colors min-h-[46px]"
            >
              <span>Return to Menu</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* Render Step 2: EasyPaisa Payment Instructions & Submission Form */
  if (createdOrder) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8 sm:py-12 space-y-6">
        <div className="bg-[#FFFDF9] border border-[#F0E6D8] rounded-3xl p-6 sm:p-8 space-y-6 shadow-md">
          {/* Top Banner */}
          <div className="border-b border-[#F0E6D8] pb-4 space-y-1">
            <span className="text-xs font-bold text-[#E86024] uppercase tracking-widest bg-[#FFF0E6] px-3 py-1 rounded-full border border-[#FCD5C1]">
              Step 2 of 2: EasyPaisa Payment
            </span>
            <h1 className="font-fraunces text-2xl font-bold text-[#2A201C] pt-2">
              Mina Cafe EasyPaisa Payment
            </h1>
            <p className="text-xs text-[#6B5B52]">
              Order Reference: <strong className="text-[#E86024] font-bold">{createdOrder.orderRef}</strong>
            </p>
          </div>

          {paymentError && (
            <div className="bg-rose-900/90 text-rose-100 border border-rose-700 p-4 rounded-2xl flex items-start gap-3 text-xs sm:text-sm">
              <AlertCircle className="w-5 h-5 text-rose-300 shrink-0 mt-0.5" />
              <div>
                <strong className="font-bold block">Payment Submission Issue:</strong>
                <span>{paymentError}</span>
              </div>
            </div>
          )}

          {/* EasyPaisa Account Details Box */}
          <div className="bg-[#FAF6EE] border-2 border-[#E86024]/30 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-[#E0D5C5] pb-3">
              <span className="text-xs text-[#8C7A70] font-semibold uppercase tracking-wider">
                Total Amount to Transfer:
              </span>
              <span className="font-fraunces font-black text-2xl text-[#E86024]">
                {formatPKR(createdOrder.totalAmount ?? grandTotal)}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-[#8C7A70] block font-medium">Account Title:</span>
                <span className="font-bold text-[#2A201C] text-sm">{easypaisaTitle}</span>
              </div>

              <div>
                <span className="text-[#8C7A70] block font-medium">EasyPaisa Mobile Number:</span>
                <div className="flex items-center gap-2 pt-0.5">
                  <span className="font-mono font-black text-base text-[#2A201C]">
                    {easypaisaNumber}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyNumber}
                    className="p-1.5 rounded-lg bg-white border border-[#E0D5C5] hover:border-[#E86024] text-[#E86024] text-xs inline-flex items-center gap-1 transition-all"
                  >
                    {copiedNumber ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-[10px] text-emerald-700 font-bold">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span className="text-[10px] font-bold">Copy</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            <p className="text-[11px] text-[#6B5B52] bg-white/80 p-2.5 rounded-xl border border-[#E0D5C5] leading-relaxed">
              💡 Please open your EasyPaisa app, transfer the exact amount (<strong>{formatPKR(createdOrder.totalAmount ?? grandTotal)}</strong>) to <strong>{easypaisaNumber} ({easypaisaTitle})</strong>, and paste your transaction ID below.
            </p>
          </div>

          {/* Payment Submission Form */}
          <form onSubmit={handleSubmitPayment} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-[#2A201C] mb-1 flex items-center gap-1.5">
                <CreditCard className="w-4 h-4 text-[#E86024]" />
                EasyPaisa Transaction ID (TRX ID) <span className="text-rose-600">*</span>
              </label>
              <input
                type="text"
                required
                value={transactionId}
                onChange={(e) => setTransactionId(e.target.value)}
                placeholder="e.g. 12345678901"
                className="w-full px-4 py-3 rounded-xl bg-[#FAF6EE] border border-[#EADFCF] text-xs sm:text-sm font-mono font-bold text-[#2A201C] placeholder-[#8C7A70] focus:outline-none focus:border-[#E86024] focus:ring-1 focus:ring-[#E86024]"
              />
            </div>

            {/* Optional Screenshot Upload */}
            <div>
              <label className="block text-xs font-bold text-[#2A201C] mb-1 flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-[#E86024]" />
                Payment Screenshot / Receipt (Optional)
              </label>
              <div className="border-2 border-dashed border-[#EADFCF] hover:border-[#E86024] rounded-2xl p-4 text-center bg-[#FAF6EE] transition-colors">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleFileChange}
                  className="hidden"
                  id="screenshot-upload"
                />
                <label htmlFor="screenshot-upload" className="cursor-pointer space-y-2 block">
                  <Upload className="w-6 h-6 text-[#E86024] mx-auto" />
                  <span className="text-xs text-[#2A201C] font-semibold block">
                    {screenshotFile ? screenshotFile.name : 'Click to upload payment screenshot (Max 5MB)'}
                  </span>
                  <span className="text-[10px] text-[#8C7A70] block">
                    Supported formats: JPEG, PNG, WebP
                  </span>
                </label>
              </div>

              {screenshotPreview && (
                <div className="mt-3 relative w-32 h-32 rounded-xl overflow-hidden border border-[#EADFCF]">
                  <img
                    src={screenshotPreview}
                    alt="Payment Proof Preview"
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setScreenshotFile(null);
                      setScreenshotPreview(null);
                    }}
                    className="absolute top-1 right-1 bg-black/70 text-white rounded-full p-1 text-[10px]"
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={submittingPayment}
              className="w-full py-4 px-6 rounded-2xl bg-[#E86024] hover:bg-[#D05018] text-white text-xs sm:text-sm font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.98] disabled:opacity-60 min-h-[50px]"
            >
              {submittingPayment ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Submitting Payment...</span>
                </>
              ) : (
                <span>Submit Payment Details</span>
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  /* Empty Cart Guard */
  if (cartItems.length === 0) {
    return (
      <div className="max-w-xl mx-auto px-4 py-12 text-center space-y-4">
        <div className="bg-[#FFFDF9] border border-[#F0E6D8] rounded-3xl p-10 space-y-4">
          <ShoppingBag className="w-12 h-12 text-[#E86024] mx-auto" />
          <h2 className="font-fraunces text-xl font-bold text-[#2A201C]">Your Cart is Empty</h2>
          <p className="text-xs text-[#6B5B52]">Please add items to your cart before proceeding to checkout.</p>
          <button
            onClick={onNavigateToMenu}
            className="px-6 py-2.5 rounded-xl bg-[#E86024] text-white text-xs font-bold"
          >
            Explore Menu Catalog
          </button>
        </div>
      </div>
    );
  }

  /* Step 1 Form: Guest Information & Order Confirmation */
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-8">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-[#E0D5C5] pb-4">
        <button
          onClick={onNavigateToCart}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-[#E86024] hover:underline"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Cart
        </button>
        <h1 className="font-fraunces text-xl sm:text-2xl font-bold text-[#2A201C]">
          Karachi Delivery Checkout
        </h1>
      </div>

      <KarachiNotice variant="banner" />

      {adminSettings?.is_taking_orders === false && (
        <div className="p-4 rounded-2xl bg-[#FDF2F2] border border-[#F8B4B4] text-[#9B1C1C] flex items-start gap-3 shadow-xs">
          <AlertCircle className="w-5 h-5 text-[#C81E1E] shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold text-sm">Mina Cafe is Currently Closed</h3>
            <p className="text-xs mt-0.5">
              We are currently not accepting new orders. Please check back later during store operating hours ({adminSettings.opening_hours || '4:00 PM - 12:00 AM'}).
            </p>
          </div>
        </div>
      )}

      {orderError && (
        <div className="bg-rose-900/90 text-rose-100 border border-rose-700 p-4 rounded-2xl flex items-start gap-3 text-xs sm:text-sm animate-fadeIn">
          <AlertCircle className="w-5 h-5 text-rose-300 shrink-0 mt-0.5" />
          <div>
            <strong className="font-bold block">Checkout Validation Issue:</strong>
            <span>{orderError}</span>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmitOrder} className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Customer Delivery Information Form */}
        <div className="lg:col-span-2 bg-[#FFFDF9] border border-[#F0E6D8] rounded-3xl p-6 sm:p-8 space-y-6 shadow-xs">
          <div className="border-b border-[#F0E6D8] pb-4 space-y-1">
            <h2 className="font-fraunces text-lg font-bold text-[#2A201C] flex items-center gap-2">
              <MapPin className="w-5 h-5 text-[#E86024]" />
              Guest Contact & Delivery Address
            </h2>
            <p className="text-xs text-[#6B5B52]">
              No account required. Please provide accurate details for delivery in Karachi.
            </p>
          </div>

          <div className="space-y-4">
            {/* Full Name */}
            <div>
              <label className="block text-xs font-bold text-[#2A201C] mb-1 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-[#E86024]" />
                Full Name <span className="text-rose-600">*</span>
              </label>
              <input
                type="text"
                required
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="e.g. Usman Ahmed"
                className="w-full px-4 py-3 rounded-xl bg-[#FAF6EE] border border-[#EADFCF] text-xs sm:text-sm text-[#2A201C] placeholder-[#8C7A70] focus:outline-none focus:border-[#E86024] focus:ring-1 focus:ring-[#E86024]"
              />
            </div>

            {/* Phone Number */}
            <div>
              <label className="block text-xs font-bold text-[#2A201C] mb-1 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-[#E86024]" />
                WhatsApp / Phone Number <span className="text-rose-600">*</span>
              </label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. 03001234567"
                className="w-full px-4 py-3 rounded-xl bg-[#FAF6EE] border border-[#EADFCF] text-xs sm:text-sm text-[#2A201C] placeholder-[#8C7A70] focus:outline-none focus:border-[#E86024] focus:ring-1 focus:ring-[#E86024]"
              />
            </div>

            {/* Complete Address */}
            <div>
              <label className="block text-xs font-bold text-[#2A201C] mb-1 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[#E86024]" />
                Complete Address <span className="text-rose-600">*</span>
              </label>
              <textarea
                required
                rows={3}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="House/Flat #, Street, Block, Sector, Area (e.g., Block 5, Gulshan-e-Iqbal, Karachi)"
                className="w-full px-4 py-3 rounded-xl bg-[#FAF6EE] border border-[#EADFCF] text-xs sm:text-sm text-[#2A201C] placeholder-[#8C7A70] focus:outline-none focus:border-[#E86024] focus:ring-1 focus:ring-[#E86024]"
              />
            </div>

            {/* City (Fixed Karachi) */}
            <div>
              <label className="block text-xs font-bold text-[#2A201C] mb-1">
                City <span className="text-rose-600">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  readOnly
                  value="Karachi"
                  className="w-full px-4 py-3 rounded-xl bg-[#F0E6D8] border border-[#E0D5C5] text-xs sm:text-sm font-bold text-[#2A201C] cursor-not-allowed"
                />
                <span className="absolute right-3 top-3 text-[11px] font-semibold text-[#8C7A70] bg-white px-2 py-0.5 rounded border border-[#E0D5C5]">
                  Karachi Only
                </span>
              </div>
              <p className="text-[11px] text-[#E86024] font-semibold mt-1">
                📍 We currently deliver exclusively within Karachi.
              </p>
            </div>

            {/* Optional Notes */}
            <div>
              <label className="block text-xs font-bold text-[#2A201C] mb-1 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-[#E86024]" />
                Order / Delivery Notes (Optional)
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Call upon arrival, extra spoons, etc."
                className="w-full px-4 py-3 rounded-xl bg-[#FAF6EE] border border-[#EADFCF] text-xs sm:text-sm text-[#2A201C] placeholder-[#8C7A70] focus:outline-none focus:border-[#E86024] focus:ring-1 focus:ring-[#E86024]"
              />
            </div>
          </div>
        </div>

        {/* Order Summary & Submit Sidebar */}
        <div className="bg-[#FFFDF9] border border-[#F0E6D8] rounded-3xl p-6 shadow-sm space-y-6 sticky top-24">
          <h2 className="font-fraunces text-lg font-bold text-[#2A201C] border-b border-[#F0E6D8] pb-3 flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-[#E86024]" />
            Order Items ({cartCount})
          </h2>

          <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
            {cartItems.map((item) => (
              <div key={item.cartItemId} className="flex justify-between items-start text-xs text-[#2A201C]">
                <div>
                  <span className="font-bold">{item.quantity}x</span> {item.productName}
                  {item.selectedToppingNames && item.selectedToppingNames.length > 0 && (
                    <div className="text-[10px] text-[#E86024]">
                      + {item.selectedToppingNames.join(', ')}
                    </div>
                  )}
                </div>
                <span className="font-mono font-semibold">{formatPKR(item.itemTotal)}</span>
              </div>
            ))}
          </div>

          <div className="border-t border-[#F0E6D8] pt-4 space-y-2 text-xs text-[#2A201C]">
            <div className="flex justify-between">
              <span className="text-[#6B5B52]">Subtotal:</span>
              <span className="font-bold">{formatPKR(cartSubtotal)}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-[#6B5B52] flex items-center gap-1">
                <Truck className="w-3.5 h-3.5 text-[#E86024]" />
                Delivery Fee (Karachi):
              </span>
              <span className="font-bold text-[#E86024]">
                {loadingSettings ? '...' : formatPKR(activeDeliveryFee)}
              </span>
            </div>

            <div className="border-t border-[#F0E6D8] pt-3 flex justify-between items-center text-sm font-bold">
              <span>Grand Total:</span>
              <span className="text-xl font-black font-fraunces text-[#E86024]">
                {formatPKR(grandTotal)}
              </span>
            </div>
          </div>

          <button
            type="submit"
            disabled={submittingOrder || adminSettings?.is_taking_orders === false}
            className={`w-full py-4 px-6 rounded-2xl text-xs sm:text-sm font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.98] disabled:opacity-60 min-h-[50px] ${
              adminSettings?.is_taking_orders === false
                ? 'bg-gray-400 text-white cursor-not-allowed'
                : 'bg-[#E86024] hover:bg-[#D05018] text-white'
            }`}
          >
            {submittingOrder ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Creating Order...</span>
              </>
            ) : adminSettings?.is_taking_orders === false ? (
              <span>Shop Closed (Orders Paused)</span>
            ) : (
              <span>Proceed to EasyPaisa Payment</span>
            )}
          </button>

          <p className="text-[11px] text-center text-[#8C7A70]">
            🔒 Secure guest checkout. EasyPaisa payment details will be shown on the next step.
          </p>
        </div>
      </form>
    </div>
  );
};
