import React, { useState, useEffect } from 'react';
import {
  AdminOrderDetail,
  ALLOWED_ORDER_STATUSES,
  OrderStatus,
  PaymentStatus,
} from '../../lib/adminOrderService';
import {
  X,
  User,
  Phone,
  MapPin,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  FileText,
  DollarSign,
  MessageSquare,
  ExternalLink,
  ShieldAlert,
  Image as ImageIcon,
  ChevronRight,
  Maximize2,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface OrderDetailModalProps {
  orderId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onOrderUpdated: () => void;
}

export const OrderDetailModal: React.FC<OrderDetailModalProps> = ({
  orderId,
  isOpen,
  onClose,
  onOrderUpdated,
}) => {
  const [order, setOrder] = useState<AdminOrderDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Status updating state
  const [selectedStatus, setSelectedStatus] = useState<OrderStatus>('Pending Payment');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Payment verification modals & state
  const [showApproveConfirm, setShowApproveConfirm] = useState<boolean>(false);
  const [showRejectConfirm, setShowRejectConfirm] = useState<boolean>(false);
  const [rejectionReasonInput, setRejectionReasonInput] = useState<string>('');
  const [isVerifyingPayment, setIsVerifyingPayment] = useState<boolean>(false);

  // Proof screenshot enlargement modal
  const [showFullProof, setShowFullProof] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen && orderId) {
      fetchOrderDetail(orderId);
    } else {
      setOrder(null);
      setError(null);
      setStatusMessage(null);
      setShowApproveConfirm(false);
      setShowRejectConfirm(false);
    }
  }, [isOpen, orderId]);

  const fetchOrderDetail = async (id: string) => {
    setLoading(true);
    setError(null);
    setStatusMessage(null);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      const res = await fetch(`/api/admin/orders/${id}`, {
        headers: {
          Authorization: `Bearer ${token || ''}`,
        },
      });

      const data = await res.json();

      if (res.ok && data.success && data.order) {
        setOrder(data.order);
        setSelectedStatus(data.order.status);
      } else {
        setError(data.error || 'Failed to load order details.');
      }
    } catch (err: any) {
      console.error('Fetch order detail error:', err);
      setError(err.message || 'Network error fetching order details.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (newStatus: OrderStatus) => {
    if (!order) return;
    setIsUpdatingStatus(true);
    setStatusMessage(null);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      const res = await fetch(`/api/admin/orders/${order.id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token || ''}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setSelectedStatus(newStatus);
        setOrder((prev) => (prev ? { ...prev, status: newStatus } : null));
        setStatusMessage({ text: `Order status updated to "${newStatus}".`, type: 'success' });
        onOrderUpdated();
      } else {
        setStatusMessage({ text: data.error || 'Failed to update order status.', type: 'error' });
      }
    } catch (err: any) {
      setStatusMessage({ text: err.message || 'Error updating order status.', type: 'error' });
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleVerifyPayment = async () => {
    if (!order) return;
    setIsVerifyingPayment(true);
    setStatusMessage(null);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      const res = await fetch(`/api/admin/payments/${order.id}/verify`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token || ''}`,
        },
        body: JSON.stringify({ action: 'verify' }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setShowApproveConfirm(false);
        setStatusMessage({
          text: 'Payment verified successfully! Order marked as "Payment Verified".',
          type: 'success',
        });
        await fetchOrderDetail(order.id);
        onOrderUpdated();
      } else {
        setStatusMessage({ text: data.error || 'Failed to verify payment.', type: 'error' });
      }
    } catch (err: any) {
      setStatusMessage({ text: err.message || 'Error verifying payment.', type: 'error' });
    } finally {
      setIsVerifyingPayment(false);
    }
  };

  const handleRejectPayment = async () => {
    if (!order) return;
    setIsVerifyingPayment(true);
    setStatusMessage(null);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      const res = await fetch(`/api/admin/payments/${order.id}/verify`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token || ''}`,
        },
        body: JSON.stringify({
          action: 'reject',
          rejectionReason: rejectionReasonInput,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setShowRejectConfirm(false);
        setRejectionReasonInput('');
        setStatusMessage({
          text: 'Payment rejected. Order remains intact for re-submission.',
          type: 'success',
        });
        await fetchOrderDetail(order.id);
        onOrderUpdated();
      } else {
        setStatusMessage({ text: data.error || 'Failed to reject payment.', type: 'error' });
      }
    } catch (err: any) {
      setStatusMessage({ text: err.message || 'Error rejecting payment.', type: 'error' });
    } finally {
      setIsVerifyingPayment(false);
    }
  };

  if (!isOpen) return null;

  const formattedWhatsAppPhone = order?.phone
    ? order.phone.replace(/[^0-9]/g, '').replace(/^0/, '92')
    : '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-[#FFFDF9] border border-[#F0E6D8] rounded-3xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden my-auto">
        {/* Header */}
        <div className="bg-[#FAF6EE] px-5 py-4 border-b border-[#EADFCF] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#FFF0E6] border border-[#FCD5C1] text-[#E86024] flex items-center justify-center font-bold">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-fraunces text-lg sm:text-xl font-bold text-[#2A201C]">
                  Order {order?.orderRef || 'Details'}
                </h2>
                {order && (
                  <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-white border border-[#E0D5C5] text-[#8C7A70]">
                    {order.city}
                  </span>
                )}
              </div>
              <span className="text-xs text-[#8C7A70] block">
                {order ? `Placed: ${new Date(order.createdAt).toLocaleString('en-PK')}` : 'Loading...'}
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white border border-[#E0D5C5] text-[#2A201C] hover:bg-rose-50 hover:text-rose-600 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1 text-[#2A201C]">
          {loading ? (
            <div className="py-16 text-center space-y-3">
              <Loader2 className="w-8 h-8 text-[#E86024] animate-spin mx-auto" />
              <p className="text-xs font-semibold text-[#8C7A70]">Loading complete order details...</p>
            </div>
          ) : error ? (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-2xl flex items-center gap-3 text-xs">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          ) : order ? (
            <>
              {/* Alert Feedback Banner */}
              {statusMessage && (
                <div
                  className={`p-3.5 rounded-2xl text-xs flex items-center gap-2 font-medium ${
                    statusMessage.type === 'success'
                      ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                      : 'bg-rose-50 border border-rose-200 text-rose-800'
                  }`}
                >
                  {statusMessage.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  )}
                  <span>{statusMessage.text}</span>
                </div>
              )}

              {/* Status Update Quick Bar */}
              <div className="bg-[#FAF6EE] border border-[#EADFCF] rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-[11px] font-bold text-[#8C7A70] uppercase tracking-wider block">
                    Current Order Status
                  </span>
                  <span className="text-xs text-[#2A201C]">
                    Customer order tracking state in database
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={selectedStatus}
                    onChange={(e) => handleUpdateStatus(e.target.value as OrderStatus)}
                    disabled={isUpdatingStatus}
                    className="px-3.5 py-2 rounded-xl bg-white border border-[#E0D5C5] text-xs font-bold text-[#2A201C] focus:outline-none focus:border-[#E86024]"
                  >
                    {ALLOWED_ORDER_STATUSES.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                  {isUpdatingStatus && <Loader2 className="w-4 h-4 text-[#E86024] animate-spin" />}
                </div>
              </div>

              {/* Two Column Section: Customer & Payment */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Customer Details */}
                <div className="bg-[#FFFDF9] border border-[#F0E6D8] rounded-2xl p-4 space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#E86024] flex items-center gap-1.5 border-b border-[#F0E6D8] pb-2">
                    <User className="w-3.5 h-3.5" />
                    Customer Details
                  </h3>

                  <div className="space-y-2 text-xs">
                    <div>
                      <span className="text-[#8C7A70] block text-[11px]">Customer Name</span>
                      <strong className="font-bold text-[#2A201C] text-sm">{order.customerName}</strong>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <div>
                        <span className="text-[#8C7A70] block text-[11px]">Phone / WhatsApp</span>
                        <a
                          href={`tel:${order.phone}`}
                          className="font-mono font-bold text-[#2A201C] hover:text-[#E86024] underline"
                        >
                          {order.phone}
                        </a>
                      </div>
                      {formattedWhatsAppPhone && (
                        <a
                          href={`https://wa.me/${formattedWhatsAppPhone}?text=${encodeURIComponent(
                            `Hi ${order.customerName}, regarding your Mina Cafe order ${order.orderRef}:`
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] inline-flex items-center gap-1 shadow-2xs"
                        >
                          <MessageSquare className="w-3 h-3" />
                          <span>WhatsApp</span>
                        </a>
                      )}
                    </div>

                    <div className="pt-1">
                      <span className="text-[#8C7A70] block text-[11px]">Delivery Address (Karachi)</span>
                      <p className="font-medium text-[#2A201C] leading-snug">{order.address}</p>
                    </div>

                    {order.notes && (
                      <div className="pt-1 bg-[#FAF6EE] p-2.5 rounded-xl border border-[#EADFCF]">
                        <span className="text-[#E86024] block text-[10px] font-bold uppercase tracking-wider">
                          Delivery Notes
                        </span>
                        <p className="text-[#2A201C] text-[11px] italic">{order.notes}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Payment Verification Details */}
                <div className="bg-[#FFFDF9] border border-[#F0E6D8] rounded-2xl p-4 space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#E86024] flex items-center gap-1.5 border-b border-[#F0E6D8] pb-2">
                    <DollarSign className="w-3.5 h-3.5" />
                    Payment Verification
                  </h3>

                  <div className="space-y-2.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[#8C7A70] text-[11px]">Payment Status</span>
                      <span
                        className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                          order.payment?.paymentStatus === 'Verified'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : order.payment?.paymentStatus === 'Rejected'
                            ? 'bg-rose-50 text-rose-800 border-rose-200'
                            : 'bg-amber-50 text-amber-800 border-amber-200'
                        }`}
                      >
                        {order.payment?.paymentStatus || 'Verification Pending'}
                      </span>
                    </div>

                    <div>
                      <span className="text-[#8C7A70] block text-[11px]">EasyPaisa Transaction ID</span>
                      <strong className="font-mono text-sm text-[#2A201C] bg-[#FAF6EE] px-2.5 py-1 rounded-lg border border-[#EADFCF] block mt-0.5">
                        {order.payment?.transactionId || 'NOT SUBMITTED YET'}
                      </strong>
                    </div>

                    {/* Screenshot Preview */}
                    {order.payment?.paymentProofUrl ? (
                      <div>
                        <span className="text-[#8C7A70] block text-[11px] mb-1">
                          Payment Proof Screenshot
                        </span>
                        <div className="relative group border border-[#EADFCF] rounded-xl overflow-hidden bg-black/5 max-h-32 flex items-center justify-center">
                          <img
                            src={order.payment.paymentProofUrl}
                            alt="Payment Proof"
                            className="object-cover w-full h-28 group-hover:scale-105 transition-transform duration-200 cursor-pointer"
                            onClick={() => setShowFullProof(true)}
                          />
                          <button
                            onClick={() => setShowFullProof(true)}
                            className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold gap-1"
                          >
                            <Maximize2 className="w-4 h-4" />
                            <span>Enlarge Screenshot</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-[#FAF6EE] p-2.5 rounded-xl border border-[#EADFCF] text-center text-[11px] text-[#8C7A70]">
                        No payment screenshot uploaded.
                      </div>
                    )}

                    {order.payment?.rejectionReason && (
                      <div className="bg-rose-50 p-2.5 rounded-xl border border-rose-200 text-rose-800 text-[11px]">
                        <strong className="font-bold block">Rejection Reason:</strong>
                        <span>{order.payment.rejectionReason}</span>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="pt-2 flex gap-2">
                      <button
                        onClick={() => setShowApproveConfirm(true)}
                        disabled={isVerifyingPayment || order.payment?.paymentStatus === 'Verified'}
                        className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold flex items-center justify-center gap-1 shadow-xs"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Approve</span>
                      </button>

                      <button
                        onClick={() => setShowRejectConfirm(true)}
                        disabled={isVerifyingPayment || order.payment?.paymentStatus === 'Rejected'}
                        className="flex-1 py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-bold flex items-center justify-center gap-1 shadow-xs"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Reject</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Order Items Table */}
              <div className="bg-[#FFFDF9] border border-[#F0E6D8] rounded-2xl p-4 space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#E86024] flex items-center gap-1.5 border-b border-[#F0E6D8] pb-2">
                  <FileText className="w-3.5 h-3.5" />
                  Order Items Breakdown
                </h3>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-[#F0E6D8] text-[#8C7A70] uppercase text-[10px] tracking-wider">
                        <th className="pb-2">Item</th>
                        <th className="pb-2 text-center">Toppings</th>
                        <th className="pb-2 text-center">Qty</th>
                        <th className="pb-2 text-right">Unit Price</th>
                        <th className="pb-2 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F0E6D8]">
                      {order.items.map((item) => (
                        <tr key={item.id}>
                          <td className="py-2.5 font-bold text-[#2A201C]">{item.productName}</td>
                          <td className="py-2.5 text-center text-[11px] text-[#6B5B52]">
                            {item.selectedToppings.length > 0
                              ? item.selectedToppings.join(', ')
                              : 'None'}
                          </td>
                          <td className="py-2.5 text-center font-bold text-[#2A201C]">
                            x{item.quantity}
                          </td>
                          <td className="py-2.5 text-right text-[#6B5B52]">
                            Rs. {item.unitPrice.toFixed(0)}
                          </td>
                          <td className="py-2.5 text-right font-bold text-[#2A201C]">
                            Rs. {item.itemTotal.toFixed(0)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Subtotal, Delivery & Grand Total */}
                <div className="border-t border-[#F0E6D8] pt-3 space-y-1 text-xs">
                  <div className="flex justify-between text-[#8C7A70]">
                    <span>Items Subtotal:</span>
                    <span>Rs. {order.subtotal.toFixed(0)}</span>
                  </div>
                  <div className="flex justify-between text-[#8C7A70]">
                    <span>Delivery Fee (Karachi):</span>
                    <span>Rs. {order.deliveryFee.toFixed(0)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold text-[#2A201C] pt-1 border-t border-[#F0E6D8]">
                    <span>Grand Total:</span>
                    <span className="text-[#E86024]">Rs. {order.totalAmount.toFixed(0)}</span>
                  </div>
                </div>
              </div>
            </>
          ) : null}
        </div>
      </div>

      {/* Confirmation Modal: Approve Payment */}
      {showApproveConfirm && (
        <div className="fixed inset-0 z-60 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-[#FFFDF9] border border-[#F0E6D8] rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto border border-emerald-200">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="font-fraunces text-lg font-bold text-[#2A201C]">
                Confirm Payment Verification
              </h3>
              <p className="text-xs text-[#6B5B52]">
                Are you sure you want to verify payment of{' '}
                <strong className="text-[#2A201C]">Rs. {order?.totalAmount.toFixed(0)}</strong> for order{' '}
                <strong>{order?.orderRef}</strong>?
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowApproveConfirm(false)}
                className="flex-1 py-2.5 rounded-xl border border-[#E0D5C5] text-xs font-bold text-[#2A201C] hover:bg-[#FAF6EE]"
              >
                Cancel
              </button>
              <button
                onClick={handleVerifyPayment}
                disabled={isVerifyingPayment}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1"
              >
                {isVerifyingPayment ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Yes, Approve'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal: Reject Payment */}
      {showRejectConfirm && (
        <div className="fixed inset-0 z-60 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-[#FFFDF9] border border-[#F0E6D8] rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto border border-rose-200">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="font-fraunces text-lg font-bold text-[#2A201C]">
                Confirm Payment Rejection
              </h3>
              <p className="text-xs text-[#6B5B52]">
                Rejecting payment for <strong>{order?.orderRef}</strong> will keep the order intact while marking payment as rejected.
              </p>
            </div>

            <div className="space-y-1 text-left">
              <label className="block text-xs font-bold text-[#2A201C]">
                Rejection Reason (Optional):
              </label>
              <textarea
                value={rejectionReasonInput}
                onChange={(e) => setRejectionReasonInput(e.target.value)}
                placeholder="e.g. Transaction ID not found on EasyPaisa statement."
                rows={2}
                className="w-full p-2.5 rounded-xl bg-[#FAF6EE] border border-[#EADFCF] text-xs focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowRejectConfirm(false)}
                className="flex-1 py-2.5 rounded-xl border border-[#E0D5C5] text-xs font-bold text-[#2A201C] hover:bg-[#FAF6EE]"
              >
                Cancel
              </button>
              <button
                onClick={handleRejectPayment}
                disabled={isVerifyingPayment}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center justify-center gap-1"
              >
                {isVerifyingPayment ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm Reject'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Enlarged Screenshot Modal */}
      {showFullProof && order?.payment?.paymentProofUrl && (
        <div className="fixed inset-0 z-70 bg-black/85 flex items-center justify-center p-4">
          <div className="relative max-w-2xl w-full space-y-2">
            <button
              onClick={() => setShowFullProof(false)}
              className="absolute -top-10 right-0 text-white hover:text-rose-400 font-bold text-sm bg-black/40 px-3 py-1 rounded-lg"
            >
              ✕ Close
            </button>
            <img
              src={order.payment.paymentProofUrl}
              alt="Full Payment Proof"
              className="max-h-[80vh] w-auto mx-auto rounded-2xl object-contain border border-white/20 shadow-2xl"
            />
          </div>
        </div>
      )}
    </div>
  );
};
