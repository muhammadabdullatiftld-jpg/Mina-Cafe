import React, { createContext, useContext, useState, useEffect } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface AdminUser {
  id: string;
  email: string;
}

interface AdminAuthContextType {
  session: Session | null;
  isAdmin: boolean;
  adminUser: AdminUser | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  clearError: () => void;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

export const AdminAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const clearError = () => setError(null);

  const verifyAdmin = async (accessToken?: string): Promise<boolean> => {
    try {
      let token = accessToken;
      if (!token) {
        const { data } = await supabase.auth.getSession();
        token = data.session?.access_token;
      }

      if (!token) {
        setIsAdmin(false);
        setAdminUser(null);
        return false;
      }

      const response = await fetch('/api/admin/verify', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (response.ok && data.success && data.isAdmin) {
        setIsAdmin(true);
        if (data.user) {
          setAdminUser(data.user);
        } else if (session?.user) {
          setAdminUser({
            id: session.user.id,
            email: session.user.email || '',
          });
        }
        return true;
      } else {
        setIsAdmin(false);
        setAdminUser(null);
        setError(data.error || 'Access denied: Account lacks admin permissions.');
        return false;
      }
    } catch (err: any) {
      console.error('Admin verification error:', err);
      setIsAdmin(false);
      setAdminUser(null);
      return false;
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      setLoading(true);
      try {
        const { data } = await supabase.auth.getSession();
        setSession(data.session);
        if (data.session) {
          await verifyAdmin(data.session.access_token);
        } else {
          setIsAdmin(false);
          setAdminUser(null);
        }
      } catch (err) {
        console.error('Auth init error:', err);
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      setSession(newSession);
      if (newSession) {
        await verifyAdmin(newSession.access_token);
      } else {
        setIsAdmin(false);
        setAdminUser(null);
      }
      setLoading(false);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    setError(null);
    try {
      const { data, error: authErr } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (authErr || !data.session) {
        const errorMsg = authErr?.message || 'Invalid email or password credentials.';
        setError(errorMsg);
        return { success: false, error: errorMsg };
      }

      setSession(data.session);

      // Verify admin authorization server-side
      const isAuthorized = await verifyAdmin(data.session.access_token);
      if (!isAuthorized) {
        await supabase.auth.signOut();
        setSession(null);
        setIsAdmin(false);
        setAdminUser(null);
        const deniedMsg = 'Access denied: Your account is not registered as an administrator.';
        setError(deniedMsg);
        return { success: false, error: deniedMsg };
      }

      return { success: true };
    } catch (err: any) {
      const msg = err.message || 'Network error during login.';
      setError(msg);
      return { success: false, error: msg };
    }
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Error during sign out:', err);
    } finally {
      setSession(null);
      setIsAdmin(false);
      setAdminUser(null);
      setError(null);
    }
  };

  return (
    <AdminAuthContext.Provider
      value={{
        session,
        isAdmin,
        adminUser,
        loading,
        error,
        login,
        logout,
        clearError,
      }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
};

export const useAdminAuth = () => {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  }
  return context;
};
