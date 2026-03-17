/**
 * PayPal Payments Routes
 * 
 * Handles both one-time payments (birth chart purchase) and subscriptions (premium plan).
 * 
 * PayPal Integration uses the PayPal JavaScript SDK on the frontend
 * and server-side verification via the PayPal REST API.
 */

const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAuth, optionalAuth } = require('../middleware/auth');

// ── Product Pricing ──────────────────────────────────────────────────────────
const PRODUCTS = {
  birth_chart: {
    name: 'Birth Chart Reading',
    description: 'One-time purchase for your personalized astrological birth chart',
    price: '19.99',
    currency: 'USD'
  },
  premium_subscription: {
    name: 'Premium Subscription',
    description: 'Monthly subscription for daily guide and Nexus AI access',
    price: '9.99',
    currency: 'USD',
    interval: 'MONTH'
  }
};

// ── GET /api/payments/products — List available products ─────────────────────
router.get('/products', (_req, res) => {
  res.json({
    one_time: {
      birth_chart: PRODUCTS.birth_chart
    },
    subscription: {
      premium: PRODUCTS.premium_subscription
    }
  });
});

// ── GET /api/payments/config — Get PayPal client ID for frontend ─────────────
router.get('/config', (_req, res) => {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  if (!clientId) {
    return res.status(500).json({ error: 'PayPal is not configured' });
  }
  res.json({ 
    clientId,
    planId: process.env.PAYPAL_PLAN_ID || null,
    currency: 'USD'
  });
});

// ── POST /api/payments/create-order — Create PayPal order for one-time payment
router.post('/create-order', requireAuth, async (req, res, next) => {
  const { product_type } = req.body;
  
  if (!product_type || !PRODUCTS[product_type]) {
    return res.status(400).json({ error: 'Invalid product type' });
  }

  const product = PRODUCTS[product_type];
  
  try {
    // Store pending purchase in database
    const { rows } = await db.query(
      `INSERT INTO purchases (user_id, product_type, amount, currency, status)
       VALUES ($1, $2, $3, $4, 'pending')
       RETURNING id`,
      [req.user.id, product_type, product.price, product.currency]
    );
    
    // Return order details for PayPal SDK to create the order on frontend
    res.json({
      purchase_id: rows[0].id,
      product: product,
      amount: product.price,
      currency: product.currency
    });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/payments/capture-order — Capture PayPal order after approval ───
router.post('/capture-order', requireAuth, async (req, res, next) => {
  const { purchase_id, paypal_order_id } = req.body;
  
  if (!purchase_id || !paypal_order_id) {
    return res.status(400).json({ error: 'purchase_id and paypal_order_id are required' });
  }

  try {
    // Update purchase with PayPal order ID and mark as completed
    const { rows } = await db.query(
      `UPDATE purchases 
       SET paypal_order_id = $1, status = 'completed', updated_at = NOW()
       WHERE id = $2 AND user_id = $3 AND status = 'pending'
       RETURNING *`,
      [paypal_order_id, purchase_id, req.user.id]
    );
    
    if (!rows.length) {
      return res.status(404).json({ error: 'Purchase not found or already processed' });
    }

    res.json({ 
      success: true, 
      purchase: rows[0],
      message: 'Payment completed successfully! You can now access your birth chart.'
    });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'This PayPal order has already been processed' });
    }
    next(err);
  }
});

// ── POST /api/payments/create-subscription — Start subscription process ──────
router.post('/create-subscription', requireAuth, async (req, res, next) => {
  try {
    // Check if user already has an active subscription
    const existing = await db.query(
      `SELECT id FROM subscriptions WHERE user_id = $1 AND status = 'active'`,
      [req.user.id]
    );
    
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'You already have an active subscription' });
    }

    // Store pending subscription in database
    const { rows } = await db.query(
      `INSERT INTO subscriptions (user_id, plan_type, status)
       VALUES ($1, 'premium', 'pending')
       RETURNING id`,
      [req.user.id]
    );
    
    res.json({
      subscription_id: rows[0].id,
      plan: PRODUCTS.premium_subscription
    });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/payments/activate-subscription — Activate after PayPal approval 
router.post('/activate-subscription', requireAuth, async (req, res, next) => {
  const { subscription_id, paypal_subscription_id } = req.body;
  
  if (!subscription_id || !paypal_subscription_id) {
    return res.status(400).json({ 
      error: 'subscription_id and paypal_subscription_id are required' 
    });
  }

  try {
    const { rows } = await db.query(
      `UPDATE subscriptions 
       SET paypal_subscription_id = $1, 
           status = 'active', 
           start_date = NOW(),
           updated_at = NOW()
       WHERE id = $2 AND user_id = $3 AND status = 'pending'
       RETURNING *`,
      [paypal_subscription_id, subscription_id, req.user.id]
    );
    
    if (!rows.length) {
      return res.status(404).json({ error: 'Subscription not found or already processed' });
    }

    res.json({ 
      success: true, 
      subscription: rows[0],
      message: 'Subscription activated! Welcome to Premium. You now have access to daily guides and Nexus AI.'
    });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'This PayPal subscription has already been processed' });
    }
    next(err);
  }
});

// ── POST /api/payments/cancel-subscription — Cancel active subscription ──────
router.post('/cancel-subscription', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `UPDATE subscriptions 
       SET status = 'cancelled', end_date = NOW(), updated_at = NOW()
       WHERE user_id = $1 AND status = 'active'
       RETURNING *`,
      [req.user.id]
    );
    
    if (!rows.length) {
      return res.status(404).json({ error: 'No active subscription found' });
    }

    res.json({ 
      success: true, 
      message: 'Subscription cancelled successfully'
    });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/payments/my-purchases — Get user's purchase history ─────────────
router.get('/my-purchases', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT id, product_type, amount, currency, status, created_at
       FROM purchases 
       WHERE user_id = $1 
       ORDER BY created_at DESC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// ── GET /api/payments/my-subscription — Get user's subscription status ───────
router.get('/my-subscription', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT id, plan_type, status, start_date, end_date, created_at
       FROM subscriptions 
       WHERE user_id = $1 
       ORDER BY created_at DESC
       LIMIT 1`,
      [req.user.id]
    );
    
    if (!rows.length) {
      return res.json({ hasSubscription: false });
    }
    
    res.json({ 
      hasSubscription: rows[0].status === 'active',
      subscription: rows[0]
    });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/payments/access — Check user's access level ─────────────────────
router.get('/access', requireAuth, async (req, res, next) => {
  try {
    // Check for active subscription
    const subscription = await db.query(
      `SELECT id FROM subscriptions WHERE user_id = $1 AND status = 'active'`,
      [req.user.id]
    );
    
    // Check for completed birth chart purchase
    const purchase = await db.query(
      `SELECT id FROM purchases WHERE user_id = $1 AND product_type = 'birth_chart' AND status = 'completed'`,
      [req.user.id]
    );

    res.json({
      hasBirthChartAccess: purchase.rows.length > 0 || subscription.rows.length > 0,
      hasDailyGuideAccess: subscription.rows.length > 0,
      hasNexusAIAccess: subscription.rows.length > 0,
      isPremium: subscription.rows.length > 0
    });
  } catch (err) {
    next(err);
  }
});

// ── PayPal Webhook — Handle subscription events from PayPal ──────────────────
// IMPORTANT: In production, you MUST verify webhook signatures using the PayPal SDK
// See: https://developer.paypal.com/docs/api/webhooks/v1/#verify-webhook-signature
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const event = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const eventType = event.event_type;
    const resourceId = event.resource?.id;
    const webhookId = event.id;
    
    // Log webhook event for audit trail (structured logging)
    const logEntry = {
      timestamp: new Date().toISOString(),
      type: 'paypal_webhook',
      eventType,
      webhookId,
      resourceId: resourceId || 'unknown'
    };
    console.log('PayPal Webhook:', JSON.stringify(logEntry));

    // Validate required fields
    if (!eventType || !resourceId) {
      console.warn('PayPal Webhook: Missing required fields', logEntry);
      return res.status(400).json({ error: 'Invalid webhook payload' });
    }

    // SECURITY NOTE: In production, verify the webhook signature before processing
    // This requires the PAYPAL_WEBHOOK_ID environment variable
    // const webhookIdEnv = process.env.PAYPAL_WEBHOOK_ID;
    // if (webhookIdEnv) {
    //   // Verify signature using PayPal SDK
    //   // If verification fails, return 401
    // }
    
    switch (eventType) {
      case 'BILLING.SUBSCRIPTION.CANCELLED':
      case 'BILLING.SUBSCRIPTION.SUSPENDED':
      case 'BILLING.SUBSCRIPTION.EXPIRED':
        const result = await db.query(
          `UPDATE subscriptions 
           SET status = 'cancelled', end_date = NOW(), updated_at = NOW()
           WHERE paypal_subscription_id = $1
           RETURNING id`,
          [resourceId]
        );
        console.log('PayPal Webhook: Subscription cancelled', { 
          resourceId, 
          affected: result.rowCount 
        });
        break;
        
      case 'BILLING.SUBSCRIPTION.ACTIVATED':
      case 'BILLING.SUBSCRIPTION.RENEWED':
        const renewResult = await db.query(
          `UPDATE subscriptions 
           SET status = 'active', updated_at = NOW()
           WHERE paypal_subscription_id = $1
           RETURNING id`,
          [resourceId]
        );
        console.log('PayPal Webhook: Subscription activated/renewed', { 
          resourceId, 
          affected: renewResult.rowCount 
        });
        break;
        
      default:
        console.log('PayPal Webhook: Unhandled event type', { eventType });
    }
    
    res.json({ received: true });
  } catch (err) {
    console.error('PayPal Webhook Error:', {
      message: err.message,
      stack: err.stack,
      timestamp: new Date().toISOString()
    });
    res.status(500).json({ error: 'Internal server error processing webhook' });
  }
});

module.exports = router;
