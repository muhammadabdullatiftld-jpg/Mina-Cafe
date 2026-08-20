import React, { useState, useEffect } from 'react';
import {
  AdminOrderSummary,
  ALLOWED_ORDER_STATUSES,
  OrderStatus,
  PaymentStatus,
} from '../../lib/adminOrderService';
import { OrderDetailModal } from './OrderDetailModal';
import {
  Search,
  Filter,
  RefreshCw,
  ShoppingBag,
  Clock,
  CheckCircle2,
  AlertCircle,
  Eye,
  MessageSquare,
  Loader2,
  ChevronDown,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

export const AdminOrdersList: React.FC = () => {
  const [orders, setOrders] = useState<AdminOrderSummary[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters state
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedOrderStatus, setSelectedOrderStatus] = useState<string>('ALL');
  const [selectedPaymentStatus, setSelectedPaymentStatus] = useState<string>('ALL');

  // Order Details modal state
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  // Status updating inline state
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);

  useEffect(() => {
    fetchOrders();
  }, [selectedOrderStatus, selectedPaymentStatus]);

  const fetchOrders = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      const params = new URLSearchParams();
      if (searchTerm.trim()) params.append('search', searchTerm.trim());
      if (selectedOrderStatus !== 'ALL') params.append('status', selectedOrderStatus);
      if (selectedPaymentStatus !== 'ALL') params.append('paymentStatus', selectedPaymentStatus);

      const res = await fetch(`/api/admin/orders?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token || ''}`,
        },
      });

      const data = await res.json();

      if (res.ok && data.success && Array.isArray(data.orders)) {
        setOrders(data.orders);
      } else {
        setError(data.error || 'Failed to load orders.');
      }
    } catch (err: any) {
      console.error('Fetch admin orders error:', err);
      setError(err.message || 'Error connecting to server.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchOrders();
  };

  const handleInlineStatusChange = async (orderId: string, newStatus: OrderStatus) => {
    setUpdatingOrderId(orderId);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      const res = await fetch(`/api/admin/orders/${orderId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token || ''}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setOrders((prev) =>
          prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
        );
      } else {
        alert(`Status update failed: ${data.error || 'Unknown error'}`);
      }
    } catch (err: any) {
      alert(`Error updating status: ${err.message}`);
    } finally {
      setUpdatingOrderId(null);
    }
  };

  // Metrics summary calculations
  const totalOrdersCount = orders.length;
  const pendingVerificationCount = orders.filter(
    (o) => o.payment?.paymentStatus === 'Verification Pending'
  ).length;
  const inKitchenCount = orders.filter((o) =>
    ['Payment Verified', 'Preparing', 'Ready'].includes(o.status)
  ).length;
  const completedCount = orders.filter((o) => o.status === 'Completed').length;

  return (
    <div className="space-y-6">
      {/* Overview Metric Chips */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-[#FFFDF9] border border-[#F0E6D8] p-4 rounded-2xl shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-[#8C7A70] uppercase tracking-wider block">
            Total Orders
          </span>
          <span className="font-fraunces font-bold text-2xl text-[#2A201C]">{totalOrdersCount}</span>
        </div>

        <div className="bg-[#FFFDF9] border border-[#F0E6D8] p-4 rounded-2xl shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider block flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            Verification Pending
          </span>
          <span className="font-fraunces font-bold text-2xl text-amber-600">
            {pendingVerificationCount}
          </span>
        </div>

        <div className="bg-[#FFFDF9] border border-[#F0E6D8] p-4 rounded-2xl shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-[#E86024] uppercase tracking-wider block flex items-center gap-1">
            <ShoppingBag className="w-3.5 h-3.5 text-[#E86024]" />
            Active Kitchen Orders
          </span>
          <span className="font-fraunces font-bold text-2xl text-[#E86024]">{inKitchenCount}</span>
        </div>

        <div className="bg-[#FFFDF9] border border-[#F0E6D8] p-4 rounded-2xl shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider block flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Completed
          </span>
          <span className="font-fraunces font-bold text-2xl text-emerald-600">{completedCount}</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-[#FFFDF9] border border-[#F0E6D8] rounded-2xl p-4 shadow-2xs space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#8C7A70] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by Order Ref, Customer Name, or Phone..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#FAF6EE] border border-[#EADFCF] text-xs sm:text-sm text-[#2A201C] placeholder-[#8C7A70] focus:outline-none focus:border-[#E86024]"
            />
          </div>

          {/* Filters & Actions */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Order Status Filter */}
            <select
              value={selectedOrderStatus}
              onChange={(e) => setSelectedOrderStatus(e.target.value)}
              className="px-3 py-2.5 rounded-xl bg-[#FAF6EE] border border-[#EADFCF] text-xs font-bold text-[#2A201C] focus:outline-none focus:border-[#E86024]"
            >
              <option value="ALL">All Order Statuses</option>
              {ALLOWED_ORDER_STATUSES.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>

            {/* Payment Status Filter */}
            <select
              value={selectedPaymentStatus}
              onChange={(e) => setSelectedPaymentStatus(e.target.value)}
              className="px-3 py-2.5 rounded-xl bg-[#FAF6EE] border border-[#EADFCF] text-xs font-bold text-[#2A201C] focus:outline-none focus:border-[#E86024]"
            >
              <option value="ALL">All Payment Statuses</option>
              <option value="Verification Pending">Verification Pending</option>
              <option value="Verified">Verified</option>
              <option value="Rejected">Rejected</option>
              <option value="PENDING_SUBMISSION">Pending Tx Submission</option>
            </select>

            {/* Refresh Button */}
            <button
              type="button"
              onClick={fetchOrders}
              disabled={loading}
              className="px-3 py-2.5 rounded-xl bg-[#FAF6EE] border border-[#EADFCF] hover:bg-[#F0E6D8] text-xs font-bold text-[#2A201C] flex items-center gap-1 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#E86024]' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </form>
      </div>

      {/* Orders List Table / Cards */}
      <div className="bg-[#FFFDF9] border border-[#F0E6D8] rounded-3xl overflow-hidden shadow-2xs">
        {loading ? (
          <div className="py-20 text-center space-y-3">
            <Loader2 className="w-8 h-8 text-[#E86024] animate-spin mx-auto" />
            <p className="text-xs font-semibold text-[#8C7A70]">Fetching orders from database...</p>
          </div>
        ) : error ? (
          <div className="p-6 text-center text-rose-700 space-y-2">
            <AlertCircle className="w-8 h-8 mx-auto text-rose-600" />
            <p className="text-xs font-bold">{error}</p>
            <button
              onClick={fetchOrders}
              className="px-4 py-2 rounded-xl bg-rose-100 text-rose-800 text-xs font-bold"
            >
              Retry Loading
            </button>
          </div>
        ) : orders.length === 0 ? (
          <div className="py-16 text-center space-y-3 px-4">
            <div className="w-12 h-12 bg-[#FFF0E6] text-[#E86024] rounded-2xl border border-[#FCD5C1] flex items-center justify-center mx-auto">
              <ShoppingBag className="w-6 h-6" />
            </div>
            <h3 className="font-fraunces text-base font-bold text-[#2A201C]">No orders found</h3>
            <p className="text-xs text-[#8C7A70] max-w-sm mx-auto">
              No orders matched your current search term or filter criteria. Try clearing search filters.
            </p>
          </div>
        ) : (
          /* Table View */
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAF6EE] border-b border-[#EADFCF] text-[#8C7A70] uppercase text-[10px] tracking-wider font-bold">
                <tr>
                  <th className="py-3.5 px-4">Order Ref</th>
                  <th className="py-3.5 px-4">Customer</th>
                  <th className="py-3.5 px-4">Date / Time</th>
                  <th className="py-3.5 px-4">Total</th>
                  <th className="py-3.5 px-4">Payment</th>
                  <th className="py-3.5 px-4">Order Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0E6D8]">
                {orders.map((o) => {
                  const formattedPhone = o.phone.replace(/[^0-9]/g, '').replace(/^0/, '92');
                  return (
                    <tr key={o.id} className="hover:bg-[#FAF6EE]/60 transition-colors">
                      {/* Order Ref */}
                      <td className="py-3.5 px-4 font-mono font-bold text-[#2A201C]">
                        <span className="bg-[#FAF6EE] border border-[#EADFCF] px-2 py-1 rounded-lg">
                          {o.orderRef}
                        </span>
                      </td>

                      {/* Customer Name & Phone */}
                      <td className="py-3.5 px-4 space-y-0.5">
                        <strong className="font-bold text-[#2A201C] block text-xs">
                          {o.customerName}
                        </strong>
                        <div className="flex items-center gap-1.5 text-[11px]">
                          <span className="font-mono text-[#8C7A70]">{o.phone}</span>
                          {formattedPhone && (
                            <a
                              href={`https://wa.me/${formattedPhone}?text=${encodeURIComponent(
                                `Hi ${o.customerName}, regarding your Mina Cafe order ${o.orderRef}:`
                              )}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-emerald-600 hover:text-emerald-700 font-bold inline-flex items-center"
                              title="Chat on WhatsApp"
                            >
                              <MessageSquare className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      </td>

                      {/* Date / Time */}
                      <td className="py-3.5 px-4 text-[#8C7A70] text-[11px] whitespace-nowrap">
                        {new Date(o.createdAt).toLocaleDateString('en-PK', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>

                      {/* Total */}
                      <td className="py-3.5 px-4 font-bold text-[#E86024] whitespace-nowrap">
                        Rs. {o.totalAmount.toFixed(0)}
                      </td>

                      {/* Payment Status Badge */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${
                            o.payment?.paymentStatus === 'Verified'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : o.payment?.paymentStatus === 'Rejected'
                              ? 'bg-rose-50 text-rose-800 border-rose-200'
                              : 'bg-amber-50 text-amber-800 border-amber-200'
                          }`}
                        >
                          {o.payment?.paymentStatus || 'Pending'}
                        </span>
                      </td>

                      {/* Inline Status Selector */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <select
                            value={o.status}
                            onChange={(e) =>
                              handleInlineStatusChange(o.id, e.target.value as OrderStatus)
                            }
                            disabled={updatingOrderId === o.id}
                            className="px-2.5 py-1 rounded-lg bg-white border border-[#E0D5C5] text-[11px] font-bold text-[#2A201C] focus:outline-none focus:border-[#E86024]"
                          >
                            {ALLOWED_ORDER_STATUSES.map((st) => (
                              <option key={st} value={st}>
                                {st}
                              </option>
                            ))}
                          </select>
                          {updatingOrderId === o.id && (
                            <Loader2 className="w-3.5 h-3.5 text-[#E86024] animate-spin" />
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <button
                          onClick={() => {
                            setActiveOrderId(o.id);
                            setIsModalOpen(true);
                          }}
                          className="px-3 py-1.5 rounded-xl bg-[#E86024] hover:bg-[#D05018] text-white text-[11px] font-bold inline-flex items-center gap-1 shadow-2xs transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View Details</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Order Detail Modal */}
      <OrderDetailModal
        orderId={activeOrderId}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setActiveOrderId(null);
        }}
        onOrderUpdated={fetchOrders}
      />
    </div>
  );
};
