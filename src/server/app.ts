import { fetchProductsFromSupabase } from '../lib/productsService.js';
import { fetchAdminSettings } from '../lib/settingsService.js';
import { createOrderServerSide } from '../lib/orderService.js';
import { submitPaymentServerSide } from '../lib/paymentService.js';
import { getTrackingOrderServerSide } from '../lib/trackingService.js';
import { verifyAdminServerSide } from '../lib/adminAuthService.js';
import { getAdminOrdersServerSide } from '../lib/adminOrderService.js';
import { getAdminOrderDetailServerSide } from '../lib/adminOrderService.js';
import { updateOrderStatusServerSide } from '../lib/adminOrderService.js';
import { verifyPaymentServerSide } from '../lib/adminOrderService.js';
import { getAdminProductsServerSide } from '../lib/adminCatalogService.js';
import { createProductServerSide } from '../lib/adminCatalogService.js';
import { updateProductServerSide } from '../lib/adminCatalogService.js';
import { getAdminToppingsServerSide } from '../lib/adminCatalogService.js';
import { createToppingServerSide } from '../lib/adminCatalogService.js';
import { updateToppingServerSide } from '../lib/adminCatalogService.js';
import { getProductToppingsServerSide } from '../lib/adminCatalogService.js';
import { updateProductToppingsServerSide } from '../lib/adminCatalogService.js';
import { getProductPricingServerSide } from '../lib/adminCatalogService.js';
import { updateProductPricingServerSide } from '../lib/adminCatalogService.js';
import { getAdminSettingsServerSide } from '../lib/adminSettingsService.js';
import { updateAdminSettingsServerSide } from '../lib/adminSettingsService.js';

import express from 'express';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const app = express();
app.use(express.json({ limit: '10mb' }));

// Health endpoint
app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      app: 'Mina Cafe Karachi',
      timestamp: new Date().toISOString(),
    });
  });

  // Products proxy endpoint
  app.get('/api/products', async (_req, res) => {
    try {
      
      const result = await fetchProductsFromSupabase();
      res.json(result);
    } catch (error: any) {
      res.status(500).json({
        products: [],
        error: error.message || 'Server error reading products from database',
        isConfigured: false,
      });
    }
  });

  // Admin settings endpoint (delivery fee, shop status)
  app.get('/api/settings', async (_req, res) => {
    try {
      
      const result = await fetchAdminSettings();
      res.json(result);
    } catch (error: any) {
      res.status(500).json({
        settings: null,
        deliveryFee: 100,
        error: error.message || 'Server error fetching settings',
      });
    }
  });

  // Create order endpoint with server-side validation & pricing calculation
  app.post('/api/orders', async (req, res) => {
    try {
      
      const result = await createOrderServerSide(req.body);

      if (!result.success) {
        res.status(400).json(result);
        return;
      }

      res.status(201).json(result);
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message || 'An unexpected error occurred while processing your order.',
      });
    }
  });

  // Payment submission endpoint (EasyPaisa transaction ID & proof screenshot)
  app.post('/api/payments/submit', async (req, res) => {
    try {
      
      const result = await submitPaymentServerSide(req.body);

      if (!result.success) {
        res.status(400).json(result);
        return;
      }

      res.status(200).json(result);
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message || 'An unexpected error occurred while submitting payment.',
      });
    }
  });

  // Public order tracking endpoint by secure tracking token ONLY
  app.get('/api/orders/track/:trackingToken', async (req, res) => {
    try {
      const { trackingToken } = req.params;
      
      const result = await getTrackingOrderServerSide(trackingToken);

      if (!result.success) {
        res.status(404).json(result);
        return;
      }

      res.status(200).json(result);
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message || 'An error occurred while tracking the order.',
      });
    }
  });

  // Admin authentication & authorization verification endpoint
  app.get('/api/admin/verify', async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      
      const result = await verifyAdminServerSide(authHeader);

      if (!result.success || !result.isAdmin) {
        res.status(401).json(result);
        return;
      }

      res.status(200).json(result);
    } catch (error: any) {
      res.status(500).json({
        success: false,
        isAdmin: false,
        error: error.message || 'An unexpected error occurred during admin verification.',
      });
    }
  });

  // Admin List Orders endpoint (with search & filters)
  app.get('/api/admin/orders', async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      const { search, status, paymentStatus } = req.query;
      

      const result = await getAdminOrdersServerSide(authHeader, {
        search: typeof search === 'string' ? search : undefined,
        status: typeof status === 'string' ? status : undefined,
        paymentStatus: typeof paymentStatus === 'string' ? paymentStatus : undefined,
      });

      if (!result.success) {
        res.status(result.error?.includes('Unauthorized') ? 401 : 400).json(result);
        return;
      }

      res.status(200).json(result);
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message || 'Error retrieving admin orders list.',
      });
    }
  });

  // Admin Single Order Detail endpoint
  app.get('/api/admin/orders/:id', async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      const { id } = req.params;
      

      const result = await getAdminOrderDetailServerSide(authHeader, id);

      if (!result.success) {
        res.status(result.error?.includes('Unauthorized') ? 401 : 404).json(result);
        return;
      }

      res.status(200).json(result);
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message || 'Error retrieving order detail.',
      });
    }
  });

  // Admin Update Order Status endpoint
  app.put('/api/admin/orders/:id/status', async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      const { id } = req.params;
      const { status } = req.body;
      

      const result = await updateOrderStatusServerSide(authHeader, id, status);

      if (!result.success) {
        res.status(result.error?.includes('Unauthorized') ? 401 : 400).json(result);
        return;
      }

      res.status(200).json(result);
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message || 'Error updating order status.',
      });
    }
  });

  // Admin Verify/Reject Payment endpoint
  app.put('/api/admin/payments/:orderId/verify', async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      const { orderId } = req.params;
      const { action, rejectionReason } = req.body;
      

      const result = await verifyPaymentServerSide(authHeader, orderId, action, rejectionReason);

      if (!result.success) {
        res.status(result.error?.includes('Unauthorized') ? 401 : 400).json(result);
        return;
      }

      res.status(200).json(result);
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message || 'Error processing payment verification.',
      });
    }
  });

  // Admin Catalog: List Products
  app.get('/api/admin/catalog/products', async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      
      const result = await getAdminProductsServerSide(authHeader);

      if (!result.success) {
        res.status(result.error?.includes('Unauthorized') ? 401 : 400).json(result);
        return;
      }
      res.status(200).json(result);
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message || 'Server error fetching products.' });
    }
  });

  // Admin Catalog: Create Product
  app.post('/api/admin/catalog/products', async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      
      const result = await createProductServerSide(authHeader, req.body);

      if (!result.success) {
        res.status(result.error?.includes('Unauthorized') ? 401 : 400).json(result);
        return;
      }
      res.status(200).json(result);
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message || 'Server error creating product.' });
    }
  });

  // Admin Catalog: Update Product
  app.put('/api/admin/catalog/products/:id', async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      const { id } = req.params;
      
      const result = await updateProductServerSide(authHeader, id, req.body);

      if (!result.success) {
        res.status(result.error?.includes('Unauthorized') ? 401 : 400).json(result);
        return;
      }
      res.status(200).json(result);
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message || 'Server error updating product.' });
    }
  });

  // Admin Catalog: List Toppings
  app.get('/api/admin/catalog/toppings', async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      
      const result = await getAdminToppingsServerSide(authHeader);

      if (!result.success) {
        res.status(result.error?.includes('Unauthorized') ? 401 : 400).json(result);
        return;
      }
      res.status(200).json(result);
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message || 'Server error fetching toppings.' });
    }
  });

  // Admin Catalog: Create Topping
  app.post('/api/admin/catalog/toppings', async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      
      const result = await createToppingServerSide(authHeader, req.body);

      if (!result.success) {
        res.status(result.error?.includes('Unauthorized') ? 401 : 400).json(result);
        return;
      }
      res.status(200).json(result);
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message || 'Server error creating topping.' });
    }
  });

  // Admin Catalog: Update Topping
  app.put('/api/admin/catalog/toppings/:id', async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      const { id } = req.params;
      
      const result = await updateToppingServerSide(authHeader, id, req.body);

      if (!result.success) {
        res.status(result.error?.includes('Unauthorized') ? 401 : 400).json(result);
        return;
      }
      res.status(200).json(result);
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message || 'Server error updating topping.' });
    }
  });

  // Admin Catalog: Get Product Toppings
  app.get('/api/admin/catalog/products/:id/toppings', async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      const { id } = req.params;
      
      const result = await getProductToppingsServerSide(authHeader, id);

      if (!result.success) {
        res.status(result.error?.includes('Unauthorized') ? 401 : 400).json(result);
        return;
      }
      res.status(200).json(result);
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message || 'Server error fetching product toppings.' });
    }
  });

  // Admin Catalog: Update Product Toppings
  app.put('/api/admin/catalog/products/:id/toppings', async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      const { id } = req.params;
      const { toppingIds } = req.body;
      
      const result = await updateProductToppingsServerSide(authHeader, id, toppingIds);

      if (!result.success) {
        res.status(result.error?.includes('Unauthorized') ? 401 : 400).json(result);
        return;
      }
      res.status(200).json(result);
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message || 'Server error updating product toppings.' });
    }
  });

  // Admin Catalog: Get Product Pricing
  app.get('/api/admin/catalog/products/:id/pricing', async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      const { id } = req.params;
      
      const result = await getProductPricingServerSide(authHeader, id);

      if (!result.success) {
        res.status(result.error?.includes('Unauthorized') ? 401 : 400).json(result);
        return;
      }
      res.status(200).json(result);
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message || 'Server error fetching product pricing.' });
    }
  });

  // Admin Catalog: Update Product Pricing
  app.put('/api/admin/catalog/products/:id/pricing', async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      const { id } = req.params;
      const { rules } = req.body;
      
      const result = await updateProductPricingServerSide(authHeader, id, rules);

      if (!result.success) {
        res.status(result.error?.includes('Unauthorized') ? 401 : 400).json(result);
        return;
      }
      res.status(200).json(result);
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message || 'Server error updating product pricing.' });
    }
  });

  // Admin Settings: Get Settings
  app.get('/api/admin/settings', async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      
      const result = await getAdminSettingsServerSide(authHeader);

      if (!result.success) {
        res.status(result.error?.includes('Unauthorized') ? 401 : 400).json(result);
        return;
      }
      res.status(200).json(result);
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message || 'Server error fetching admin settings.' });
    }
  });

  // Admin Settings: Update Settings
  app.put('/api/admin/settings', async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      
      const result = await updateAdminSettingsServerSide(authHeader, req.body);

      if (!result.success) {
        res.status(result.error?.includes('Unauthorized') ? 401 : 400).json(result);
        return;
      }
      res.status(200).json(result);
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message || 'Server error updating admin settings.' });
    }
  });

export default app;
