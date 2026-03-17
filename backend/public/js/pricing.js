/**
 * Pricing Page — PayPal Integration
 * 
 * Handles both one-time payments (birth chart) and subscriptions (premium plan)
 * using PayPal JavaScript SDK.
 */
(async function () {
  'use strict';

  // ── Elements ─────────────────────────────────────────────────────────────────
  const buyChartBtn = document.getElementById('buy-chart-btn');
  const subscribeBtn = document.getElementById('subscribe-btn');
  const paypalContainer = document.getElementById('paypal-container');
  const closePaypalBtn = document.getElementById('close-paypal');
  const paypalTitle = document.getElementById('paypal-title');
  const paypalDescription = document.getElementById('paypal-description');
  const paypalButtonContainer = document.getElementById('paypal-button-container');
  const successMessage = document.getElementById('success-message');
  const successTitle = document.getElementById('success-title');
  const successText = document.getElementById('success-text');
  const authMessage = document.getElementById('auth-message');

  // ── Footer timestamp ─────────────────────────────────────────────────────────
  document.getElementById('footer-time').textContent =
    new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });

  // ── Auth State ───────────────────────────────────────────────────────────────
  let authToken = localStorage.getItem('celestal_token');
  let currentUser = null;

  // Check if user is authenticated
  async function checkAuth() {
    if (!authToken) return false;
    try {
      const res = await fetch('/api/auth/me', {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      if (res.ok) {
        currentUser = await res.json();
        return true;
      }
    } catch (e) {
      console.error('Auth check failed:', e);
    }
    localStorage.removeItem('celestal_token');
    authToken = null;
    return false;
  }

  // ── PayPal Configuration ─────────────────────────────────────────────────────
  let paypalClientId = null;
  let paypalScriptLoaded = false;

  async function loadPayPalConfig() {
    try {
      const res = await fetch('/api/payments/config');
      if (!res.ok) throw new Error('PayPal not configured');
      const config = await res.json();
      paypalClientId = config.clientId;
      return true;
    } catch (e) {
      console.error('Failed to load PayPal config:', e);
      return false;
    }
  }

  function loadPayPalScript(purpose = 'checkout') {
    return new Promise((resolve, reject) => {
      if (paypalScriptLoaded) {
        resolve();
        return;
      }
      
      const script = document.createElement('script');
      // Include subscription components for subscription flow
      const intent = purpose === 'subscription' ? 'subscription' : 'capture';
      script.src = `https://www.paypal.com/sdk/js?client-id=${paypalClientId}&currency=USD&intent=${intent}&vault=true`;
      script.onload = () => {
        paypalScriptLoaded = true;
        resolve();
      };
      script.onerror = () => reject(new Error('Failed to load PayPal SDK'));
      document.head.appendChild(script);
    });
  }

  // ── One-Time Payment Flow (Birth Chart) ──────────────────────────────────────
  async function initBirthChartPayment() {
    paypalButtonContainer.innerHTML = '';
    
    // Load PayPal SDK for one-time payment
    await loadPayPalScript('checkout');

    paypal.Buttons({
      style: {
        layout: 'vertical',
        color: 'gold',
        shape: 'rect',
        label: 'paypal'
      },
      
      createOrder: async function(data, actions) {
        // Create order on our server
        const res = await fetch('/api/payments/create-order', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
          },
          body: JSON.stringify({ product_type: 'birth_chart' })
        });
        
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || 'Failed to create order');
        }
        
        const orderData = await res.json();
        
        // Create PayPal order
        return actions.order.create({
          purchase_units: [{
            description: orderData.product.description,
            amount: {
              currency_code: orderData.currency,
              value: orderData.amount
            },
            custom_id: String(orderData.purchase_id) // Store our purchase ID
          }]
        });
      },
      
      onApprove: async function(data, actions) {
        // Capture the order
        const details = await actions.order.capture();
        
        // Get our purchase ID from custom_id
        const purchaseId = details.purchase_units[0].custom_id;
        
        // Confirm on our server
        const res = await fetch('/api/payments/capture-order', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
          },
          body: JSON.stringify({
            purchase_id: purchaseId,
            paypal_order_id: data.orderID
          })
        });
        
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || 'Failed to capture payment');
        }
        
        const result = await res.json();
        
        // Show success
        hidePayPal();
        showSuccess('Birth Chart Purchased!', result.message);
      },
      
      onError: function(err) {
        console.error('PayPal error:', err);
        alert('Payment failed. Please try again.');
      },
      
      onCancel: function() {
        console.log('Payment cancelled');
      }
    }).render('#paypal-button-container');
  }

  // ── Subscription Flow (Premium) ──────────────────────────────────────────────
  async function initSubscriptionPayment() {
    paypalButtonContainer.innerHTML = '';
    
    // For subscriptions, you need to set up a PayPal Plan first in the PayPal dashboard
    // The Plan ID should be stored in environment variables
    
    // First create subscription record on our server
    const res = await fetch('/api/payments/create-subscription', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    if (!res.ok) {
      const err = await res.json();
      alert(err.error || 'Failed to start subscription');
      hidePayPal();
      return;
    }
    
    const subscriptionData = await res.json();
    
    // Reload script for subscription mode
    paypalScriptLoaded = false;
    await loadPayPalScript('subscription');

    // Check if PAYPAL_PLAN_ID is configured
    // For demo purposes, show instructions if not configured
    const planId = await getPayPalPlanId();
    
    if (!planId) {
      paypalButtonContainer.innerHTML = `
        <div style="text-align: center; padding: 1rem; color: var(--muted);">
          <p>⚠️ PayPal subscription plan not configured yet.</p>
          <p style="font-size: 0.85rem; margin-top: 0.5rem;">
            To enable subscriptions, create a subscription plan in 
            <a href="https://www.paypal.com/billing/plans" target="_blank" style="color: var(--accent2);">PayPal Dashboard</a>
            and add the Plan ID to your environment variables as <code>PAYPAL_PLAN_ID</code>.
          </p>
        </div>
      `;
      return;
    }

    paypal.Buttons({
      style: {
        layout: 'vertical',
        color: 'gold',
        shape: 'rect',
        label: 'subscribe'
      },
      
      createSubscription: function(data, actions) {
        return actions.subscription.create({
          plan_id: planId,
          custom_id: String(subscriptionData.subscription_id)
        });
      },
      
      onApprove: async function(data) {
        // Activate subscription on our server
        const res = await fetch('/api/payments/activate-subscription', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
          },
          body: JSON.stringify({
            subscription_id: subscriptionData.subscription_id,
            paypal_subscription_id: data.subscriptionID
          })
        });
        
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || 'Failed to activate subscription');
        }
        
        const result = await res.json();
        
        // Show success
        hidePayPal();
        showSuccess('Welcome to Premium!', result.message);
      },
      
      onError: function(err) {
        console.error('PayPal subscription error:', err);
        alert('Subscription failed. Please try again.');
      },
      
      onCancel: function() {
        console.log('Subscription cancelled');
      }
    }).render('#paypal-button-container');
  }

  // Helper to get Plan ID (would typically come from server config)
  async function getPayPalPlanId() {
    try {
      const res = await fetch('/api/payments/config');
      const config = await res.json();
      return config.planId || null;
    } catch (e) {
      return null;
    }
  }

  // ── UI Helpers ───────────────────────────────────────────────────────────────
  function showPayPal(title, description, paymentType) {
    paypalTitle.textContent = title;
    paypalDescription.textContent = description;
    paypalContainer.classList.remove('hidden');
    
    if (paymentType === 'birth_chart') {
      initBirthChartPayment();
    } else if (paymentType === 'subscription') {
      initSubscriptionPayment();
    }
  }

  function hidePayPal() {
    paypalContainer.classList.add('hidden');
    paypalButtonContainer.innerHTML = '';
  }

  function showSuccess(title, message) {
    successTitle.textContent = title;
    successText.textContent = message;
    successMessage.classList.remove('hidden');
  }

  function showAuthRequired() {
    authMessage.classList.remove('hidden');
  }

  // ── Event Handlers ───────────────────────────────────────────────────────────
  buyChartBtn.addEventListener('click', async () => {
    const isAuth = await checkAuth();
    if (!isAuth) {
      showAuthRequired();
      return;
    }
    showPayPal(
      'Purchase Birth Chart',
      'Complete your one-time payment of $19.99 to get your personalized birth chart.',
      'birth_chart'
    );
  });

  subscribeBtn.addEventListener('click', async () => {
    const isAuth = await checkAuth();
    if (!isAuth) {
      showAuthRequired();
      return;
    }
    showPayPal(
      'Start Premium Subscription',
      'Subscribe for $9.99/month to access daily guides and Nexus AI.',
      'subscription'
    );
  });

  closePaypalBtn.addEventListener('click', hidePayPal);

  // Close modal on background click
  paypalContainer.addEventListener('click', (e) => {
    if (e.target === paypalContainer) {
      hidePayPal();
    }
  });

  // ── Initialize ───────────────────────────────────────────────────────────────
  async function init() {
    const paypalReady = await loadPayPalConfig();
    if (!paypalReady) {
      buyChartBtn.disabled = true;
      subscribeBtn.disabled = true;
      console.error('PayPal is not configured. Please set PAYPAL_CLIENT_ID in environment.');
    }
    
    // Check if user is already authenticated
    await checkAuth();
  }

  init();
})();
