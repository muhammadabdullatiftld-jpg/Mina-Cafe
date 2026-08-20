import React, { useState, useEffect } from 'react';
import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';
import { HomeView } from './views/HomeView';
import { MenuView } from './views/MenuView';
import { ProductDetailView } from './views/ProductDetailView';
import { CartView } from './views/CartView';
import { CheckoutView } from './views/CheckoutView';
import { TrackingView } from './views/TrackingView';
import { AdminLoginView } from './views/AdminLoginView';
import { AdminDashboardShell } from './views/AdminDashboardShell';
import { CartProvider } from './context/CartContext';
import { AdminAuthProvider, useAdminAuth } from './context/AdminAuthContext';
import { Loader2 } from 'lucide-react';

function AppContent() {
  const [currentPath, setCurrentPath] = useState<string>(() => {
    return window.location.pathname || '/';
  });

  const { session, isAdmin, loading: authLoading } = useAdminAuth();

  // Keep state synced with browser history navigation
  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname || '/');
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = (path: string) => {
    window.history.pushState({}, '', path);
    setCurrentPath(path);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Protected Admin Route Handling
  if (currentPath === '/admin' || currentPath.startsWith('/admin/')) {
    if (authLoading) {
      return (
        <div className="min-h-screen bg-[#FAF6EE] flex flex-col items-center justify-center p-4 space-y-4">
          <Loader2 className="w-10 h-10 text-[#E86024] animate-spin" />
          <p className="text-xs font-semibold text-[#8C7A70]">Verifying admin authorization...</p>
        </div>
      );
    }

    if (currentPath === '/admin/login') {
      return (
        <AdminLoginView
          onLoginSuccess={() => navigate('/admin')}
          onNavigateHome={() => navigate('/')}
        />
      );
    }

    // Protection check for /admin and any sub-admin route
    if (!session || !isAdmin) {
      return (
        <AdminLoginView
          onLoginSuccess={() => navigate('/admin')}
          onNavigateHome={() => navigate('/')}
        />
      );
    }

    return (
      <AdminDashboardShell
        onNavigateHome={() => navigate('/')}
        onLogout={() => navigate('/admin/login')}
      />
    );
  }

  // Customer View Route matching logic
  const renderView = () => {
    if (currentPath.startsWith('/track/')) {
      const trackingToken = currentPath.replace('/track/', '');
      return (
        <TrackingView
          trackingToken={trackingToken}
          onNavigateToMenu={() => navigate('/menu')}
        />
      );
    }

    if (currentPath === '/cart') {
      return (
        <CartView
          onNavigateToCheckout={() => navigate('/checkout')}
          onNavigateToMenu={() => navigate('/menu')}
        />
      );
    }

    if (currentPath === '/checkout') {
      return (
        <CheckoutView
          onNavigateToMenu={() => navigate('/menu')}
          onNavigateToCart={() => navigate('/cart')}
          onNavigateToTracking={(token) => navigate(`/track/${token}`)}
        />
      );
    }

    if (currentPath.startsWith('/product/')) {
      const productId = currentPath.replace('/product/', '');
      return (
        <ProductDetailView
          productId={productId}
          onBackToMenu={() => navigate('/menu')}
          onNavigateToCart={() => navigate('/cart')}
        />
      );
    }

    if (currentPath === '/menu') {
      return (
        <MenuView
          onSelectProduct={(productId) => navigate(`/product/${productId}`)}
        />
      );
    }

    // Default Home View
    return (
      <HomeView
        onNavigate={navigate}
        onSelectProduct={(productId) => navigate(`/product/${productId}`)}
      />
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF6EE] text-[#2A201C] font-sans antialiased">
      {/* Navigation */}
      <Navbar currentPath={currentPath} onNavigate={navigate} />

      {/* Main Content View */}
      <main className="flex-1">
        {renderView()}
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}

export default function App() {
  return (
    <AdminAuthProvider>
      <CartProvider>
        <AppContent />
      </CartProvider>
    </AdminAuthProvider>
  );
}
