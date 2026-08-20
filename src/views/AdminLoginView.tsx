import React, { useState, useEffect } from 'react';
import { useAdminAuth } from '../context/AdminAuthContext';
import { setPageTitleAndMeta } from '../lib/utils';
import { ShieldCheck, Lock, Mail, Loader2, AlertCircle, ArrowLeft, LogOut, LayoutDashboard } from 'lucide-react';

interface AdminLoginViewProps {
  onLoginSuccess: () => void;
  onNavigateHome: () => void;
}

export const AdminLoginView: React.FC<AdminLoginViewProps> = ({
  onLoginSuccess,
  onNavigateHome,
}) => {
  const { login, logout, loading, error, session, isAdmin, adminUser, clearError } = useAdminAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    setPageTitleAndMeta('Admin Login', 'Mina Cafe Karachi Secure Admin Access');
    clearError();
  }, []);

  useEffect(() => {
    if (isAdmin && session) {
      // If user is already authenticated as admin, redirect to admin dashboard
      onLoginSuccess();
    }
  }, [isAdmin, session]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    clearError();

    if (!email.trim()) {
      setLocalError('Please enter your admin email address.');
      return;
    }

    if (!password) {
      setLocalError('Please enter your password.');
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await login(email, password);
      if (result.success) {
        onLoginSuccess();
      } else {
        setLocalError(result.error || 'Authentication failed. Please check credentials.');
      }
    } catch (err: any) {
      setLocalError(err.message || 'An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const displayedError = localError || error;

  return (
    <div className="min-h-screen bg-[#FAF6EE] flex flex-col justify-center items-center px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        {/* Back Link */}
        <div className="flex justify-start">
          <button
            onClick={onNavigateHome}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#8C7A70] hover:text-[#E86024] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Customer Site</span>
          </button>
        </div>

        {/* Card */}
        <div className="bg-[#FFFDF9] border border-[#F0E6D8] rounded-3xl p-6 sm:p-8 space-y-6 shadow-md">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="w-14 h-14 bg-[#FFF0E6] text-[#E86024] rounded-2xl border border-[#FCD5C1] flex items-center justify-center mx-auto shadow-xs">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <span className="text-[11px] font-bold uppercase tracking-widest text-[#E86024] block pt-1">
              Mina Cafe Karachi
            </span>
            <h1 className="font-fraunces text-2xl font-bold text-[#2A201C]">
              Admin Portal Sign In
            </h1>
            <p className="text-xs text-[#6B5B52]">
              Authenticate with your administrative credentials to manage store operations.
            </p>
          </div>

          {/* Already Authenticated View */}
          {session && isAdmin ? (
            <div className="bg-[#FAF6EE] border border-[#EADFCF] rounded-2xl p-5 space-y-4 text-center">
              <p className="text-xs text-[#2A201C]">
                Signed in as <strong className="font-bold text-[#E86024]">{adminUser?.email || session.user.email}</strong>
              </p>
              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  onClick={onLoginSuccess}
                  className="flex-1 py-3 px-4 rounded-xl bg-[#E86024] hover:bg-[#D05018] text-white text-xs font-bold uppercase tracking-wider inline-flex items-center justify-center gap-2"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  <span>Go to Dashboard</span>
                </button>
                <button
                  onClick={() => logout()}
                  className="py-3 px-4 rounded-xl bg-white border border-[#E0D5C5] hover:bg-rose-50 hover:text-rose-700 text-[#2A201C] text-xs font-bold uppercase tracking-wider inline-flex items-center justify-center gap-2"
                >
                  <LogOut className="w-4 h-4 text-rose-600" />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          ) : (
            /* Login Form */
            <form onSubmit={handleSubmit} className="space-y-4">
              {displayedError && (
                <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3.5 rounded-2xl flex items-start gap-2.5 text-xs">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <strong className="font-bold block">Sign In Error:</strong>
                    <span>{displayedError}</span>
                  </div>
                </div>
              )}

              {/* Email */}
              <div>
                <label className="block text-xs font-bold text-[#2A201C] mb-1 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-[#E86024]" />
                  Admin Email Address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@minacafe.pk"
                  autoComplete="email"
                  className="w-full px-4 py-3 rounded-xl bg-[#FAF6EE] border border-[#EADFCF] text-xs sm:text-sm text-[#2A201C] placeholder-[#8C7A70] focus:outline-none focus:border-[#E86024] focus:ring-1 focus:ring-[#E86024]"
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-bold text-[#2A201C] mb-1 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-[#E86024]" />
                  Password
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  autoComplete="current-password"
                  className="w-full px-4 py-3 rounded-xl bg-[#FAF6EE] border border-[#EADFCF] text-xs sm:text-sm text-[#2A201C] placeholder-[#8C7A70] focus:outline-none focus:border-[#E86024] focus:ring-1 focus:ring-[#E86024]"
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting || loading}
                className="w-full py-3.5 px-6 rounded-2xl bg-[#E86024] hover:bg-[#D05018] text-white text-xs sm:text-sm font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm transition-all active:scale-[0.98] disabled:opacity-60 min-h-[46px]"
              >
                {isSubmitting || loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Verifying Credentials...</span>
                  </>
                ) : (
                  <span>Sign In to Admin</span>
                )}
              </button>
            </form>
          )}

          <div className="pt-2 border-t border-[#F0E6D8] text-center">
            <p className="text-[11px] text-[#8C7A70]">
              🔒 Protected Portal. Unauthorized access attempts are logged.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
