// Flipkart Payment Page Script - Show gift card discount and final payment amount

// Check if we're on a payment page - only run on payment/checkout pages
function isPaymentPage() {
  const pathname = window.location.pathname;
  const validPaymentPaths = [
    '/payments',
  ];

  // Explicitly exclude non-payment pages
  const excludedPaths = [
    '/address',
    '/delivery',
    '/profile',
    '/account',
    '/cart',
    '/wishlist',
    '/shipping',
    '/product'
  ];

  // Check for excluded paths first (must be strict match)
  const isExcluded = excludedPaths.some(path => {
    return pathname.includes(path) || pathname.endsWith(path);
  });

  if (isExcluded) {
    console.log('🚫 Excluded path detected:', pathname);
    return false;
  }

  // Check for payment-related paths
  const isPaymentPath = validPaymentPaths.some(path => pathname.includes(path));

  // Also check for payment-related query parameters
  const searchParams = new URLSearchParams(window.location.search);
  const isPaymentQuery = searchParams.has('payment') || searchParams.has('checkout') || searchParams.has('payments');

  return isPaymentPath || isPaymentQuery;
}

// Add URL change detection for SPA navigation (outside payment check)
function onPaymentUrlChange(callback) {
  let lastUrl = location.href;
  const observer = new MutationObserver(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      callback();
    }
  });
  if (document.body) {
    observer.observe(document.body, { subtree: true, childList: true });
  } else {
    window.addEventListener('DOMContentLoaded', () => {
      observer.observe(document.body, { subtree: true, childList: true });
    });
  }
}

// Initialize payment script
function initializePaymentScript() {
  console.log('🔍 Flipkart Payment Script: Checking if we are on a payment page...');
  console.log('Current URL:', window.location.href);
  console.log('Pathname:', window.location.pathname);

  if (!isPaymentPage()) {
    console.log('❌ Not a payment page, skipping Flipkart payment script');
    return;
  }

  console.log('✅ Payment page detected! Running Flipkart payment script...');

  // Wait for page to load completely before initializing payment script
  console.log('📋 Document readyState:', document.readyState);
  if (document.readyState === 'loading') {
    console.log('⏳ Document still loading, waiting for DOMContentLoaded...');
    document.addEventListener('DOMContentLoaded', () => {
      console.log('✅ DOMContentLoaded fired, starting 2-second delay...');
      setTimeout(() => {
        console.log('⏰ 2-second delay complete, calling initPaymentScript()');
        initPaymentScript();
      }, 2000); // Wait for dynamic content to load
    });
  } else {
    console.log('✅ Document already loaded, starting 2-second delay...');
    setTimeout(() => {
      console.log('⏰ 2-second delay complete, calling initPaymentScript()');
      initPaymentScript();
    }, 2000);
  }
}

// Payment Gift card cache with 5-minute expiry using localStorage
const PAYMENT_GC_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const PAYMENT_GC_CACHE_PREFIX = 'zepp_payment_gc_';

function getPaymentCachedGiftCard(domain) {
  try {
    const cacheKey = PAYMENT_GC_CACHE_PREFIX + domain;
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      const parsedCache = JSON.parse(cached);
      if (parsedCache && (Date.now() - parsedCache.timestamp) < PAYMENT_GC_CACHE_DURATION) {
        console.log('✅ Using cached gift card data from localStorage for:', domain);
        return parsedCache.data;
      } else {
        // Remove expired cache
        localStorage.removeItem(cacheKey);
        console.log('🗑️ Removed expired cache for:', domain);
      }
    }
  } catch (error) {
    console.error('Error reading from cache:', error);
  }
  return null;
}

function setPaymentCachedGiftCard(domain, data) {
  try {
    const cacheKey = PAYMENT_GC_CACHE_PREFIX + domain;
    const cacheData = {
      data,
      timestamp: Date.now()
    };
    localStorage.setItem(cacheKey, JSON.stringify(cacheData));
    console.log('💾 Cached gift card data to localStorage for:', domain);
  } catch (error) {
    console.error('Error saving to cache:', error);
  }
}

function normalizePaymentDomain(hostname) {
  return hostname.replace(/^www\./, '').toLowerCase();
}

function formatPaymentCurrency(amount) {
  if (typeof amount !== 'number' || isNaN(amount)) {
    return 'N/A';
  }
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(amount);
}

// Function to extract payment price from Flipkart payment page
function extractPaymentPrice() {
  console.log('🔍 Starting Flipkart payment price extraction...');

  // Look for the nested structure: [data-testid="price-summary"] > [data-testid="final-price"] > [data-testid="price"]
  const priceSummaryDiv = document.querySelector('[data-testid="price-summary"]');
  console.log("price-summary div found:", priceSummaryDiv ? "Yes" : "No");
  
  const finalPriceDiv = document.querySelector('[data-testid="final-price"]');
  console.log("final-price div found:", finalPriceDiv ? "Yes" : "No");
  
  let priceElement = null;

  // Try the complete path first
  if (priceSummaryDiv) {
    priceElement = priceSummaryDiv.querySelector('[data-testid="final-price"] [data-testid="price"]');
    if (priceElement) {
      console.log('🎯 Found price using complete path: price-summary > final-price > price');
    }
  }

  // Fallback: try final-price > price directly
  if (!priceElement && finalPriceDiv) {
    priceElement = finalPriceDiv.querySelector('[data-testid="price"]');
    if (priceElement) {
      console.log('🎯 Found price using direct path: final-price > price');
    }
  }

  // Another fallback: try direct price element search
  if (!priceElement) {
    priceElement = document.querySelector('[data-testid="price"]');
    if (priceElement) {
      console.log('🎯 Found price using direct selector: [data-testid="price"]');
    }
  }

  if (priceElement) {
    console.log('✅ Price element found, content:', priceElement.textContent);
  } else {
    console.log('❌ No price element found, debugging structure...');
    if (finalPriceDiv) {
      console.log("final-price div content:", finalPriceDiv.innerHTML);
      console.log("Elements inside final-price div:");
      finalPriceDiv.querySelectorAll('*').forEach((el, index) => {
        console.log(`  [${index}]: ${el.tagName} data-testid="${el.getAttribute('data-testid')}" text="${el.textContent}"`);
      });
    }
  }

  // Fallback selectors for common Flipkart payment page price elements
  if (!priceElement) {
    const fallbackSelectors = [
      '[data-testid="price"]',                                    // Direct price element
      '[data-testid="final-price"] [data-testid="price"]',       // Nested in final-price
      '[data-testid="price-summary"] [data-testid="price"]',     // Nested in price-summary
      '[data-testid="price-summary"] [data-testid="final-price"] [data-testid="price"]', // Complete path
      'span#price',                                              // Legacy ID selector
      '[data-testid="final-price"] span',                        // Any span in final-price
      '.final-price span',                                       // Legacy class selector
      '[data-testid="total-amount"]',
      '[data-testid="final-amount"]',
      '.total-amount span',
      '.payment-amount span',
      '.amount-to-pay span',
      '.order-total span'
    ];

    for (const selector of fallbackSelectors) {
      priceElement = document.querySelector(selector);
      if (priceElement) {
        console.log(`🎯 Found price element using fallback selector: ${selector}`);
        break;
      }
    }
  }

  if (priceElement) {
    const priceText = priceElement.textContent || priceElement.innerText;
    console.log('🏷️ Final selected element text:', priceText);

    // Handle different price formats:
    // 1. "₹8,700" format
    // 2. "₹ 8700" format  
    // 3. "8700" format (without rupee symbol)
    let priceMatch = priceText.match(/₹\s*([0-9,]+)/);

    if (!priceMatch) {
      // Try alternative patterns
      priceMatch = priceText.match(/([0-9,]+)\s*₹/) ||
        priceText.match(/([0-9,]+)/);
    }

    if (priceMatch) {
      const priceString = priceMatch[1].replace(/,/g, ''); // Remove commas
      const price = parseInt(priceString, 10);

      if (price && price > 0) {
        console.log('💰 EXTRACTED PRICE:', price);
        console.log('💰 FORMATTED PRICE:', formatPaymentCurrency(price));
        return price;
      } else {
        console.log('❌ Invalid price extracted:', price);
      }
    } else {
      console.log('❌ No price match found in final element text:', priceText);
    }
  } else {
    console.log('❌ No payment price element found on this page');
    console.log('🔍 Available elements with "price" in class or id:');
    document.querySelectorAll('[class*="price"], [id*="price"]').forEach(el => {
      console.log(`  - ${el.tagName}.${el.className}#${el.id}: "${el.textContent?.substring(0, 50)}"`);
    });
  }

  console.log('❌ Could not extract payment price from this page');
  return null;
}

function createPaymentDiscountPopup(originalPrice, discountPercentage, finalPrice, cardData) {
  console.log(`🎉 Creating payment discount popup: Original ₹${originalPrice}, Discount ${discountPercentage}%, Final ₹${finalPrice}`);

  // Remove existing popup if any
  const existingPopup = document.getElementById('zeppPaymentPopup');
  if (existingPopup) {
    existingPopup.remove();
  }

  const popupHTML = `
    <div id="zeppPaymentPopup" style="
      position: fixed;
      bottom: 5%;
      right: 80px;
      width: 320px;
      background: white;
      border-radius: 16px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.12);
      border: 1px solid #e0e0e0;
      z-index: 10000;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      animation: slideInRight 0.3s ease-out;
    ">
      
      <!-- Header Section with White Background -->
    <div style="background: #ffffff; color: black; padding: 16px 20px; border-radius: 12px 12px 0 0;">
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <div style="font-weight: 600; font-size: 16px;">
          Zepp Saver
        </div>
        <div style="display: flex; align-items: center; filter: invert(1);">
          <img id="infoicon" style="height: 20px; margin-left: 10px; cursor: pointer;" />
          <img id="settingsicon" style="height: 20px; margin-left: 10px; cursor: pointer;" />
          <button id="closeAutoPopup" style="background: none; border: none; font-size: 18px; cursor: pointer; color: #ffffff; margin-left: 10px;">✕</button>
        </div>
      </div>
    </div>

      <!-- Payment Calculation -->
      <div style = 10px 0;">
       

        <!-- Gift Card Section -->
        <div style="
          background: white;
          border-radius: 12px;
        ">
          <div style="text-align: center;">
            
             <div style="text-align: center; margin-bottom: 20px;">
          <div style="
            font-size: 20px; 
            font-weight: 700; 
            color: #4755a5ff;
            padding: 16px;
            border-radius: 8px;
            line-height: 1.4;
          ">
            <div style="margin-bottom: 8px;">
              Pay <span style="text-decoration: line-through; color: #999; font-weight: 500;">${formatPaymentCurrency(originalPrice)}</span>
            </div>
            <div style="font-size: 28px; margin-bottom: 8px;">
              ${formatPaymentCurrency(finalPrice)}
            </div>
            <div style="font-size: 16px; color: #737373; font-weight: 600;">
              with ${discountPercentage}% Flipkart Gift Card
            </div>
          </div>
          
          <div style="
            font-size: 18px; 
            color: #4755A5; 
            margin-top: 8px; 
            font-weight: 700;
            background: rgba(71, 85, 165, 0.1);
            height: 45px;
            display: flex;
            justify-content: center;
            align-items: center;
          ">
            You Save ${formatPaymentCurrency(originalPrice - finalPrice)}
          </div>
        </div>
            
            <a href="${cardData.link || '#'}" target="_blank" style="
              display: inline-block;
              background: #4755A5;
              color: white;
              text-decoration: none;
              padding: 12px 24px;
              border-radius: 100px;
              font-size: 14px;
              font-weight: 600;
              transition: all 0.3s ease;
              box-shadow: 0 2px 8px rgba(104, 122, 228, 0.3);
            " onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 16px rgba(104, 122, 228, 0.4)'" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 2px 8px rgba(104, 122, 228, 0.3)'">
              ${cardData.cta || 'Get your Gift Card'}
            </a>
            
            <!-- Gift Card Disclaimer -->
            <div style="
              margin: 0 16px;
              margin-top: 16px;
              padding: 8px 12px;
              border-radius: 6px;
              font-size: 12px;
              color: #29305B;
              text-align: center;
            ">
              💡 Apply this in the Gift Card Section during checkout.
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  // Add animation styles
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideInRight {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }
  `;
  document.head.appendChild(style);

  // Insert popup into DOM
  document.body.insertAdjacentHTML('beforeend', popupHTML);

  // Create floating trigger icon
  const triggerIcon = document.createElement('div');
  triggerIcon.id = 'zeppPaymentTriggerIcon';
  triggerIcon.style.cssText = `
    position: fixed;
    bottom: 5%;
    right: 20px;
    width: 50px;
    height: 50px;
    border-radius: 50%;
    background: #4755A5;
    border: 1px solid rgba(255, 255, 255, 0.5);
    box-shadow: 0 2px 6px rgba(0,0,0,0.2);
    display: flex;
    justify-content: center;
    align-items: center;
    cursor: pointer;
    z-index: 9998;
    opacity: 0.7;
  `;
  triggerIcon.innerHTML = `<img src="${chrome.runtime.getURL('icon.png')}" style="width: 24px; height: 24px;" alt="ZEPP" />`;

  document.body.appendChild(triggerIcon);

  // Load icons
  document.getElementById('settingsicon').src = chrome.runtime.getURL('settings.svg');
  document.getElementById('infoicon').src = chrome.runtime.getURL('info.svg');

  // Add event listeners
  document.getElementById('settingsicon').addEventListener('click', () => {
    openPaymentSettingsModal();
  });

  document.getElementById('infoicon').addEventListener('click', () => {
    openPaymentInfoModal();
  });

  document.getElementById('closeAutoPopup').addEventListener('click', () => {
    document.getElementById('zeppPaymentPopup').style.display = 'none';
    triggerIcon.style.opacity = '1';
  });

  triggerIcon.addEventListener('click', () => {
    const popup = document.getElementById('zeppPaymentPopup');
    if (popup.style.display === 'none') {
      popup.style.display = 'block';
      triggerIcon.style.opacity = '0.7';
    } else {
      popup.style.display = 'none';
      triggerIcon.style.opacity = '1';
    }
  });

  console.log('🎉 Flipkart payment discount popup created successfully with nykaa-style layout');
}

async function initPaymentScript() {
  const domain = normalizePaymentDomain(window.location.hostname);
  console.log('🛒 Starting Flipkart payment script for domain:', domain);

  const originalPrice = extractPaymentPrice();

  if (!originalPrice) {
    console.log('❌ Could not extract payment price, cannot show discount popup');
    return;
  }

  let cardData = null;

  // Check cache first
  cardData = getPaymentCachedGiftCard(domain);

  if (!cardData) {
    // Try API first, then fallback to mock data
    try {
      const response = await fetch(`http://localhost:3000/giftcard?domain=${encodeURIComponent(domain)}`);
      if (response.ok) {
        cardData = await response.json();
        if (cardData && !cardData.error) {
          console.log('Gift card data loaded from API');
          setPaymentCachedGiftCard(domain, cardData);
        } else {
          cardData = null;
        }
      } else {
        console.log(`No gift card data available for ${domain} (Status: ${response.status})`);
        cardData = null;
      }
    } catch (error) {
      console.error('Error fetching gift card data:', error);
      cardData = null;
    }

    // Fallback to mock data if API fails
    if (!cardData) {
      console.log('🎁 Using fallback gift card data...');
      cardData = {
        title: "Flipkart Gift Cards",
        desc: "Get instant discounts on your purchases",
        discount: 10,
        cta: "Buy Gift Card & Save",
        link: "https://www.flipkart.com/gift-cards"
      };
    }
  } else {
    console.log('⚡ Using cached gift card data for faster loading');
  }

  // Create popup with available data
  const discountPercentage = cardData.discount || 10;
  const discountAmount = Math.floor(originalPrice * (discountPercentage / 100));
  const finalPrice = originalPrice - discountAmount;

  console.log(`💰 Price calculation: Original ₹${originalPrice}, Discount ${discountPercentage}% (₹${discountAmount}), Final ₹${finalPrice}`);

  createPaymentDiscountPopup(originalPrice, discountPercentage, finalPrice, cardData);
}

// Authentication and Settings Functions for Payment Page (matching nykaa_payment.js)
async function checkPaymentAuthStatus() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['authData'], (result) => {
      const authData = result.authData;
      resolve(authData && authData.isAuthenticated ? authData : null);
    });
  });
}

function openPaymentSettingsModal() {
  // Remove any existing settings modal
  const existingModal = document.getElementById('flipkart-payment-settings-modal');
  if (existingModal) {
    existingModal.remove();
  }

  const modal = document.createElement('div');
  modal.id = 'flipkart-payment-settings-modal';
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    z-index: 999999;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  `;

  modal.innerHTML = `
    <div style="
      background: white;
      border-radius: 16px;
      padding: 32px;
      width: 400px;
      max-width: 90vw;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
    ">
      <div style="text-align: center; margin-bottom: 24px;">
        <h2 style="color: #242424; margin: 0 0 8px 0; font-size: 24px;">Settings</h2>
        <p style="color: #666; margin: 0; font-size: 14px;">Manage your ZEPP account</p>
      </div>
      
      <div id="flipkartPaymentSettingsContent">
        <div style="margin-bottom: 24px;">
          <label style="display: block; margin-bottom: 8px; color: #333; font-weight: 500;">Logged in as:</label>
          <div id="flipkartPaymentUserEmailDisplay" style="
            padding: 12px;
            background: #f8f9fa;
            border-radius: 8px;
            font-size: 16px;
            color: #28a745;
            font-weight: 600;
          ">
            Loading...
          </div>
        </div>
        
        <button 
          id="flipkartPaymentLogoutBtn"
          style="
            width: 100%;
            padding: 12px;
            background: #dc3545;
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            margin-bottom: 16px;
          "
        >
          Logout
        </button>
      </div>
      
      <div style="text-align: center;">
        <button 
          id="closeFlipkartPaymentSettingsModal"
          style="
            background: none;
            border: none;
            color: #999;
            cursor: pointer;
            font-size: 14px;
            text-decoration: underline;
          "
        >
          Close
        </button>
      </div>
      
      <div id="flipkartPaymentSettingsMessage" style="
        margin-top: 16px;
        padding: 12px;
        border-radius: 8px;
        font-size: 14px;
        text-align: center;
        display: none;
      "></div>
    </div>
  `;

  document.body.appendChild(modal);

  // Load user data
  loadPaymentUserSettings();

  // Event listeners
  document.getElementById('closeFlipkartPaymentSettingsModal').addEventListener('click', () => {
    modal.remove();
  });

  document.getElementById('flipkartPaymentLogoutBtn').addEventListener('click', handlePaymentSettingsLogout);

  // Close modal when clicking outside
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.remove();
    }
  });
}

async function loadPaymentUserSettings() {
  const authData = await checkPaymentAuthStatus();
  const userEmailDisplay = document.getElementById('flipkartPaymentUserEmailDisplay');

  if (authData && authData.isAuthenticated) {
    userEmailDisplay.textContent = authData.email;
    userEmailDisplay.style.color = '#28a745';
  } else {
    userEmailDisplay.textContent = 'Not logged in';
    userEmailDisplay.style.color = '#dc3545';
    document.getElementById('flipkartPaymentLogoutBtn').disabled = true;
    document.getElementById('flipkartPaymentLogoutBtn').style.background = '#6c757d';
    document.getElementById('flipkartPaymentLogoutBtn').textContent = 'Already logged out';
  }
}

async function handlePaymentSettingsLogout() {
  const logoutBtn = document.getElementById('flipkartPaymentLogoutBtn');
  const settingsMessage = document.getElementById('flipkartPaymentSettingsMessage');

  logoutBtn.disabled = true;
  logoutBtn.textContent = 'Logging out...';

  try {
    await chrome.storage.local.set({
      authData: {
        isAuthenticated: false,
        email: null,
        timestamp: null
      }
    });

    showPaymentSettingsMessage('Successfully logged out!', 'success');

    setTimeout(() => {
      document.getElementById('flipkart-payment-settings-modal').remove();
      // Refresh the page to update UI
      location.reload();
    }, 1500);

  } catch (error) {
    showPaymentSettingsMessage('Error logging out. Please try again.', 'error');
    logoutBtn.disabled = false;
    logoutBtn.textContent = 'Logout';
  }
}

function showPaymentSettingsMessage(message, type) {
  const messageDiv = document.getElementById('flipkartPaymentSettingsMessage');
  messageDiv.textContent = message;
  messageDiv.style.display = 'block';
  messageDiv.style.backgroundColor = type === 'error' ? '#fee' : '#efe';
  messageDiv.style.color = type === 'error' ? '#c33' : '#363';
  messageDiv.style.border = `1px solid ${type === 'error' ? '#fcc' : '#cfc'}`;
}

// Info Modal Functions for Payment Page
function openPaymentInfoModal() {
  // Remove any existing info modal
  const existingModal = document.getElementById('flipkart-payment-info-modal');
  if (existingModal) {
    existingModal.remove();
  }

  const modal = document.createElement('div');
  modal.id = 'flipkart-payment-info-modal';
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    z-index: 999999;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  `;

  modal.innerHTML = `
    <div style="
      background: white;
      border-radius: 16px;
      padding: 32px;
      width: 500px;
      max-width: 90vw;
      max-height: 80vh;
      overflow-y: auto;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
    ">
      <div style="text-align: center; margin-bottom: 24px;">
        <h2 style="color: #242424; margin: 0 0 8px 0; font-size: 24px;">Payment Page Savings</h2>
        <p style="color: #666; margin: 0; font-size: 14px;">Maximize your savings during checkout</p>
      </div>
      
      <div style="margin-bottom: 24px;">
        <h3 style="color: #242424; font-size: 18px; margin: 0 0 12px 0;">🛒 Smart Payment Optimization</h3>
        <p style="color: #555; margin: 0 0 16px 0; line-height: 1.5;">During your Flipkart checkout, ZEPP automatically calculates potential savings through gift card purchases, helping you pay less for the same items.</p>
      </div>

      <div style="margin-bottom: 24px;">
        <h3 style="color: #242424; font-size: 18px; margin: 0 0 12px 0;">💡 How It Works</h3>
        <div style="background: #f8f9ff; padding: 16px; border-radius: 8px; border-left: 4px solid #687AE4;">
          <ol style="margin: 0; padding-left: 20px; color: #555; line-height: 1.6;">
            <li><strong>Payment Detection:</strong> ZEPP detects when you're on a Flipkart payment page</li>
            <li><strong>Price Analysis:</strong> Analyzes your total payment amount</li>
            <li><strong>Savings Calculation:</strong> Shows potential savings through gift card discounts</li>
            <li><strong>One-Click Purchase:</strong> Direct link to purchase gift cards with optimal discount</li>
          </ol>
        </div>
      </div>

      <div style="margin-bottom: 24px;">
        <h3 style="color: #242424; font-size: 18px; margin: 0 0 12px 0;">🎯 Key Benefits</h3>
        <div style="background: #fff8e1; padding: 16px; border-radius: 8px; border-left: 4px solid #ffa726;">
          <ul style="margin: 0; padding-left: 20px; color: #555; line-height: 1.6;">
            <li><strong>Instant Savings:</strong> See immediate discount calculations</li>
            <li><strong>Real-time Pricing:</strong> Live gift card discount rates</li>
            <li><strong>Payment Integration:</strong> Works during actual checkout process</li>
            <li><strong>Multiple Options:</strong> Choose from various gift card denominations</li>
          </ul>
        </div>
      </div>

      <div style="margin-bottom: 24px;">
        <h3 style="color: #242424; font-size: 18px; margin: 0 0 12px 0;">🔒 Security & Privacy</h3>
        <p style="color: #555; margin: 0; line-height: 1.5;">ZEPP only reads publicly visible price information during checkout. No payment details, personal information, or transaction data is accessed or stored.</p>
      </div>
      
      <div style="text-align: center; margin-top: 24px;">
        <button 
          id="closeFlipkartPaymentInfoModal"
          style="
            background: #687AE4;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: background 0.3s ease;
          "
          onmouseover="this.style.background='#5a6fd8'"
          onmouseout="this.style.background='#687AE4'"
        >
          Got it!
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // Event listeners
  document.getElementById('closeFlipkartPaymentInfoModal').addEventListener('click', () => {
    modal.remove();
  });

  // Close modal when clicking outside
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.remove();
    }
  });
}

// Initialize the script
console.log('🚀 Flipkart Payment Script loaded');

// Run immediately and also observe URL changes
initializePaymentScript();
onPaymentUrlChange(initializePaymentScript);