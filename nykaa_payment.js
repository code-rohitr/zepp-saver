// Nykaa Payment Page Script - Show gift card discount and final payment amount

// Check if we're on a payment page - only run on payment/checkout pages
function isPaymentPage() {
  const pathname = window.location.pathname;
  const validPaymentPaths = [
    '/checkout',
    '/payment',
    '/pay',
    '/cart/payment',
    '/order/payment',
    '/v2/payment'
  ];
  
  // Explicitly exclude non-payment pages
  const excludedPaths = [
    '/address',
    '/v2/address',
    '/profile',
    '/account',
    '/cart',
    '/wishlist',
    '/shipping',
    '/delivery'
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
  const isPaymentQuery = searchParams.has('payment') || searchParams.has('checkout');
  
  return isPaymentPath || isPaymentQuery;
}

// Add URL change detection for SPA navigation (outside payment check)
function onPaymentUrlChange(callback) {
  let lastUrl = location.href;
  const observer = new MutationObserver(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      console.log('🔄 URL changed to:', lastUrl);
      callback();
    }
  });
  observer.observe(document, { subtree: true, childList: true });

  // Also listen for browser navigation events
  ['pushState', 'replaceState'].forEach(method => {
    const originalMethod = history[method];
    history[method] = function(...args) {
      const result = originalMethod.apply(this, args);
      callback();
      return result;
    };
  });

  window.addEventListener('pushState', callback);
  window.addEventListener('replaceState', callback);
  window.addEventListener('popstate', callback);
}

// Function to initialize payment script
function initializePaymentScript() {
  if (!isPaymentPage()) {
    console.log('🚫 Not a payment page, skipping nykaa_payment.js');
    console.log('🔍 Current pathname:', window.location.pathname);
    
    // Remove any existing payment popups if they exist
    const existingPopup = document.getElementById('zeppPaymentPopup');
    if (existingPopup) {
      existingPopup.remove();
      console.log('🗑️ Removed existing payment popup from non-payment page');
    }
    
    const existingTrigger = document.querySelector('[zepp-trigger-icon="1"]');
    if (existingTrigger) {
      existingTrigger.remove();
      console.log('🗑️ Removed existing payment trigger from non-payment page');
    }
    
    return;
  }

  console.log('🛒 Nykaa Payment Script Loaded');
  console.log('🔍 Current URL:', window.location.href);
  console.log('🔍 Current pathname:', window.location.pathname);
  console.log('🔍 Document ready state:', document.readyState);

  // Initialize the payment script
  initPaymentScript();
  console.log('🎯 Nykaa Payment Script Initialized');
}

// Gift card cache with 5-minute expiry using localStorage (Payment specific)
const PAYMENT_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const PAYMENT_CACHE_PREFIX = 'zepp_gc_';

function getPaymentCachedGiftCard(domain) {
  try {
    const cacheKey = PAYMENT_CACHE_PREFIX + domain;
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      const parsedCache = JSON.parse(cached);
      if (parsedCache && (Date.now() - parsedCache.timestamp) < PAYMENT_CACHE_DURATION) {
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
    const cacheKey = PAYMENT_CACHE_PREFIX + domain;
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
  return hostname.toLowerCase().replace(/^www\./, '');
}

function formatPaymentCurrency(amount) {
  const numStr = amount.toString();
  const lastThree = numStr.substring(numStr.length - 3);
  const otherNumbers = numStr.substring(0, numStr.length - 3);
  if (otherNumbers !== '') {
    return '₹' + otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + lastThree;
  } else {
    return '₹' + lastThree;
  }
}

function extractPaymentPrice() {
  try {
    console.log('🔍 Starting price extraction with multiple strategies...');

    // Strategy 1: Look for Scan & Pay button (most reliable)
    let priceElement = document.querySelector('button[class*="css-1jrfdgj"]');
    if (!priceElement) {
      // Try broader button search
      const buttons = document.querySelectorAll('button');
      buttons.forEach(btn => {
        const text = btn.textContent || btn.innerText || '';
        if (text.includes('Scan & Pay') || text.includes('Scan &amp; Pay')) {
          priceElement = btn;
          console.log('🎯 Strategy 1 - Found Scan & Pay button:', text);
        }
      });
    } else {
      console.log('🎯 Strategy 1 - Found button with class css-1jrfdgj:', priceElement.textContent);
    }

    // Strategy 2: Try the original specific class combination (fallback)
    if (!priceElement) {
      priceElement = document.querySelector('.css-cm5tpy.eka6zu20');
      console.log('🎯 Strategy 2 - Specific class:', priceElement);
    }

    // Strategy 3: Try without the dot combination
    if (!priceElement) {
      priceElement = document.querySelector('p .css-cm5tpy.eka6zu20');
      console.log('🎯 Strategy 3 - P tag with class:', priceElement);
    }

    // Strategy 4: Look for elements with price-like text patterns
    if (!priceElement) {
      console.log('🎯 Strategy 4 - Searching all elements with price patterns...');
      const allElements = document.querySelectorAll('*');
      const priceElements = [];

      allElements.forEach((el, index) => {
        const text = el.textContent || el.innerText || '';
        // Look for patterns like ₹1,234 or ₹12,345
        if (text.match(/₹\s*[0-9]{1,2},[0-9]{2},[0-9]{3}/) || text.match(/₹\s*[0-9,]+/)) {
          priceElements.push({
            element: el,
            text: text.trim(),
            className: el.className,
            tagName: el.tagName
          });
        }
      });

      console.log('🔍 Found elements with price patterns:', priceElements.length);
      priceElements.forEach((item, index) => {
        console.log(`💰 Price candidate ${index + 1}:`, {
          tag: item.tagName,
          class: item.className,
          text: item.text.substring(0, 100) // First 100 chars
        });
      });

      // Try to find the highest price (likely the total)
      let highestPrice = 0;
      let bestElement = null;

      priceElements.forEach(item => {
        const priceMatch = item.text.match(/₹\s*([0-9,]+)/);
        if (priceMatch) {
          const priceString = priceMatch[1].replace(/,/g, '');
          const price = parseInt(priceString, 10);
          console.log(`💵 Parsed price from "${item.text.substring(0, 30)}...": ${price}`);

          if (price > highestPrice && price < 1000000) { // Reasonable upper limit
            highestPrice = price;
            bestElement = item.element;
            console.log(`🏆 New highest price found: ${price}`);
          }
        }
      });

      if (bestElement) {
        priceElement = bestElement;
        console.log('🎯 Strategy 4 - Selected element with highest price:', highestPrice);
      }
    }

    // Strategy 5: Look for common payment page selectors
    if (!priceElement) {
      console.log('🎯 Strategy 5 - Common payment selectors...');
      const commonSelectors = [
        '[data-testid*="total"]',
        '[data-testid*="price"]',
        '.total-amount',
        '.final-price',
        '.payment-total',
        '[class*="total"]',
        '[class*="amount"]',
        'span:contains("₹")',
        'div:contains("₹")'
      ];

      for (const selector of commonSelectors) {
        try {
          const elements = document.querySelectorAll(selector);
          if (elements.length > 0) {
            console.log(`🔍 Found ${elements.length} elements with selector: ${selector}`);
            elements.forEach((el, i) => {
              const text = el.textContent || el.innerText || '';
              if (text.includes('₹')) {
                console.log(`💰 ${selector}[${i}]:`, text.substring(0, 50));
                if (!priceElement) priceElement = el;
              }
            });
          }
        } catch (e) {
          // Skip invalid selectors
        }
      }
    }

    // Extract price from the selected element
    if (priceElement) {
      const priceText = priceElement.textContent || priceElement.innerText;
      console.log('🏷️ Final selected element text:', priceText);

      // Handle different price formats:
      // 1. "Scan & Pay ₹8700" format
      // 2. "₹8,700" format  
      // 3. "₹ 8700" format
      let priceMatch = priceText.match(/(?:Scan\s*&\s*Pay\s*|Pay\s*)*₹\s*([0-9,]+)/i);

      if (!priceMatch) {
        // Try alternative patterns
        priceMatch = priceText.match(/₹\s*([0-9,]+)/) ||
          priceText.match(/([0-9,]+)\s*₹/) ||
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

        // Debug: Show what we're trying to match
        console.log('🔍 Attempting to match patterns in:', priceText);
      }
    } else {
      console.log('❌ No price element found with any strategy');
    }

  } catch (error) {
    console.error('❌ Error extracting price:', error);
  }
  return null;
}

function createPaymentDiscountPopup(originalPrice, discountPercentage, finalPrice, cardData) {
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
              with ${discountPercentage}% Nykaa Gift Card
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

  document.body.insertAdjacentHTML('beforeend', popupHTML);

  // Floating Button for Popup (same style as nykaa.js)
  const triggerIcon = document.createElement('div');
  triggerIcon.setAttribute('zepp-trigger-icon', '1');
  triggerIcon.style.position = 'fixed';
  triggerIcon.style.bottom = '5%';
  triggerIcon.style.right = '20px';
  triggerIcon.style.width = '50px';
  triggerIcon.style.height = '50px';
  triggerIcon.style.borderRadius = '50%';
  triggerIcon.style.background = '#4755A5';
  triggerIcon.style.border = '1px solid rgba(255, 255, 255, 0.5)';
  triggerIcon.style.boxShadow = '0 2px 6px rgba(0,0,0,0.2)';
  triggerIcon.style.display = 'flex';
  triggerIcon.style.justifyContent = 'center';
  triggerIcon.style.alignItems = 'center';
  triggerIcon.style.cursor = 'pointer';
  triggerIcon.style.zIndex = '9998';
  triggerIcon.style.opacity = '1';
  triggerIcon.innerHTML = `<img src="${chrome.runtime.getURL('icon.png')}" style="width: 24px; height: 24px;" alt="ZEPP" />`;

  // Attach to DOM
  document.body.appendChild(triggerIcon);

  const popup = document.getElementById('zeppPaymentPopup');

  // Load icons (same as nykaa.js)
  document.getElementById('settingsicon').src = chrome.runtime.getURL('settings.svg');
  document.getElementById('infoicon').src = chrome.runtime.getURL('info.svg');
  // Coupon icon removed from header layout

  // Add settings icon click handler
  document.getElementById('settingsicon').addEventListener('click', () => {
    openPaymentSettingsModal();
  });
  document.getElementById('settingsicon').style.cursor = 'pointer';

  // Add info icon click handler
  document.getElementById('infoicon').addEventListener('click', () => {
    openPaymentInfoModal();
  });
  document.getElementById('infoicon').style.cursor = 'pointer';

  // Add minimize functionality (matches nykaa.js style)
  document.getElementById('closeAutoPopup').addEventListener('click', () => {
    popup.style.opacity = '0';
    popup.style.transform = 'translateY(10px)';
    setTimeout(() => {
      popup.style.display = 'none';
      triggerIcon.style.opacity = '1';
    }, 300);
  });

  // Add trigger icon click functionality (matches nykaa.js style)
  triggerIcon.addEventListener('click', () => {
    if (popup.style.display === 'block') {
      popup.style.opacity = '0';
      popup.style.transform = 'translateY(10px)';
      setTimeout(() => {
        popup.style.display = 'none';
      }, 300);
    } else {
      popup.style.display = 'block';
      popup.style.opacity = '1';
      popup.style.transform = 'translateY(0)';
    }
  });

}

async function loadPaymentGiftCard() {
  try {
    console.log('🚀 Starting loadPaymentGiftCard function');
    
    // Double-check we're on a payment page
    if (!isPaymentPage()) {
      console.log('🚫 Not on payment page, aborting loadPaymentGiftCard');
      return;
    }
    
    const domain = normalizePaymentDomain(window.location.hostname);
    console.log('🌐 Loading gift card for payment page, domain:', domain);

    // Check cache first
    let cardData = getPaymentCachedGiftCard(domain);

    if (!cardData) {
      // Try API first, then fallback to mock data
      try {
        const response = await fetch(`https://localhost:3000/giftcard?domain=${encodeURIComponent(domain)}`);
        if (response.ok) {
          cardData = await response.json();
          if (cardData && !cardData.error) {
            console.log('Gift card data loaded from API');
            setPaymentCachedGiftCard(domain, cardData);
          } else {
            cardData = null;
          }
        }
      } catch (error) {
        console.log('API fetch failed, using fallback data:', error.message);
      }

      // Fallback to mock data
      if (!cardData) {
        const mockGiftCards = {
          'nykaa.com': {
            discount: 30,
            img: 'https://logo.clearbit.com/nykaa.com',
            title: 'Nykaa Gift Cards',
            desc: 'Exclusive discount on beauty products',
            cta: 'Get your Gift Card',
            link: 'https://zepp.studentpurchaseprogram.com/nykaa-offer'
          }
        };
        cardData = mockGiftCards[domain];
      }
    }

    if (cardData) {
      console.log('🎁 Gift card data found, proceeding with price extraction...');
      // Extract price from page
      console.log('💸 Attempting to extract price from page...');
      const originalPrice = extractPaymentPrice();
      console.log('💸 Price extraction result:', originalPrice);
      if (originalPrice) {
        const discountPercentage = cardData.discount || 30;
        const discountAmount = Math.round((originalPrice * discountPercentage) / 100);
        const finalPrice = originalPrice - discountAmount;

        console.log('📊 Price calculation:', {
          originalPrice,
          discountPercentage,
          discountAmount,
          finalPrice
        });

        console.log('🚀 Creating payment discount popup...');
        createPaymentDiscountPopup(originalPrice, discountPercentage, finalPrice, cardData);
      } else {
        console.log('❌ Could not extract price from page - popup will not be created');

        // Create popup anyway for testing
        console.log('🧪 Creating test popup with dummy data...');
        createPaymentDiscountPopup(5000, 30, 3500, cardData);
      }
    } else {
      console.log('❌ No gift card data available for domain:', domain);

      // Create test popup anyway
      console.log('🧪 Creating test popup with dummy gift card data...');
      const testCardData = {
        discount: 30,
        title: 'Test Gift Card',
        desc: 'Test description',
        cta: 'Get Code',
        link: '#'
      };
      createPaymentDiscountPopup(5000, 30, 3500, testCardData);
    }

  } catch (error) {
    console.error('Failed to load gift card for payment:', error);
  }
}

// Wait for page to load and then try to find price element
function initPaymentScript() {
  console.log('🔄 Initializing payment script...');
  console.log('🔄 Document ready state:', document.readyState);

  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    console.log('📄 Document still loading, waiting for DOMContentLoaded...');
    document.addEventListener('DOMContentLoaded', () => {
      console.log('📄 DOMContentLoaded fired, setting timeout...');
      setTimeout(() => {
        console.log('⏰ 1 second timeout fired, calling loadPaymentGiftCard...');
        loadPaymentGiftCard();
      }, 1000); // Wait 1 second for elements to load
    });
  } else {
    console.log('📄 Document already ready, setting immediate timeout...');
    setTimeout(() => {
      console.log('⏰ 1 second timeout fired, calling loadPaymentGiftCard...');
      loadPaymentGiftCard();
    }, 1000);
  }

  // Also try again after 3 seconds in case elements load later
  setTimeout(() => {
    console.log('⏰ 3 second timeout fired, calling loadPaymentGiftCard again...');
    loadPaymentGiftCard();
  }, 3000);
}

// Authentication and Settings Functions (copied from nykaa.js)
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
  const existingModal = document.getElementById('zepp-payment-settings-modal');
  if (existingModal) {
    existingModal.remove();
  }

  const modal = document.createElement('div');
  modal.id = 'zepp-payment-settings-modal';
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    z-index: 99999;
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
      
      <div id="paymentSettingsContent">
        <div style="margin-bottom: 24px;">
          <label style="display: block; margin-bottom: 8px; color: #333; font-weight: 500;">Logged in as:</label>
          <div id="paymentUserEmailDisplay" style="
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
          id="paymentLogoutBtn"
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
          id="closePaymentSettingsModal"
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
      
      <div id="paymentSettingsMessage" style="
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
  document.getElementById('closePaymentSettingsModal').addEventListener('click', () => {
    modal.remove();
  });

  document.getElementById('paymentLogoutBtn').addEventListener('click', handlePaymentSettingsLogout);

  // Close modal when clicking outside
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.remove();
    }
  });
}

async function loadPaymentUserSettings() {
  const authData = await checkPaymentAuthStatus();
  const userEmailDisplay = document.getElementById('paymentUserEmailDisplay');

  if (authData && authData.isAuthenticated) {
    userEmailDisplay.textContent = authData.email;
    userEmailDisplay.style.color = '#28a745';
  } else {
    userEmailDisplay.textContent = 'Not logged in';
    userEmailDisplay.style.color = '#dc3545';
    document.getElementById('paymentLogoutBtn').disabled = true;
    document.getElementById('paymentLogoutBtn').style.background = '#6c757d';
    document.getElementById('paymentLogoutBtn').textContent = 'Already logged out';
  }
}

async function handlePaymentSettingsLogout() {
  const logoutBtn = document.getElementById('paymentLogoutBtn');
  const settingsMessage = document.getElementById('paymentSettingsMessage');

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
      document.getElementById('zepp-payment-settings-modal').remove();
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
  const messageDiv = document.getElementById('paymentSettingsMessage');
  messageDiv.textContent = message;
  messageDiv.style.display = 'block';
  messageDiv.style.backgroundColor = type === 'error' ? '#fee' : '#efe';
  messageDiv.style.color = type === 'error' ? '#c33' : '#363';
  messageDiv.style.border = `1px solid ${type === 'error' ? '#fcc' : '#cfc'}`;
}

// Info Modal Functions for Payment Page
function openPaymentInfoModal() {
  // Remove any existing info modal
  const existingModal = document.getElementById('zepp-payment-info-modal');
  if (existingModal) {
    existingModal.remove();
  }

  const modal = document.createElement('div');
  modal.id = 'zepp-payment-info-modal';
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
        <h2 style="color: #242424; margin: 0 0 8px 0; font-size: 24px;">ZEPP Saver Guide</h2>
        <p style="color: #666; margin: 0; font-size: 14px;">Save money with student discounts & gift cards</p>
      </div>
      
      <div style="margin-bottom: 24px;">
        <h3 style="color: #242424; font-size: 18px; margin: 0 0 12px 0;">💳 Payment Page Features</h3>
        <p style="color: #555; margin: 0 0 16px 0; line-height: 1.5;">On Nykaa payment pages, ZEPP Saver automatically calculates your savings and shows the discounted amount you'll pay with gift cards.</p>
      </div>

      <div style="margin-bottom: 24px;">
        <h3 style="color: #242424; font-size: 18px; margin: 0 0 12px 0;">🚀 Key Features</h3>
        <div style="margin-bottom: 16px;">
          <strong style="color: #242424;">💰 Real-time Savings Calculator</strong>
          <p style="color: #555; margin: 4px 0 0 0; line-height: 1.4;">Automatically detects your payment amount and calculates gift card discounts.</p>
        </div>
        <div style="margin-bottom: 16px;">
          <strong style="color: #242424;">🎓 Student Discounts</strong>
          <p style="color: #555; margin: 4px 0 0 0; line-height: 1.4;">Extra cashback for authenticated student accounts.</p>
        </div>
        <div style="margin-bottom: 16px;">
          <strong style="color: #242424;">🎁 Gift Card Integration</strong>
          <p style="color: #555; margin: 4px 0 0 0; line-height: 1.4;">Seamlessly apply gift cards on top of existing discounts.</p>
        </div>
        <div>
          <strong style="color: #242424;">⚡ Instant Calculations</strong>
          <p style="color: #555; margin: 4px 0 0 0; line-height: 1.4;">See your final payment amount instantly.</p>
        </div>
      </div>

      <div style="margin-bottom: 24px;">
        <h3 style="color: #242424; font-size: 18px; margin: 0 0 12px 0;">📖 How to Use on Payment Pages</h3>
        <div style="background: #f8f9ff; padding: 16px; border-radius: 8px; border-left: 4px solid #687AE4;">
          <ol style="margin: 0; padding-left: 20px; color: #555; line-height: 1.6;">
            <li><strong>Proceed to payment</strong> on any Nykaa order</li>
            <li><strong>Look for</strong> the ZEPP Saver popup showing your savings</li>
            <li><strong>Login</strong> with your student email for extra discounts</li>
            <li><strong>Click "Get your Gift Card"</strong> to purchase gift cards</li>
            <li><strong>Apply gift cards</strong> and pay the reduced amount</li>
          </ol>
        </div>
      </div>

      <div style="margin-bottom: 24px;">
        <h3 style="color: #242424; font-size: 18px; margin: 0 0 12px 0;">💡 Payment Page Tips</h3>
        <div style="background: #fff8e1; padding: 16px; border-radius: 8px; border-left: 4px solid #ffa726;">
          <ul style="margin: 0; padding-left: 20px; color: #555; line-height: 1.6;">
            <li><strong>Always check payment pages:</strong> Additional savings may be available during checkout</li>
            <li><strong>Gift cards are instant:</strong> Purchase and apply gift cards immediately</li>
            <li><strong>Stack with coupons:</strong> Gift cards work on top of existing promotions</li>
            <li><strong>Student bonus:</strong> Extra 1% cashback for verified students</li>
          </ul>
        </div>
      </div>

      <div style="margin-bottom: 24px;">
        <h3 style="color: #242424; font-size: 18px; margin: 0 0 12px 0;">🛡️ Privacy & Security</h3>
        <p style="color: #555; margin: 0; line-height: 1.5;">ZEPP Saver only reads payment amounts to calculate savings. No payment information is stored or transmitted to external servers.</p>
      </div>
      
      <div style="text-align: center; margin-top: 24px;">
        <button 
          id="closePaymentInfoModal"
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
  document.getElementById('closePaymentInfoModal').addEventListener('click', () => {
    modal.remove();
  });

  // Close modal when clicking outside
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.remove();
    }
  });
}

// Initialize on page load
initializePaymentScript();

// Monitor URL changes and reinitialize when navigating to payment page
onPaymentUrlChange(() => {
  console.log('🔄 URL change detected, checking if payment page...');
  // Wait a bit for SPA content to load
  setTimeout(() => {
    initializePaymentScript();
  }, 1000);
});