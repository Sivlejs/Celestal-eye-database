/**
 * Birth Chart Purchase Page — PayPal Integration
 * 
 * Handles one-time payment for birth chart purchase.
 */
(async function () {
  'use strict';

  // ── Elements ─────────────────────────────────────────────────────────────────
  const purchaseBtn = document.getElementById('purchase-btn');
  const paypalContainer = document.getElementById('paypal-container');
  const closePaypalBtn = document.getElementById('close-paypal');
  const paypalButtonContainer = document.getElementById('paypal-button-container');
  const successMessage = document.getElementById('success-message');
  const authMessage = document.getElementById('auth-message');

  // ── Footer timestamp ─────────────────────────────────────────────────────────
  document.getElementById('footer-time').textContent =
    new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });

  // ── Auth State ───────────────────────────────────────────────────────────────
  let authToken = localStorage.getItem('celestal_token');
  let currentUser = null;

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

  function loadPayPalScript() {
    return new Promise((resolve, reject) => {
      if (paypalScriptLoaded) {
        resolve();
        return;
      }
      
      const script = document.createElement('script');
      script.src = `https://www.paypal.com/sdk/js?client-id=${paypalClientId}&currency=USD&intent=capture`;
      script.onload = () => {
        paypalScriptLoaded = true;
        resolve();
      };
      script.onerror = () => reject(new Error('Failed to load PayPal SDK'));
      document.head.appendChild(script);
    });
  }

  // ── Payment Flow ─────────────────────────────────────────────────────────────
  async function initPayment() {
    paypalButtonContainer.innerHTML = '<p style="text-align: center; color: var(--muted);">Loading PayPal...</p>';
    
    await loadPayPalScript();

    paypalButtonContainer.innerHTML = '';

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
            custom_id: String(orderData.purchase_id)
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
        
        // Show success
        hidePayPal();
        showSuccess();
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

  // ── UI Helpers ───────────────────────────────────────────────────────────────
  function showPayPal() {
    paypalContainer.classList.remove('hidden');
    initPayment();
  }

  function hidePayPal() {
    paypalContainer.classList.add('hidden');
    paypalButtonContainer.innerHTML = '';
  }

  function showSuccess() {
    successMessage.classList.remove('hidden');
  }

  function showAuthRequired() {
    authMessage.classList.remove('hidden');
  }

  // ── Event Handlers ───────────────────────────────────────────────────────────
  purchaseBtn.addEventListener('click', async () => {
    const isAuth = await checkAuth();
    if (!isAuth) {
      showAuthRequired();
      return;
    }
    showPayPal();
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
      purchaseBtn.disabled = true;
      purchaseBtn.textContent = 'PayPal Not Available';
      console.error('PayPal is not configured. Please set PAYPAL_CLIENT_ID in environment.');
    }
    
    await checkAuth();
  }

  init();
})();
