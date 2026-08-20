import React, { useState, useEffect, useRef } from 'react';
import { Product, Topping, ToppingPricing } from '../../types/index';
import { supabase } from '../../lib/supabase';
import { formatPKR } from '../../lib/utils';
import {
  Package,
  Plus,
  Edit2,
  CheckCircle2,
  XCircle,
  Loader2,
  Search,
  RefreshCw,
  Layers,
  DollarSign,
  AlertCircle,
  X,
  Check,
  Info,
  Upload,
} from 'lucide-react';

export const AdminProductsManager: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [toppings, setToppings] = useState<Topping[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'AVAILABLE' | 'UNAVAILABLE'>('ALL');

  // Modals state
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState<boolean>(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Form fields for Add/Edit Product
  const [formName, setFormName] = useState<string>('');
  const [formDescription, setFormDescription] = useState<string>('');
  const [formPrice, setFormPrice] = useState<string>('');
  const [formImageUrl, setFormImageUrl] = useState<string>('');
  const [formImageBase64, setFormImageBase64] = useState<string>('');
  const [formStock, setFormStock] = useState<string>('');
  const [formIsAvailable, setFormIsAvailable] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Topping Links Modal State
  const [isToppingsModalOpen, setIsToppingsModalOpen] = useState<boolean>(false);
  const [selectedProductForToppings, setSelectedProductForToppings] = useState<Product | null>(null);
  const [linkedToppingIds, setLinkedToppingIds] = useState<string[]>([]);
  const [loadingToppingLinks, setLoadingToppingLinks] = useState<boolean>(false);
  const [savingToppingLinks, setSavingToppingLinks] = useState<boolean>(false);

  // Topping Pricing Rules Modal State
  const [isPricingModalOpen, setIsPricingModalOpen] = useState<boolean>(false);
  const [selectedProductForPricing, setSelectedProductForPricing] = useState<Product | null>(null);
  const [pricingRules, setPricingRules] = useState<{ topping_count: number; extra_price: number }[]>([]);
  const [loadingPricing, setLoadingPricing] = useState<boolean>(false);
  const [savingPricing, setSavingPricing] = useState<boolean>(false);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const getAuthToken = async (): Promise<string> => {
    const { data: sessionData } = await supabase.auth.getSession();
    return sessionData.session?.access_token || '';
  };

  const fetchInitialData = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await getAuthToken();

      // Fetch products & toppings in parallel
      const [prodRes, topRes] = await Promise.all([
        fetch('/api/admin/catalog/products', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch('/api/admin/catalog/toppings', {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const prodData = await prodRes.json();
      const topData = await topRes.json();

      if (!prodRes.ok || !prodData.success) {
        throw new Error(prodData.error || 'Failed to fetch products');
      }

      setProducts(prodData.products || []);

      if (topRes.ok && topData.success) {
        setToppings(topData.toppings || []);
      }
    } catch (err: any) {
      setError(err.message || 'Error loading catalog data');
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  // ----------------------------------------------------
  // Product Availability Toggle
  // ----------------------------------------------------
  const handleToggleAvailability = async (product: Product) => {
    const newStatus = !product.is_available;
    try {
      const token = await getAuthToken();
      const res = await fetch(`/api/admin/catalog/products/${product.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ is_available: newStatus }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to update product status');
      }

      setProducts((prev) =>
        prev.map((p) => (p.id === product.id ? { ...p, is_available: newStatus } : p))
      );
      showNotification(`Product "${product.name}" is now ${newStatus ? 'Available' : 'Sold Out'}.`);
    } catch (err: any) {
      alert(`Error toggling availability: ${err.message}`);
    }
  };

  // ----------------------------------------------------
  // Add / Edit Product Handlers
  // ----------------------------------------------------
  const openAddModal = () => {
    setEditingProduct(null);
    setFormName('');
    setFormDescription('');
    setFormPrice('');
    setFormImageUrl('');
    setFormImageBase64('');
    setFormStock('');
    setFormIsAvailable(true);
    setIsAddEditModalOpen(true);
  };

  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    setFormName(product.name);
    setFormDescription(product.description || '');
    setFormPrice(String(product.price));
    setFormImageUrl(product.image_url || '');
    setFormImageBase64('');
    setFormStock(product.stock !== null && product.stock !== undefined ? String(product.stock) : '');
    setFormIsAvailable(product.is_available);
    setIsAddEditModalOpen(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      alert('Product name is required.');
      return;
    }

    const numericPrice = parseFloat(formPrice);
    if (isNaN(numericPrice) || numericPrice < 0) {
      alert('Please enter a valid price (minimum Rs. 0).');
      return;
    }

    let stockValue: number | null = null;
    if (formStock.trim() !== '') {
      stockValue = parseInt(formStock, 10);
      if (isNaN(stockValue) || stockValue < 0) {
        alert('Please enter a valid non-negative number for stock.');
        return;
      }
    }

    setSubmitting(true);
    try {
      const token = await getAuthToken();
      const isEditing = Boolean(editingProduct);
      const url = isEditing
        ? `/api/admin/catalog/products/${editingProduct!.id}`
        : '/api/admin/catalog/products';
      const method = isEditing ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: formName.trim(),
          description: formDescription.trim() || null,
          price: numericPrice,
          image_url: formImageUrl.trim() || null,
          imageBase64: formImageBase64 || null,
          stock: stockValue,
          is_available: formIsAvailable,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to save product.');
      }

      showNotification(isEditing ? 'Product details updated successfully.' : 'New product added successfully.');
      setIsAddEditModalOpen(false);
      fetchInitialData();
    } catch (err: any) {
      alert(`Save error: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('Image size exceeds 5MB limit.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setFormImageBase64(reader.result as string);
      setFormImageUrl(''); // clear URL if new image uploaded
    };
    reader.readAsDataURL(file);
  };

  // ----------------------------------------------------
  // Product-Toppings Links Modal
  // ----------------------------------------------------
  const openToppingsModal = async (product: Product) => {
    setSelectedProductForToppings(product);
    setIsToppingsModalOpen(true);
    setLoadingToppingLinks(true);
    try {
      const token = await getAuthToken();
      const res = await fetch(`/api/admin/catalog/products/${product.id}/toppings`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setLinkedToppingIds(data.toppingIds || []);
      } else {
        throw new Error(data.error || 'Failed to load product toppings');
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setLoadingToppingLinks(false);
    }
  };

  const handleToggleToppingLink = (toppingId: string) => {
    setLinkedToppingIds((prev) =>
      prev.includes(toppingId) ? prev.filter((id) => id !== toppingId) : [...prev, toppingId]
    );
  };

  const handleSaveProductToppings = async () => {
    if (!selectedProductForToppings) return;
    setSavingToppingLinks(true);
    try {
      const token = await getAuthToken();
      const res = await fetch(`/api/admin/catalog/products/${selectedProductForToppings.id}/toppings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ toppingIds: linkedToppingIds }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to update linked toppings');
      }
      showNotification(`Toppings updated for "${selectedProductForToppings.name}".`);
      setIsToppingsModalOpen(false);
    } catch (err: any) {
      alert(`Save error: ${err.message}`);
    } finally {
      setSavingToppingLinks(false);
    }
  };

  // ----------------------------------------------------
  // Topping Pricing Rules Modal
  // ----------------------------------------------------
  const openPricingModal = async (product: Product) => {
    setSelectedProductForPricing(product);
    setIsPricingModalOpen(true);
    setLoadingPricing(true);
    try {
      const token = await getAuthToken();
      const res = await fetch(`/api/admin/catalog/products/${product.id}/pricing`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        const rules = (data.pricingRules || []).map((r: ToppingPricing) => ({
          topping_count: Number(r.topping_count),
          extra_price: Number(r.extra_price),
        }));
        setPricingRules(rules);
      } else {
        throw new Error(data.error || 'Failed to load pricing rules');
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setLoadingPricing(false);
    }
  };

  const handleAddPricingRule = () => {
    // Find first available count
    const existingCounts = new Set(pricingRules.map((r) => r.topping_count));
    let nextCount = 1;
    while (existingCounts.has(nextCount)) {
      nextCount++;
    }
    setPricingRules((prev) => [...prev, { topping_count: nextCount, extra_price: 0 }]);
  };

  const handleRuleChange = (index: number, field: 'topping_count' | 'extra_price', value: number) => {
    setPricingRules((prev) =>
      prev.map((r, i) => (i === index ? { ...r, [field]: value } : r))
    );
  };

  const handleRemoveRule = (index: number) => {
    setPricingRules((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSavePricing = async () => {
    if (!selectedProductForPricing) return;

    // Validate pricing rules: check duplicates
    const counts = pricingRules.map((r) => r.topping_count);
    if (new Set(counts).size !== counts.length) {
      alert('Each topping count must be unique. You have duplicate topping counts.');
      return;
    }

    setSavingPricing(true);
    try {
      const token = await getAuthToken();
      const res = await fetch(`/api/admin/catalog/products/${selectedProductForPricing.id}/pricing`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ rules: pricingRules }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to update pricing rules');
      }

      showNotification(`Topping pricing rules updated for "${selectedProductForPricing.name}".`);
      setIsPricingModalOpen(false);
    } catch (err: any) {
      alert(`Save error: ${err.message}`);
    } finally {
      setSavingPricing(false);
    }
  };

  // Filtered Products
  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.description && p.description.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus =
      statusFilter === 'ALL'
        ? true
        : statusFilter === 'AVAILABLE'
        ? p.is_available
        : !p.is_available;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-[#FAF6EE] space-y-6">
      {/* Top Banner Actions & Filters */}
      <div className="bg-[#FFFDF9] border border-[#F0E6D8] rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5 text-[#E86024]" />
              <h2 className="font-fraunces text-xl font-bold text-[#2A201C]">
                Products Catalog ({products.length})
              </h2>
            </div>
            <p className="text-xs text-[#8C7A70] pt-1">
              Manage product titles, prices, images, topping permissions, and customer availability.
            </p>
          </div>

          <button
            onClick={openAddModal}
            className="px-4 py-2.5 rounded-xl bg-[#E86024] hover:bg-[#D05018] text-white text-xs font-bold inline-flex items-center gap-2 transition-colors shadow-xs shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Product</span>
          </button>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-[#F0E6D8]">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-[#8C7A70] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search product by name or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-[#FAF6EE] border border-[#EADFCF] rounded-xl text-xs text-[#2A201C] focus:outline-none focus:border-[#E86024]"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
            <div className="flex items-center bg-[#FAF6EE] p-1 rounded-xl border border-[#EADFCF]">
              <button
                onClick={() => setStatusFilter('ALL')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                  statusFilter === 'ALL'
                    ? 'bg-[#2A201C] text-white'
                    : 'text-[#6B5B52] hover:text-[#2A201C]'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setStatusFilter('AVAILABLE')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                  statusFilter === 'AVAILABLE'
                    ? 'bg-emerald-700 text-white'
                    : 'text-[#6B5B52] hover:text-[#2A201C]'
                }`}
              >
                Available
              </button>
              <button
                onClick={() => setStatusFilter('UNAVAILABLE')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                  statusFilter === 'UNAVAILABLE'
                    ? 'bg-rose-700 text-white'
                    : 'text-[#6B5B52] hover:text-[#2A201C]'
                }`}
              >
                Sold Out
              </button>
            </div>

            <button
              onClick={fetchInitialData}
              className="p-2 bg-[#FAF6EE] hover:bg-[#F0E6D8] border border-[#EADFCF] rounded-xl text-[#2A201C] transition-colors"
              title="Refresh Products"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Success Notification */}
      {successMsg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-800 hover:text-emerald-950">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-bold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Products Table / Cards */}
      {loading ? (
        <div className="bg-[#FFFDF9] border border-[#F0E6D8] rounded-2xl p-12 text-center text-xs text-[#8C7A70] flex flex-col items-center justify-center space-y-3">
          <Loader2 className="w-6 h-6 animate-spin text-[#E86024]" />
          <span>Loading products catalog from Supabase...</span>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="bg-[#FFFDF9] border border-[#F0E6D8] rounded-2xl p-12 text-center space-y-3">
          <Package className="w-8 h-8 text-[#8C7A70] mx-auto opacity-50" />
          <h3 className="font-fraunces text-base font-bold text-[#2A201C]">
            No products found
          </h3>
          <p className="text-xs text-[#8C7A70]">
            {searchTerm
              ? 'No products match your search keyword or availability filter.'
              : 'No products are currently in the database.'}
          </p>
        </div>
      ) : (
        <div className="bg-[#FFFDF9] border border-[#F0E6D8] rounded-2xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-[#2A201C] min-w-[700px]">
              <thead className="bg-[#FAF6EE] border-b border-[#F0E6D8] font-fraunces text-[#6B5B52] uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3.5 px-4 font-bold">Product</th>
                  <th className="py-3.5 px-4 font-bold">Base Price</th>
                  <th className="py-3.5 px-4 font-bold">Stock</th>
                  <th className="py-3.5 px-4 font-bold">Availability Status</th>
                  <th className="py-3.5 px-4 font-bold text-center">Topping Config</th>
                  <th className="py-3.5 px-4 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0E6D8]">
                {filteredProducts.map((prod) => (
                  <tr key={prod.id} className="hover:bg-[#FAF6EE]/60 transition-colors">
                    {/* Product Name & Details */}
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-[#FAF6EE] border border-[#EADFCF] overflow-hidden shrink-0 flex items-center justify-center text-lg">
                          {prod.image_url ? (
                            <img
                              src={prod.image_url}
                              alt={prod.name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = 'none';
                              }}
                            />
                          ) : (
                            <span>{prod.name.toLowerCase().includes('bottle') ? '🥛' : '🍓'}</span>
                          )}
                        </div>
                        <div>
                          <span className="font-bold text-sm text-[#2A201C] block">
                            {prod.name}
                          </span>
                          <span className="text-[11px] text-[#8C7A70] line-clamp-1 max-w-xs">
                            {prod.description || 'No description provided.'}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Price */}
                    <td className="py-4 px-4 font-fraunces font-black text-sm text-[#E86024]">
                      {formatPKR(prod.price)}
                    </td>

                    {/* Stock */}
                    <td className="py-4 px-4">
                      <span className="font-bold text-sm text-[#6B5B52]">
                        {prod.stock !== null && prod.stock !== undefined ? prod.stock : <span className="text-[#8C7A70] text-xs">∞</span>}
                      </span>
                    </td>

                    {/* Status Toggle */}
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleToggleAvailability(prod)}
                          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            prod.is_available ? 'bg-emerald-600' : 'bg-rose-600'
                          }`}
                          title={`Click to switch to ${prod.is_available ? 'Sold Out' : 'Available'}`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                              prod.is_available ? 'translate-x-5' : 'translate-x-0'
                            }`}
                          />
                        </button>
                        <span
                          className={`text-xs font-bold px-2 py-0.5 rounded-full border ${
                            prod.is_available
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : 'bg-rose-50 text-rose-800 border-rose-200'
                          }`}
                        >
                          {prod.is_available ? 'Available' : 'Sold Out'}
                        </span>
                      </div>
                    </td>

                    {/* Topping Config Buttons */}
                    <td className="py-4 px-4 text-center">
                      <div className="inline-flex flex-col sm:flex-row items-center justify-center gap-1.5">
                        <button
                          onClick={() => openToppingsModal(prod)}
                          className="px-2.5 py-1.5 bg-[#FAF6EE] hover:bg-[#F0E6D8] border border-[#EADFCF] rounded-lg text-[11px] font-bold text-[#2A201C] inline-flex items-center gap-1 transition-colors"
                          title="Select which toppings belong to this product"
                        >
                          <Layers className="w-3.5 h-3.5 text-[#E86024]" />
                          <span>Link Toppings</span>
                        </button>

                        <button
                          onClick={() => openPricingModal(prod)}
                          className="px-2.5 py-1.5 bg-[#FAF6EE] hover:bg-[#F0E6D8] border border-[#EADFCF] rounded-lg text-[11px] font-bold text-[#2A201C] inline-flex items-center gap-1 transition-colors"
                          title="Manage topping count extra pricing rules"
                        >
                          <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Pricing Rules</span>
                        </button>
                      </div>
                    </td>

                    {/* Action */}
                    <td className="py-4 px-4 text-right">
                      <button
                        onClick={() => openEditModal(prod)}
                        className="px-3 py-1.5 rounded-lg bg-[#FAF6EE] hover:bg-[#F0E6D8] border border-[#EADFCF] text-xs font-bold text-[#2A201C] inline-flex items-center gap-1 transition-colors"
                      >
                        <Edit2 className="w-3.5 h-3.5 text-[#E86024]" />
                        <span>Edit</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* 1. ADD / EDIT PRODUCT MODAL                          */}
      {/* ==================================================== */}
      {isAddEditModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#FFFDF9] border border-[#F0E6D8] rounded-2xl w-full max-w-lg overflow-hidden shadow-xl animate-scaleIn">
            <div className="bg-[#FAF6EE] border-b border-[#F0E6D8] p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-[#E86024]" />
                <h3 className="font-fraunces font-bold text-base text-[#2A201C]">
                  {editingProduct ? `Edit Product: ${editingProduct.name}` : 'Add New Product'}
                </h3>
              </div>
              <button
                onClick={() => setIsAddEditModalOpen(false)}
                className="text-[#8C7A70] hover:text-[#2A201C] p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="p-5 space-y-4 text-xs text-[#2A201C]">
              {/* Product Name */}
              <div className="space-y-1">
                <label className="font-bold text-[#6B5B52]">
                  Product Name <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Fresh Mango Glass"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#FAF6EE] border border-[#EADFCF] rounded-xl text-xs font-medium focus:outline-none focus:border-[#E86024]"
                />
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="font-bold text-[#6B5B52]">Description</label>
                <textarea
                  rows={3}
                  placeholder="e.g. Chilled seasonal fruit serving with rich cream..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#FAF6EE] border border-[#EADFCF] rounded-xl text-xs font-medium focus:outline-none focus:border-[#E86024]"
                />
              </div>

              {/* Base Price, Stock & Availability */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="font-bold text-[#6B5B52]">
                    Base Price (PKR) <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="1"
                    placeholder="200"
                    value={formPrice}
                    onChange={(e) => setFormPrice(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#FAF6EE] border border-[#EADFCF] rounded-xl text-xs font-bold focus:outline-none focus:border-[#E86024]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-[#6B5B52]">
                    Stock (Optional)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    placeholder="e.g. 50"
                    value={formStock}
                    onChange={(e) => setFormStock(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#FAF6EE] border border-[#EADFCF] rounded-xl text-xs font-bold focus:outline-none focus:border-[#E86024]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-[#6B5B52]">Initial Availability</label>
                  <div className="flex items-center gap-3 pt-2">
                    <label className="inline-flex items-center gap-2 cursor-pointer font-bold text-xs">
                      <input
                        type="checkbox"
                        checked={formIsAvailable}
                        onChange={(e) => setFormIsAvailable(e.target.checked)}
                        className="w-4 h-4 accent-[#E86024] rounded cursor-pointer"
                      />
                      <span>{formIsAvailable ? 'Available for Orders' : 'Marked Sold Out'}</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Product Image */}
              <div className="space-y-1">
                <label className="font-bold text-[#6B5B52]">Product Image</label>
                <div 
                  className="w-full h-40 bg-[#FAF6EE] border-2 border-dashed border-[#EADFCF] rounded-xl flex items-center justify-center cursor-pointer hover:border-[#E86024] hover:bg-[#FFF0E6] transition-colors relative overflow-hidden group"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageSelect}
                    accept="image/jpeg, image/png, image/webp"
                    className="hidden"
                  />
                  {(formImageBase64 || formImageUrl) ? (
                    <>
                      <img 
                        src={formImageBase64 || formImageUrl} 
                        alt="Product preview" 
                        className="w-full h-full object-contain"
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white gap-2">
                        <Upload className="w-6 h-6" />
                        <span className="text-xs font-bold">Change Image</span>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center text-[#8C7A70] group-hover:text-[#E86024] gap-2">
                      <Plus className="w-8 h-8 text-[#E86024]" />
                      <span className="text-xs font-bold text-[#2A201C]">Click to upload image</span>
                      <span className="text-[10px] text-[#8C7A70]">Supported formats: JPEG, PNG, WebP (Max 5MB)</span>
                    </div>
                  )}
                </div>
                <span className="text-[10px] text-[#8C7A70] block">
                  Leave empty to display default Mina Cafe product graphic badge.
                </span>
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#F0E6D8]">
                <button
                  type="button"
                  onClick={() => setIsAddEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[#FAF6EE] border border-[#EADFCF] font-bold text-[#6B5B52] hover:bg-[#F0E6D8] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-[#E86024] hover:bg-[#D05018] text-white font-bold inline-flex items-center gap-2 transition-colors shadow-xs"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>{editingProduct ? 'Update Product' : 'Create Product'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* 2. LINK PRODUCT TO TOPPINGS MODAL                    */}
      {/* ==================================================== */}
      {isToppingsModalOpen && selectedProductForToppings && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#FFFDF9] border border-[#F0E6D8] rounded-2xl w-full max-w-md overflow-hidden shadow-xl animate-scaleIn">
            <div className="bg-[#FAF6EE] border-b border-[#F0E6D8] p-4 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Layers className="w-5 h-5 text-[#E86024]" />
                  <h3 className="font-fraunces font-bold text-base text-[#2A201C]">
                    Link Toppings
                  </h3>
                </div>
                <span className="text-xs text-[#8C7A70] block">
                  Product: {selectedProductForToppings.name}
                </span>
              </div>
              <button
                onClick={() => setIsToppingsModalOpen(false)}
                className="text-[#8C7A70] hover:text-[#2A201C] p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs text-[#2A201C]">
              {loadingToppingLinks ? (
                <div className="p-8 text-center text-[#8C7A70] space-y-2">
                  <Loader2 className="w-5 h-5 animate-spin text-[#E86024] mx-auto" />
                  <span>Loading product toppings...</span>
                </div>
              ) : toppings.length === 0 ? (
                <div className="p-6 bg-[#FAF6EE] border border-[#EADFCF] rounded-xl text-center space-y-2">
                  <p className="font-bold text-[#6B5B52]">No toppings exist in system.</p>
                  <p className="text-[11px] text-[#8C7A70]">
                    Create toppings in the Topping Management section first.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs font-bold text-[#6B5B52]">
                    Select toppings available for customer selection on this product:
                  </p>
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {toppings.map((top) => {
                      const isLinked = linkedToppingIds.includes(top.id);
                      return (
                        <label
                          key={top.id}
                          className={`flex items-center justify-between p-3 rounded-xl border transition-colors cursor-pointer ${
                            isLinked
                              ? 'bg-[#FFF0E6] border-[#FCD5C1] text-[#E86024]'
                              : 'bg-[#FAF6EE] border-[#EADFCF] text-[#2A201C] hover:bg-[#F0E6D8]'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <input
                              type="checkbox"
                              checked={isLinked}
                              onChange={() => handleToggleToppingLink(top.id)}
                              className="w-4 h-4 accent-[#E86024] rounded cursor-pointer"
                            />
                            <span className="font-bold text-xs">{top.name}</span>
                          </div>

                          {!top.is_enabled && (
                            <span className="text-[10px] font-bold bg-rose-100 text-rose-800 px-2 py-0.5 rounded">
                              Disabled Globally
                            </span>
                          )}
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#F0E6D8]">
                <button
                  type="button"
                  onClick={() => setIsToppingsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[#FAF6EE] border border-[#EADFCF] font-bold text-[#6B5B52] hover:bg-[#F0E6D8] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveProductToppings}
                  disabled={savingToppingLinks || loadingToppingLinks}
                  className="px-5 py-2 rounded-xl bg-[#E86024] hover:bg-[#D05018] text-white font-bold inline-flex items-center gap-2 transition-colors shadow-xs"
                >
                  {savingToppingLinks ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Save Linked Toppings</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* 3. MANAGE TOPPING PRICING RULES MODAL               */}
      {/* ==================================================== */}
      {isPricingModalOpen && selectedProductForPricing && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#FFFDF9] border border-[#F0E6D8] rounded-2xl w-full max-w-lg overflow-hidden shadow-xl animate-scaleIn">
            <div className="bg-[#FAF6EE] border-b border-[#F0E6D8] p-4 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-emerald-600" />
                  <h3 className="font-fraunces font-bold text-base text-[#2A201C]">
                    Topping Pricing Rules
                  </h3>
                </div>
                <span className="text-xs text-[#8C7A70] block">
                  Product: {selectedProductForPricing.name}
                </span>
              </div>
              <button
                onClick={() => setIsPricingModalOpen(false)}
                className="text-[#8C7A70] hover:text-[#2A201C] p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs text-[#2A201C]">
              {/* Important Rule Notice */}
              <div className="p-3 bg-[#FFF8F0] border border-[#FCD5C1] rounded-xl text-[11px] text-[#2A201C] space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-[#E86024]">
                  <Info className="w-4 h-4 shrink-0" />
                  <span>Business Rule Notice:</span>
                </div>
                <p className="text-[#6B5B52] leading-relaxed">
                  Only topping counts with explicit pricing rules here are selectable by customers. Unconfigured counts (e.g. <strong>2 toppings</strong> for Fresh Fruit Glass) are intentionally unpriced and disabled for customer checkout.
                </p>
              </div>

              {loadingPricing ? (
                <div className="p-8 text-center text-[#8C7A70] space-y-2">
                  <Loader2 className="w-5 h-5 animate-spin text-[#E86024] mx-auto" />
                  <span>Loading pricing rules...</span>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between font-bold text-xs text-[#6B5B52]">
                    <span>Configured Topping Counts</span>
                    <button
                      type="button"
                      onClick={handleAddPricingRule}
                      className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-bold inline-flex items-center gap-1 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Rule</span>
                    </button>
                  </div>

                  {pricingRules.length === 0 ? (
                    <div className="p-4 text-center bg-[#FAF6EE] border border-[#EADFCF] rounded-xl text-[#8C7A70]">
                      No pricing rules defined. Customers will not be able to customize toppings for this product.
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                      {pricingRules.map((rule, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-3 p-3 bg-[#FAF6EE] border border-[#EADFCF] rounded-xl"
                        >
                          <div className="flex-1 space-y-1">
                            <label className="text-[10px] font-bold text-[#8C7A70] uppercase">
                              Topping Count
                            </label>
                            <input
                              type="number"
                              min="1"
                              value={rule.topping_count}
                              onChange={(e) =>
                                handleRuleChange(idx, 'topping_count', parseInt(e.target.value) || 1)
                              }
                              className="w-full px-2.5 py-1.5 bg-[#FFFDF9] border border-[#EADFCF] rounded-lg font-bold text-xs focus:outline-none focus:border-[#E86024]"
                            />
                          </div>

                          <div className="flex-1 space-y-1">
                            <label className="text-[10px] font-bold text-[#8C7A70] uppercase">
                              Extra Price (PKR)
                            </label>
                            <input
                              type="number"
                              min="0"
                              value={rule.extra_price}
                              onChange={(e) =>
                                handleRuleChange(idx, 'extra_price', parseFloat(e.target.value) || 0)
                              }
                              className="w-full px-2.5 py-1.5 bg-[#FFFDF9] border border-[#EADFCF] rounded-lg font-bold text-xs text-emerald-700 focus:outline-none focus:border-[#E86024]"
                            />
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRemoveRule(idx)}
                            className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors mt-4"
                            title="Remove Rule"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#F0E6D8]">
                <button
                  type="button"
                  onClick={() => setIsPricingModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[#FAF6EE] border border-[#EADFCF] font-bold text-[#6B5B52] hover:bg-[#F0E6D8] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSavePricing}
                  disabled={savingPricing || loadingPricing}
                  className="px-5 py-2 rounded-xl bg-[#E86024] hover:bg-[#D05018] text-white font-bold inline-flex items-center gap-2 transition-colors shadow-xs"
                >
                  {savingPricing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Save Pricing Rules</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
