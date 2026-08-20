import React, { useState, useEffect } from 'react';
import { Topping } from '../../types/index';
import { supabase } from '../../lib/supabase';
import {
  Layers,
  Plus,
  Edit2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Search,
  RefreshCw,
  X,
  Check,
} from 'lucide-react';

export const AdminToppingsManager: React.FC = () => {
  const [toppings, setToppings] = useState<Topping[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Add / Edit Modal state
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingTopping, setEditingTopping] = useState<Topping | null>(null);
  const [formName, setFormName] = useState<string>('');
  const [formIsEnabled, setFormIsEnabled] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    fetchToppings();
  }, []);

  const getAuthToken = async (): Promise<string> => {
    const { data: sessionData } = await supabase.auth.getSession();
    return sessionData.session?.access_token || '';
  };

  const fetchToppings = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await getAuthToken();
      const res = await fetch('/api/admin/catalog/toppings', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to fetch toppings catalog');
      }
      setToppings(data.toppings || []);
    } catch (err: any) {
      setError(err.message || 'Error loading toppings');
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  // ----------------------------------------------------
  // Toggle Topping Availability
  // ----------------------------------------------------
  const handleToggleTopping = async (topping: Topping) => {
    const newStatus = !topping.is_enabled;
    try {
      const token = await getAuthToken();
      const res = await fetch(`/api/admin/catalog/toppings/${topping.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ is_enabled: newStatus }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to update topping status');
      }

      setToppings((prev) =>
        prev.map((t) => (t.id === topping.id ? { ...t, is_enabled: newStatus } : t))
      );
      showNotification(`Topping "${topping.name}" is now ${newStatus ? 'Enabled' : 'Disabled'}.`);
    } catch (err: any) {
      alert(`Error toggling topping: ${err.message}`);
    }
  };

  // ----------------------------------------------------
  // Add / Edit Handlers
  // ----------------------------------------------------
  const openAddModal = () => {
    setEditingTopping(null);
    setFormName('');
    setFormIsEnabled(true);
    setIsModalOpen(true);
  };

  const openEditModal = (topping: Topping) => {
    setEditingTopping(topping);
    setFormName(topping.name);
    setFormIsEnabled(topping.is_enabled);
    setIsModalOpen(true);
  };

  const handleSaveTopping = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      alert('Topping name is required.');
      return;
    }

    setSubmitting(true);
    try {
      const token = await getAuthToken();
      const isEditing = Boolean(editingTopping);
      const url = isEditing
        ? `/api/admin/catalog/toppings/${editingTopping!.id}`
        : '/api/admin/catalog/toppings';
      const method = isEditing ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: formName.trim(),
          is_enabled: formIsEnabled,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to save topping.');
      }

      showNotification(isEditing ? 'Topping updated successfully.' : 'New topping created successfully.');
      setIsModalOpen(false);
      fetchToppings();
    } catch (err: any) {
      alert(`Save error: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  // Filtered Toppings
  const filteredToppings = toppings.filter((t) =>
    t.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Top Header & Search */}
      <div className="bg-[#FFFDF9] border border-[#F0E6D8] rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-[#E86024]" />
              <h2 className="font-fraunces text-xl font-bold text-[#2A201C]">
                Toppings Catalog ({toppings.length})
              </h2>
            </div>
            <p className="text-xs text-[#8C7A70] pt-1">
              Manage extra toppings (e.g. Honey, Condensed Milk, Chocolate) and global availability.
            </p>
          </div>

          <button
            onClick={openAddModal}
            className="px-4 py-2.5 rounded-xl bg-[#E86024] hover:bg-[#D05018] text-white text-xs font-bold inline-flex items-center gap-2 transition-colors shadow-xs shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Topping</span>
          </button>
        </div>

        {/* Search */}
        <div className="flex items-center justify-between gap-3 pt-2 border-t border-[#F0E6D8]">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-[#8C7A70] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search topping by name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-[#FAF6EE] border border-[#EADFCF] rounded-xl text-xs text-[#2A201C] focus:outline-none focus:border-[#E86024]"
            />
          </div>

          <button
            onClick={fetchToppings}
            className="p-2 bg-[#FAF6EE] hover:bg-[#F0E6D8] border border-[#EADFCF] rounded-xl text-[#2A201C] transition-colors"
            title="Refresh Toppings"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Notifications */}
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

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-bold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Toppings Table */}
      {loading ? (
        <div className="bg-[#FFFDF9] border border-[#F0E6D8] rounded-2xl p-12 text-center text-xs text-[#8C7A70] flex flex-col items-center justify-center space-y-3">
          <Loader2 className="w-6 h-6 animate-spin text-[#E86024]" />
          <span>Loading toppings from Supabase...</span>
        </div>
      ) : filteredToppings.length === 0 ? (
        <div className="bg-[#FFFDF9] border border-[#F0E6D8] rounded-2xl p-12 text-center space-y-3">
          <Layers className="w-8 h-8 text-[#8C7A70] mx-auto opacity-50" />
          <h3 className="font-fraunces text-base font-bold text-[#2A201C]">
            No toppings found
          </h3>
          <p className="text-xs text-[#8C7A70]">
            {searchTerm ? 'No toppings match your search keyword.' : 'No toppings exist in database.'}
          </p>
        </div>
      ) : (
        <div className="bg-[#FFFDF9] border border-[#F0E6D8] rounded-2xl overflow-hidden shadow-xs">
          <table className="w-full text-left text-xs text-[#2A201C]">
            <thead className="bg-[#FAF6EE] border-b border-[#F0E6D8] font-fraunces text-[#6B5B52] uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3.5 px-4 font-bold">Topping Name</th>
                <th className="py-3.5 px-4 font-bold">Global Status</th>
                <th className="py-3.5 px-4 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0E6D8]">
              {filteredToppings.map((top) => (
                <tr key={top.id} className="hover:bg-[#FAF6EE]/60 transition-colors">
                  <td className="py-4 px-4 font-bold text-sm text-[#2A201C]">
                    {top.name}
                  </td>

                  <td className="py-4 px-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggleTopping(top)}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          top.is_enabled ? 'bg-emerald-600' : 'bg-rose-600'
                        }`}
                        title={`Click to ${top.is_enabled ? 'Disable' : 'Enable'}`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                            top.is_enabled ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                      <span
                        className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                          top.is_enabled
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : 'bg-rose-50 text-rose-800 border-rose-200'
                        }`}
                      >
                        {top.is_enabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                  </td>

                  <td className="py-4 px-4 text-right">
                    <button
                      onClick={() => openEditModal(top)}
                      className="px-3 py-1.5 rounded-lg bg-[#FAF6EE] hover:bg-[#F0E6D8] border border-[#EADFCF] text-xs font-bold text-[#2A201C] inline-flex items-center gap-1 transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-[#E86024]" />
                      <span>Edit Name</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#FFFDF9] border border-[#F0E6D8] rounded-2xl w-full max-w-md overflow-hidden shadow-xl animate-scaleIn">
            <div className="bg-[#FAF6EE] border-b border-[#F0E6D8] p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-[#E86024]" />
                <h3 className="font-fraunces font-bold text-base text-[#2A201C]">
                  {editingTopping ? `Edit Topping: ${editingTopping.name}` : 'Add New Topping'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-[#8C7A70] hover:text-[#2A201C] p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTopping} className="p-5 space-y-4 text-xs text-[#2A201C]">
              <div className="space-y-1">
                <label className="font-bold text-[#6B5B52]">
                  Topping Name <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Extra Nuts, Chocolate Chips"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#FAF6EE] border border-[#EADFCF] rounded-xl text-xs font-medium focus:outline-none focus:border-[#E86024]"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-[#6B5B52]">Initial Global Status</label>
                <div className="pt-1">
                  <label className="inline-flex items-center gap-2 cursor-pointer font-bold text-xs">
                    <input
                      type="checkbox"
                      checked={formIsEnabled}
                      onChange={(e) => setFormIsEnabled(e.target.checked)}
                      className="w-4 h-4 accent-[#E86024] rounded cursor-pointer"
                    />
                    <span>{formIsEnabled ? 'Enabled for Selection' : 'Disabled'}</span>
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#F0E6D8]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
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
                    <span>{editingTopping ? 'Update Topping' : 'Create Topping'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
