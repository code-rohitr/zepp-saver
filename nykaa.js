console.log("Nykaa Running content script...");

// Shop Now redirect cache with 30-minute expiry
const SHOP_NOW_CACHE_DURATION = 30 * 60 * 1000; // 30 minutes
const SHOP_NOW_CACHE_PREFIX = 'zepp_shop_redirect_';

function getCachedShopRedirect(urlKey, userEmail) {
  try {
    const cacheKey = SHOP_NOW_CACHE_PREFIX + `${userEmail}_${urlKey}`;
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      const parsedCache = JSON.parse(cached);
      if (parsedCache && (Date.now() - parsedCache.timestamp) < SHOP_NOW_CACHE_DURATION) {
        console.log('✅ Using cached redirect for:', urlKey);
        return true;
      } else {
        // Remove expired cache
        localStorage.removeItem(cacheKey);
        console.log('🗑️ Removed expired redirect cache for:', urlKey);
      }
    }
  } catch (error) {
    console.error('Error reading redirect cache:', error);
  }
  return false;
}

function setCachedShopRedirect(urlKey, userEmail) {
  try {
    const cacheKey = SHOP_NOW_CACHE_PREFIX + `${userEmail}_${urlKey}`;
    const cacheData = {
      timestamp: Date.now(),
      urlKey: urlKey,
      userEmail: userEmail
    };
    localStorage.setItem(cacheKey, JSON.stringify(cacheData));
    console.log('💾 Cached redirect for:', urlKey, 'for 30 minutes');
  } catch (error) {
    console.error('Error saving redirect cache:', error);
  }
}

// Helper function to handle Shop Now button click
async function handleShopNowClick(urlKey) {
  try {
    // Get user email from authentication
    const authData = await checkAuthStatus();
    if (!authData || !authData.email) {
      console.error('User email not found');
      return;
    }

    // Check if we have a cached redirect for this user and product
    const hasCachedRedirect = getCachedShopRedirect(urlKey, authData.email);

    if (hasCachedRedirect) {
      console.log('🚀 Using cached redirect - opening direct URL');
      // Direct redirect to the product page
      const directUrl = `https://zepp.studentpurchaseprogram.com/${urlKey}.html`;
      window.open(directUrl, '_blank');
      return;
    }

    console.log('🔗 Calling login-with-email API for:', authData.email, 'urlKey:', urlKey);

    // Show loading state
    const ctaBtn = document.getElementById("ctaBtn");
    if (ctaBtn) {
      const originalText = ctaBtn.textContent;
      ctaBtn.textContent = 'Loading...';
      ctaBtn.style.pointerEvents = 'none';

      try {
        const response = await fetch('http://localhost:3000/api/login-with-email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            email: authData.email,
            urlKey: urlKey
          })
        });

        const result = await response.json();

        if (result.success && result.loginLink) {
          console.log('✅ Login link generated:', result.loginLink);

          // Cache this redirect for 30 minutes
          setCachedShopRedirect(urlKey, authData.email);

          // Open the login link in a new tab
          window.open(result.loginLink, '_blank');
        } else {
          console.error('❌ Login-with-email failed:', result.error);
          alert('Failed to generate login link. Please try again.');
        }
      } finally {
        // Restore button state
        ctaBtn.textContent = originalText;
        ctaBtn.style.pointerEvents = 'auto';
      }
    }
  } catch (error) {
    console.error('Error in handleShopNowClick:', error);
    alert('Network error. Please try again.');
  }
}

// Helper function to manage Shop Now button visibility
function updateShopNowButtonVisibility(isAuthenticated, zeppPriceAvailable) {
  const ctaBtn = document.getElementById("ctaBtn");
  if (ctaBtn) {
    if (isAuthenticated && zeppPriceAvailable) {
      ctaBtn.style.display = 'flex';
      console.log('✅ Shop Now button shown - both conditions met: authenticated and ZEPP price available');
    } else {
      ctaBtn.style.display = 'none';
      console.log('❌ Shop Now button hidden - missing condition:', {
        isAuthenticated,
        zeppPriceAvailable
      });
    }
  }
}

// -- Utilities for Price & PID --

function extractNykaaPrice() {
  const priceElement = document.querySelector("div .css-1jczs19");
  if (priceElement) {
    const text = priceElement.innerText;
    const num = parseFloat(text.replace(/[^\d]/g, ""));
    return isNaN(num) ? null : num;
  }
  return null;
}

function extractNykaaPID() {
  const skuIdMatch = window.location.href.match(/skuId=([A-Z0-9]+)/i);
  return skuIdMatch ? skuIdMatch[1] : null;
}

// Helper function to format price in Indian currency format
function formatIndianCurrency(amount) {
  if (!amount || isNaN(amount)) return 'Unavailable';

  const numStr = Math.round(amount).toString();
  let result = '';
  let count = 0;

  // Process from right to left
  for (let i = numStr.length - 1; i >= 0; i--) {
    if (count === 3) {
      result = ',' + result;
      count = 0;
    } else if (count > 3 && (count - 3) % 2 === 0) {
      result = ',' + result;
    }
    result = numStr[i] + result;
    count++;
  }

  return '₹' + result;
}

// --- Popup Injection Logic in a Function ---

async function injectZeppPopup() {
  // Remove old popups/triggers
  document.querySelectorAll('.zepp-extension-popup').forEach(el => el.remove());
  document.querySelectorAll('[zepp-trigger-icon]').forEach(el => el.remove());

  const productID = extractNykaaPID();
  const price = extractNykaaPrice();

  if (!productID) {
    console.warn("ProductID not found. Popup will not be shown.");
    return;
  }

  // Style for font and popup
  const style = document.createElement('style');
  style.textContent = `
      @font-face {
        font-family: 'Funnel Display';
        src: url('${chrome.runtime.getURL('FunnelDisplay.ttf')}') format('truetype');
        font-weight: normal;
        font-style: normal;
      }
      .zepp-extension-popup * {
        font-family: 'Funnel Display', sans-serif !important;
      }
    `;
  document.head.appendChild(style);

  // Popup
  const popup = document.createElement('div');
  popup.classList.add('zepp-extension-popup');
  popup.style.position = 'fixed';
  popup.style.bottom = '5%';
  popup.style.right = '80px';
  popup.style.zIndex = '9999';
  popup.style.background = '#ffffff';
  popup.style.backdropFilter = 'blur(35px)';
  popup.style.border = '1px solid rgba(255,255,255,0.2)';
  popup.style.borderRadius = '12px';
  popup.style.boxShadow = '0 8px 32px rgba(0,0,0,0.25)';
  popup.style.width = '300px';
  popup.style.transition = 'all 0.3s ease';
  popup.style.opacity = '0'; // initially hidden
  popup.style.overflow = 'hidden';
  popup.style.transform = 'translateY(-10px)';

  // Check authentication status
  const authData = await checkAuthStatus();
  const isAuthenticated = authData && authData.isAuthenticated;

  popup.innerHTML = `
    <!-- Header Section with White Background -->
    <div style="background: #ffffff; color: #000000; padding: 16px 20px; border-radius: 12px 12px 0 0;">
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <div style="font-weight: 600; font-size: 16px;">
          Zepp Saver
        </div>
        <div style="display: flex; align-items: center; filter: invert(1);">
          <img id="settingsicon" style="height: 20px; margin-left: 10px; cursor: pointer;" />
          <button id="closeAutoPopup" style="background: none; filter: invert(1); border: none; font-size: 18px; cursor: pointer; color: #000000; margin-left: 10px;">✕</button>
        </div>
      </div>
    </div>

    <!-- Content Area with white Background -->
    <div style="background: #ffffff; padding: 10px 0; border-radius: 0 0 12px 12px;">
      
      <!-- Price Section (shown when authenticated) -->
      <div id="priceSection" style="display: none; background: white; border-radius: 8px; padding: 16px 0; margin-bottom: 16px;">
        <div style="display: flex; font-size: 16px; justify-content: space-between; padding: 12px 20px; border-bottom: 1px solid #e0e0e0;">
          <span style="color: #666;">Nykaa Price</span>
          <span id="amazonPrice" style="font-weight: 600; color: #333;">${formatIndianCurrency(price)}</span>
        </div>
        <div style="display: flex; font-size: 16px; justify-content: space-between; padding: 12px 20px; border-bottom: 1px solid #e0e0e0;">
          <span style="color: #4755A5;">ZEPP Price</span>
          <span id="sheetPrice" style="font-weight: 600; color: #687AE4;">Loading...</span>
        </div>
        <div style="text-align: center; margin-top: 16px; background-color: hsla(231, 70%, 65%, 0.10); padding: 12px 0;">
          <div style="font-size: 14px; color: #666;">Shop on ZEPP and save</div>
          <div id="savings" style="font-size: 24px; font-weight: 700; color: #687AE4; margin-top: 8px;"></div>
        </div>
      </div>
      
      <!-- Gift Card Skeleton Loader -->
      <div id="giftCardSkeleton" style="display: none; margin-bottom: 16px;">
        <div style="
          background: white;
          border-radius: 12px;
          padding: 20px;
          position: relative;
        ">
          <div style="text-align: center;">
            
            <!-- Skeleton Discount Badge -->
            <div style="
              background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
              background-size: 200% 100%;
              animation: shimmer 1.5s infinite;
              width: 120px;
              height: 28px;
              border-radius: 25px;
              margin: 0 auto 12px auto;
            "></div>
            
            <!-- Skeleton Title -->
            <div style="
              background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
              background-size: 200% 100%;
              animation: shimmer 1.5s infinite;
              width: 140px;
              height: 20px;
              border-radius: 4px;
              margin: 0 auto 8px auto;
            "></div>
            
            <!-- Skeleton Description Lines -->
            <div style="
              background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
              background-size: 200% 100%;
              animation: shimmer 1.5s infinite;
              width: 200px;
              height: 14px;
              border-radius: 4px;
              margin: 0 auto 6px auto;
            "></div>
            <div style="
              background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
              background-size: 200% 100%;
              animation: shimmer 1.5s infinite;
              width: 160px;
              height: 14px;
              border-radius: 4px;
              margin: 0 auto 20px auto;
            "></div>
            
            <!-- Skeleton Button -->
            <div style="
              background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
              background-size: 200% 100%;
              animation: shimmer 1.5s infinite;
              width: 120px;
              height: 40px;
              border-radius: 8px;
              margin: 0 auto;
            "></div>
          </div>
        </div>
      </div>

      <!-- Gift Card Section with White Background and Orange Logo -->
      <div id="giftCardSection" style="display: none; margin-bottom: 16px;">
        <div style="
          border-radius: 12px;
          position: relative;
          opacity: 0;
          transform: translateY(10px);
          transition: all 0.3s ease;
        ">
          
          <!-- Gift Card Content -->
          <div style="text-align: center;">
            
            <!-- Discount Highlight Text -->
            <div style="
              background: rgba(71, 85, 165, 0.1);
              color: #4755A5;
              padding: 8px 16px;
              border-radius: 25px;
              font-size: 14px;
              font-weight: 700;
              margin-bottom: 12px;
              display: inline-block;
            ">
              <span id="giftCardDiscountText">Save 30% now with</span>
            </div>
            
            <h3 id="giftCardTitle" style="
              font-size: 18px; 
              font-weight: 700; 
              color: #333;
              margin: 0 0 8px 0;
            ">Nykaa Gift Cards</h3>
            

            <!-- Gift Card Disclaimer -->
            <div style="
              margin: 16px;
              padding: 10px 12px;
              border-radius: 6px;
            ">
              <p style="
                font-size: 12px;
                color: #6c6c6cff;
                margin: 0;
                line-height: 1.3;
                text-align: center;
                font-weight: 600;
              ">
                💡 Apply Gift Card on checkout and pay 7% less on your final bill
              </p>
            </div>
            
            <a id="giftCardCTA" href="#" target="_blank" style="
              display: inline-block;
              background: linear-gradient(135deg, #687AE4 0%, #5a6fd8 100%);
              color: white;
              text-decoration: none;
              padding: 12px 24px;
              border-radius: 100px;
              font-size: 14px;
              font-weight: 600;
              transition: all 0.3s ease;
              box-shadow: 0 2px 8px rgba(104, 122, 228, 0.3);
            " onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 16px rgba(104, 122, 228, 0.4)'" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 2px 8px rgba(104, 122, 228, 0.3)'">Get your Gift Card</a>
            
            
          </div>
        </div>
      </div>
      
      <!-- CSS Animations -->
      <style>
        @keyframes pulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.05); }
          100% { transform: scale(1); }
        }
        
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      </style>


      <!-- Authentication Section with Purple Gradient Background -->
      <div id="authSection" style="display: ${isAuthenticated ? 'none' : 'block'};">
        <!-- Initial Auth Prompt -->
        <div id="authPrompt" style="
          background: #f0f2fd;
          border-radius: 12px;
          padding: 24px;
          text-align: center;
          color: #242424;
          box-shadow: 0 4px 16px rgba(102, 126, 234, 0.3);
        ">
          <div style="font-size: 14px; margin-bottom: 20px; line-height: 1.4;">
            Unlock Exclusive Employee Discounts with your organization email<br>
          </div>
          <button id="startLoginBtn" style="
            background: none;
            color: #667eea;
            border: none;
            padding: 12px 24px;
            border-radius: 8px;
            font-weight: 600;
            cursor: pointer;
            font-size: 14px;
            width: 100%;
            transition: all 0.3s ease;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          " onmouseover="this.style.background='white'; this.style.transform='translateY(-1px)'" onmouseout="this.style.background='rgba(255,255,255,0.95)'; this.style.transform='translateY(0)'">
            Verify Employee Email
          </button>
        </div>

        <!-- Login Form -->
        <div id="loginForm" style="display: none; background: white; border-radius: 12px; padding: 20px; box-shadow: 0 2px 12px rgba(0,0,0,0.1); border: 1px solid #e0e0e0;">
          <div id="emailStep">
            <div style="margin-bottom: 16px;">
              <label style="display: block; margin-bottom: 8px; color: #333; font-weight: 500; font-size: 14px;">Student Email</label>
              <input 
                type="email" 
                id="studentEmail" 
                placeholder="Enter email here"
                style="
                  width: 100%;
                  padding: 12px;
                  border: 2px solid #e1e5e9;
                  border-radius: 8px;
                  font-size: 14px;
                  box-sizing: border-box;
                  transition: border-color 0.3s ease;
                "
              />
            </div>
            <button 
              id="sendOtpBtn"
              style="
                width: 100%;
                padding: 12px;
                background: #667eea;
                color: white;
                border: none;
                border-radius: 8px;
                font-size: 14px;
                font-weight: 600;
                cursor: pointer;
                margin-bottom: 12px;
                transition: background 0.3s ease;
              "
            >
              Send OTP
            </button>
            <button 
              id="cancelLoginBtn"
              style="
                width: 100%;
                padding: 10px;
                background: none;
                color: #666;
                border: 1px solid #ddd;
                border-radius: 8px;
                font-size: 12px;
                cursor: pointer;
                transition: all 0.3s ease;
              "
            >
              Cancel
            </button>
          </div>
          
          <div id="otpStep" style="display: none;">
            <div style="margin-bottom: 16px;">
              <label style="display: block; margin-bottom: 8px; color: #333; font-weight: 500; font-size: 14px;">Enter OTP</label>
              <input 
                type="text" 
                id="otpCode" 
                placeholder="Enter 6-digit OTP"
                maxlength="6"
                style="
                  width: 100%;
                  padding: 12px;
                  border: 2px solid #e1e5e9;
                  border-radius: 8px;
                  font-size: 14px;
                  text-align: center;
                  box-sizing: border-box;
                  transition: border-color 0.3s ease;
                "
              />
            </div>
            <button 
              id="verifyOtpBtn"
              style="
                width: 100%;
                padding: 12px;
                background: #28a745;
                color: white;
                border: none;
                border-radius: 8px;
                font-size: 14px;
                font-weight: 600;
                cursor: pointer;
                margin-bottom: 12px;
                transition: background 0.3s ease;
              "
            >
              Verify & Login
            </button>
            <button 
              id="backToEmailBtn"
              style="
                width: 100%;
                padding: 10px;
                background: none;
                color: #667eea;
                border: none;
                font-size: 12px;
                cursor: pointer;
                text-decoration: underline;
                transition: color 0.3s ease;
              "
            >
              ← Back to email
            </button>
          </div>
          
          <div id="loginMessage" style="
            margin-top: 16px;
            padding: 12px;
            border-radius: 8px;
            font-size: 12px;
            text-align: center;
            display: none;
          "></div>
        </div>
      </div>
      
      <!-- Shop Now Button -->
      <style>
        #ctaBtn {
          transition: all 0.2s ease;
          background: #4755A5;
        }
        #ctaBtn:hover {
          background: linear-gradient(135deg, #5a6fd8 0%, #4c63d2 100%);
          color: #ffffff;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(104, 122, 228, 0.4);
        }
      </style>
      <a id="ctaBtn" href="https://zepp.studentpurchaseprogram.com/" target="_blank"
        style="display: none; align-items: center; justify-content: center; gap: 8px;
                padding: 12px; margin: 0px 20px 16px 20px; color: white;
                border-radius: 100px; text-decoration: none; font-weight: bold; font-size: 16px;">
        <img id="zeppIcon" style="height: 24px;" />
        Save Now
      </a>
      
    </div>
  `;

  // Floating Button for Popup
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
  document.body.appendChild(popup);
  document.body.appendChild(triggerIcon);

  // Set icons
  // NOTE: These will still be loaded even though the popup is initially hidden
  document.getElementById('zeppIcon').src = chrome.runtime.getURL('icon.png');
  
  // Add settings icon click handler
  document.getElementById('settingsicon').src = chrome.runtime.getURL('settings.svg');
  document.getElementById('settingsicon').addEventListener('click', () => {
    openSettingsModal();
  });

  // Info icon removed from header

  // Close popup listener
  document.getElementById('closeAutoPopup').addEventListener('click', () => {
    popup.style.opacity = '0';
    popup.style.transform = 'translateY(10px)';
    setTimeout(() => {
      popup.style.display = 'none';
      triggerIcon.style.opacity = '1';
    }, 300);
  });

  // Setup authentication handlers
  setupInlineLoginHandlers();

  // Trigger icon toggles popup
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


  // Authentication check completed (sensitive data not logged for security)

  // Fetch ZEPP Price - Popup will only be shown if ZEPP price is available!
  let sheetPrice = null, title = null, productUrl = null;
  const id_type = "nyka_sku";

  // Initial button and price section state - hidden until conditions are verified
  updateShopNowButtonVisibility(isAuthenticated, false);
  updatePriceSectionVisibility(isAuthenticated, false);

  async function logProductPageVisit(productUrl) {
    try {
      const response = await fetch('http://localhost:3000/api/log-product', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: productUrl, id: productID }),
      });
      const result = await response.json();
      console.log('Logged product page:', result);
    } catch (error) {
      console.error('Logging failed:', error);
    }
  }

  logProductPageVisit(window.location.href);

  fetch(`http://localhost:3000/api/price?id_type=${id_type}&id_value=${productID}`)
    .then(res => res.json())
    .then(data => {
      const sheetPriceEl = document.getElementById("sheetPrice");
      const savingsEl = document.getElementById("savings");
      const splpriceAttr = data.items[0].custom_attributes?.find(attr => attr.attribute_code === "special_price");
      const surchargeAttr = data.items[0].custom_attributes?.find(attr => attr.attribute_code === "productsurcharge_fee");
      const splprice = splpriceAttr ? parseFloat(splpriceAttr.value) : 0;
      const surcharge = surchargeAttr ? parseFloat(surchargeAttr.value) : 0;
      const finalPrice = splprice + surcharge;

      if (data.items && data.items.length > 0) {
        if (!finalPrice || finalPrice <= 0) {
          // No valid ZEPP price available, keep button and price section hidden
          updateShopNowButtonVisibility(isAuthenticated, false);
          updatePriceSectionVisibility(isAuthenticated, false);
          console.log('❌ ZEPP price not available: finalPrice =', finalPrice);
          return;
        }

        sheetPrice = finalPrice;
        title = data.items[0].name;
        // get url_key for cta
        const urlAttr = data.items[0].custom_attributes?.find(attr => attr.attribute_code === "url_key");
        const ctaBtn = document.getElementById("ctaBtn");
        if (ctaBtn && urlAttr && urlAttr.value) {
          // Store the url_key for use in login-with-email API
          ctaBtn.dataset.urlKey = urlAttr.value;
          // Remove direct href - we'll handle this via click event
          ctaBtn.removeAttribute('href');
          ctaBtn.style.cursor = 'pointer';
          
          // Add click handler for login-with-email
          ctaBtn.onclick = async (e) => {
            e.preventDefault();
            await handleShopNowClick(urlAttr.value);
          };
        }

        if (price && sheetPrice && sheetPriceEl && savingsEl) {
          sheetPriceEl.textContent = formatIndianCurrency(sheetPrice);
          const targetSavings = Math.abs(price - sheetPrice);
          savingsEl.textContent = formatIndianCurrency(targetSavings);
          savingsEl.style.color = "#242424";
        }

        // Show the Shop Now button only if BOTH conditions are met:
        // 1. ZEPP price is available (finalPrice > 0)
        // 2. User is authenticated
        updateShopNowButtonVisibility(isAuthenticated, true);
        updatePriceSectionVisibility(isAuthenticated, true);

        // Only now: show the popup!
        setTimeout(() => {
          popup.style.opacity = '1';
          popup.style.transform = 'translateY(0)';
        }, 100);
      } else {
        // No ZEPP items found, ensure button stays hidden
        updateShopNowButtonVisibility(isAuthenticated, false);
        updatePriceSectionVisibility(isAuthenticated, false);
        console.log('❌ No ZEPP items found in response');

        const container = document.querySelector(".zepp-extension-popup div[style*='padding: 0 20px']");
        if (container) {
          container.innerHTML = `
                          <div style="text-align: center; padding: 20px;">
                          <div style="font-size: 16px; color: #444; font-weight: bold;">
                              This product is not available on ZEPP Store
                          </div>
                          </div>
                          <a href="https://zepp.studentpurchaseprogram.com/" target="_blank"
                          style="display: flex; align-items: center; justify-content: center; gap: 8px;
                                  padding: 12px; margin-top: 16px; background: #242424; color: white;
                                  border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px;">
                              <img id="zeppIcon" style="height: 24px;" />
                              Browse More
                          </a>
                      `;
          document.getElementById('zeppIcon').src = chrome.runtime.getURL('icon.png');
        }
      }
    })
    .catch(err => {
      // On fetch/network error: keep popup hidden and button hidden
      console.error("Sheet fetch error:", err);
      // Ensure button stays hidden on error (no ZEPP price available)
      updateShopNowButtonVisibility(isAuthenticated, false);
      updatePriceSectionVisibility(isAuthenticated, false);
    });

  // Load gift card data based on conditions
  loadGiftCardIfNeeded(productID);
}

function normalizeDomain(hostname) {
  return hostname.replace(/^www\./, '').toLowerCase();
}

async function loadGiftCardIfNeeded(productID) {
  try {
    // Check authentication status
    const authData = await checkAuthStatus();
    const isAuthenticated = authData && authData.isAuthenticated;

    // Check if ZEPP price is available
    let zeppPriceAvailable = false;
    if (productID) {
      try {
        const response = await fetch(`http://localhost:3000/api/price?id_type=nyka_sku&id_value=${productID}`);
        if (response.ok) {
          const data = await response.json();
          if (data.items && data.items.length > 0) {
            const splpriceAttr = data.items[0].custom_attributes?.find(attr => attr.attribute_code === "special_price");
            const surchargeAttr = data.items[0].custom_attributes?.find(attr => attr.attribute_code === "productsurcharge_fee");
            const splprice = splpriceAttr ? parseFloat(splpriceAttr.value) : 0;
            const surcharge = surchargeAttr ? parseFloat(surchargeAttr.value) : 0;
            const finalPrice = splprice + surcharge;

            if (finalPrice && finalPrice > 0) {
              zeppPriceAvailable = true;
            }
          }
        }
      } catch (error) {
        console.log('Error checking ZEPP price availability:', error);
      }
    }

    // Show gift card only if user is not authenticated OR ZEPP price is not available
    const shouldShowGiftCard = !isAuthenticated || !zeppPriceAvailable;

    console.log('Gift card visibility check:', {
      isAuthenticated,
      zeppPriceAvailable,
      shouldShowGiftCard
    });

    if (shouldShowGiftCard) {
      // Show skeleton loader first
      showGiftCardSkeleton();
      await loadGiftCardForPopup(isAuthenticated);
    } else {
      console.log('Gift card hidden - user is authenticated and ZEPP price is available');
      // Show price comparison instead
      await showPriceComparison(productID, isAuthenticated);
    }

  } catch (error) {
    console.error('Failed to check gift card conditions:', error);
    // Fallback: show gift card if there's an error checking conditions
    showGiftCardSkeleton();
    await loadGiftCardForPopup(false); // Default to not authenticated on error
  }
}

// Gift card cache with 5-minute expiry using localStorage
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const CACHE_PREFIX = 'zepp_gc_';

function getCachedGiftCard(domain) {
  try {
    const cacheKey = CACHE_PREFIX + domain;
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      const parsedCache = JSON.parse(cached);
      if (parsedCache && (Date.now() - parsedCache.timestamp) < CACHE_DURATION) {
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

function setCachedGiftCard(domain, data) {
  try {
    const cacheKey = CACHE_PREFIX + domain;
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

async function loadGiftCardForPopup(isAuthenticated = false) {
  try {
    const domain = normalizeDomain(window.location.hostname);
    console.log('Loading gift card for domain:', domain);

    // Check cache first
    let cardData = getCachedGiftCard(domain);
    if (cardData) {
      displayGiftCardInPopup(cardData, isAuthenticated);
      return;
    }

    // Try API first, then fallback to mock data
    try {
      const response = await fetch(`http://localhost:3000/giftcard?domain=${encodeURIComponent(domain)}`);
      if (response.ok) {
        cardData = await response.json();
        if (cardData && !cardData.error) {
          console.log('Gift card data loaded from API');
          setCachedGiftCard(domain, cardData);
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
          title: 'Nykaa Beauty',
          desc: 'Exclusive 30% discount on beauty products',
          cta: 'Shop Beauty',
          link: 'https://zepp.studentpurchaseprogram.com/nykaa-offer'
        },
        'amazon.in': {
          discount: 15,
          img: 'https://logo.clearbit.com/amazon.in',
          title: 'Amazon Gift Card',
          desc: 'Get 15% off on your next purchase with Amazon gift cards',
          cta: 'Claim Offer',
          link: 'https://zepp.studentpurchaseprogram.com/amazon-offer'
        }
      };

      cardData = mockGiftCards[domain];
    }

    if (cardData) {
      displayGiftCardInPopup(cardData, isAuthenticated);
    } else {
      console.log('No gift card data available for:', domain);
    }

  } catch (error) {
    console.error('Failed to load gift card:', error);
  }
}

async function showPriceComparison(productID, isAuthenticated) {
  console.log('💰 Showing price comparison for authenticated user with ZEPP price available');
  
  try {
    // Update visibility of price section and shop button
    updatePriceSectionVisibility(isAuthenticated, true);
    updateShopNowButtonVisibility(isAuthenticated, true);
    
    // Fetch ZEPP price data
    const response = await fetch(`http://localhost:3000/api/price?id_type=nyka_sku&id_value=${productID}`);
    if (response.ok) {
      const data = await response.json();
      if (data.items && data.items.length > 0) {
        const item = data.items[0];
        const splpriceAttr = item.custom_attributes?.find(attr => attr.attribute_code === "special_price");
        const surchargeAttr = item.custom_attributes?.find(attr => attr.attribute_code === "productsurcharge_fee");
        const urlAttr = item.custom_attributes?.find(attr => attr.attribute_code === "url_key");
        
        const splprice = splpriceAttr ? parseFloat(splpriceAttr.value) : 0;
        const surcharge = surchargeAttr ? parseFloat(surchargeAttr.value) : 0;
        const zeppPrice = splprice + surcharge;
        
        // Set up Shop Now button click handler with url_key
        if (urlAttr && urlAttr.value) {
          const ctaBtn = document.getElementById("ctaBtn");
          if (ctaBtn) {
            ctaBtn.dataset.urlKey = urlAttr.value;
            ctaBtn.removeAttribute('href');
            ctaBtn.style.cursor = 'pointer';
            ctaBtn.onclick = async (e) => {
              e.preventDefault();
              await handleShopNowClick(urlAttr.value);
            };
          }
        }
        
        // Update the UI with ZEPP price
        const sheetPriceElement = document.getElementById('sheetPrice');
        const savingsElement = document.getElementById('savings');
        const nykaaPriceElement = document.getElementById('nykaaPrice');
        
        if (sheetPriceElement && zeppPrice > 0) {
          sheetPriceElement.textContent = formatIndianCurrency(zeppPrice);
          sheetPriceElement.style.color = '#687AE4';
          
          // Calculate and show savings
          if (nykaaPriceElement && savingsElement) {
            const nykaaPriceText = nykaaPriceElement.textContent;
            const nykaaPrice = parseFloat(nykaaPriceText.replace(/[^\d.]/g, ''));
            
            if (nykaaPrice > zeppPrice) {
              const savings = nykaaPrice - zeppPrice;
              savingsElement.textContent = `You save ${formatIndianCurrency(savings)}`;
              savingsElement.style.color = '#28a745';
            } else if (zeppPrice > nykaaPrice) {
              const extra = zeppPrice - nykaaPrice;
              savingsElement.textContent = `Nykaa is ${formatIndianCurrency(extra)} cheaper`;
              savingsElement.style.color = '#dc3545';
            } else {
              savingsElement.textContent = 'Same price on both platforms';
              savingsElement.style.color = '#6c757d';
            }
          }
          
          console.log('✅ Price comparison displayed successfully');
        } else {
          console.log('❌ Invalid ZEPP price data');
          sheetPriceElement.textContent = 'Unavailable';
          sheetPriceElement.style.color = '#dc3545';
        }
      }
    } else {
      console.log('❌ Failed to fetch ZEPP price data');
      const sheetPriceElement = document.getElementById('sheetPrice');
      if (sheetPriceElement) {
        sheetPriceElement.textContent = 'Unavailable';
        sheetPriceElement.style.color = '#dc3545';
      }
    }
  } catch (error) {
    console.error('Error showing price comparison:', error);
    const sheetPriceElement = document.getElementById('sheetPrice');
    if (sheetPriceElement) {
      sheetPriceElement.textContent = 'Error loading price';
      sheetPriceElement.style.color = '#dc3545';
    }
  }
}

function showGiftCardSkeleton() {
  const skeleton = document.getElementById('giftCardSkeleton');
  if (skeleton) {
    skeleton.style.display = 'block';
    console.log('🔄 Showing gift card skeleton loader');
  }
}

function hideGiftCardSkeleton() {
  const skeleton = document.getElementById('giftCardSkeleton');
  if (skeleton) {
    skeleton.style.display = 'none';
    console.log('✅ Hiding gift card skeleton loader');
  }
}

function displayGiftCardInPopup(cardData, isAuthenticated = false) {
  console.log('Displaying gift card in popup for authenticated user:', isAuthenticated);

  const giftCardSection = document.getElementById('giftCardSection');
  const giftCardLogo = document.getElementById('giftCardLogo');
  const giftCardTitle = document.getElementById('giftCardTitle');
  const giftCardDesc = document.getElementById('giftCardDesc');
  const giftCardCTA = document.getElementById('giftCardCTA');
  const giftCardDiscount = document.getElementById('giftCardDiscount');
  const giftCardDiscountText = document.getElementById('giftCardDiscountText');
  const closeGiftCard = document.getElementById('closeGiftCard');

  if (!giftCardSection) {
    console.error('Gift card section not found in popup');
    return;
  }

  // Populate data
  if (giftCardLogo) {
    // Use first letter of title as logo
    giftCardLogo.textContent = cardData.title ? cardData.title.charAt(0).toUpperCase() : 'N';
  }
  if (giftCardTitle) giftCardTitle.textContent = cardData.title;
  if (giftCardDesc) {
    // Show different description based on authentication status
    if (isAuthenticated) {
      giftCardDesc.textContent = 'Get 1% extra as cashback';
      giftCardDesc.style.fontWeight = '500';
    } else {
      giftCardDesc.textContent = cardData.desc;
      giftCardDesc.style.fontWeight = ''; // Reset to default
    }
  }
  if (giftCardCTA) {
    giftCardCTA.href = cardData.link;
  }

  // Update discount percentage prominently
  if (giftCardDiscount && cardData.discount) {
    giftCardDiscount.textContent = `${cardData.discount}% OFF`;
    console.log('✨ Discount badge updated:', `${cardData.discount}% OFF`);
  }
  if (giftCardDiscountText && cardData.discount) {
    giftCardDiscountText.textContent = `Save ${cardData.discount}% now with`;
    console.log('✨ Discount text updated:', `Save ${cardData.discount}% now with`);
  }

  // Hide skeleton first
  hideGiftCardSkeleton();

  // Show the gift card section with smooth animation
  giftCardSection.style.display = 'block';

  // Trigger animation after a brief delay
  setTimeout(() => {
    const cardContainer = giftCardSection.querySelector('div');
    if (cardContainer) {
      cardContainer.style.opacity = '1';
      cardContainer.style.transform = 'translateY(0)';
    }
  }, 50);

  // Add event handlers
  if (closeGiftCard) {
    closeGiftCard.addEventListener('click', () => {
      giftCardSection.style.display = 'none';
    });
  }

  if (giftCardCTA) {
    giftCardCTA.addEventListener('mouseenter', () => {
      giftCardCTA.style.transform = 'translateY(-2px)';
      giftCardCTA.style.boxShadow = '0 4px 16px rgba(104, 122, 228, 0.4)';
    });
    giftCardCTA.addEventListener('mouseleave', () => {
      giftCardCTA.style.transform = 'translateY(0)';
      giftCardCTA.style.boxShadow = '0 2px 8px rgba(104, 122, 228, 0.3)';
    });
  }

  console.log('Gift card displayed successfully');
}

// ---- SPA/URL Change Observer ----

let lastUrl = location.href;

function observeUrlChange(callback) {
  const observer = new MutationObserver(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      callback();
    }
  });
  observer.observe(document, { subtree: true, childList: true });

  ['pushState', 'replaceState'].forEach(type => {
    const orig = history[type];
    history[type] = function () {
      const rv = orig.apply(this, arguments);
      window.dispatchEvent(new Event(type));
      return rv;
    };
  });
  window.addEventListener('pushState', () => callback());
  window.addEventListener('replaceState', () => callback());
}

async function checkAuthStatus() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['authData'], (result) => {
      const authData = result.authData;
      resolve(authData && authData.isAuthenticated ? authData : null);
    });
  });
}

function openSettingsModal() {
  // Remove any existing settings modal
  const existingModal = document.getElementById('zepp-settings-modal');
  if (existingModal) {
    existingModal.remove();
  }

  const modal = document.createElement('div');
  modal.id = 'zepp-settings-modal';
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
      
      <div id="settingsContent">
        <div style="margin-bottom: 24px;">
          <label style="display: block; margin-bottom: 8px; color: #333; font-weight: 500;">Logged in as:</label>
          <div id="userEmailDisplay" style="
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
          id="logoutBtn"
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
          id="closeSettingsModal"
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
      
      <div id="settingsMessage" style="
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
  loadUserSettings();

  // Event listeners
  document.getElementById('closeSettingsModal').addEventListener('click', () => {
    modal.remove();
  });

  document.getElementById('logoutBtn').addEventListener('click', handleSettingsLogout);

  // Close modal when clicking outside
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.remove();
    }
  });
}

async function loadUserSettings() {
  const authData = await checkAuthStatus();
  const userEmailDisplay = document.getElementById('userEmailDisplay');

  if (authData && authData.isAuthenticated) {
    userEmailDisplay.textContent = authData.email;
    userEmailDisplay.style.color = '#28a745';
  } else {
    userEmailDisplay.textContent = 'Not logged in';
    userEmailDisplay.style.color = '#dc3545';
    document.getElementById('logoutBtn').disabled = true;
    document.getElementById('logoutBtn').style.background = '#6c757d';
    document.getElementById('logoutBtn').textContent = 'Already logged out';
  }
}

async function handleSettingsLogout() {
  const logoutBtn = document.getElementById('logoutBtn');
  const settingsMessage = document.getElementById('settingsMessage');

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

    showSettingsMessage('Successfully logged out!', 'success');

    setTimeout(() => {
      document.getElementById('zepp-settings-modal').remove();
      // Refresh the page to update UI
      location.reload();
    }, 1500);

  } catch (error) {
    showSettingsMessage('Error logging out. Please try again.', 'error');
    logoutBtn.disabled = false;
    logoutBtn.textContent = 'Logout';
  }
}

function showSettingsMessage(message, type) {
  const messageDiv = document.getElementById('settingsMessage');
  messageDiv.textContent = message;
  messageDiv.style.display = 'block';
  messageDiv.style.backgroundColor = type === 'error' ? '#fee' : '#efe';
  messageDiv.style.color = type === 'error' ? '#c33' : '#363';
  messageDiv.style.border = `1px solid ${type === 'error' ? '#fcc' : '#cfc'}`;
}

// Info Modal Functions
function openInfoModal() {
  // Remove any existing info modal
  const existingModal = document.getElementById('zepp-info-modal');
  if (existingModal) {
    existingModal.remove();
  }

  const modal = document.createElement('div');
  modal.id = 'zepp-info-modal';
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
        <h3 style="color: #242424; font-size: 18px; margin: 0 0 12px 0;">🎯 What does ZEPP Saver do?</h3>
        <p style="color: #555; margin: 0 0 16px 0; line-height: 1.5;">ZEPP Saver automatically compares prices between major e-commerce platforms and ZEPP's student discount platform, helping you save money on every purchase.</p>
      </div>

      <div style="margin-bottom: 24px;">
        <h3 style="color: #242424; font-size: 18px; margin: 0 0 12px 0;">🚀 Key Features</h3>
        <div style="margin-bottom: 16px;">
          <strong style="color: #242424;">💰 Price Comparison</strong>
          <p style="color: #555; margin: 4px 0 0 0; line-height: 1.4;">Compare Amazon, Flipkart, and Nykaa prices with ZEPP's student discounts instantly.</p>
        </div>
        <div style="margin-bottom: 16px;">
          <strong style="color: #242424;">🎓 Student Authentication</strong>
          <p style="color: #555; margin: 4px 0 0 0; line-height: 1.4;">Secure login with your student email to access exclusive discounts.</p>
        </div>
        <div style="margin-bottom: 16px;">
          <strong style="color: #242424;">🎁 Gift Card Offers</strong>
          <p style="color: #555; margin: 4px 0 0 0; line-height: 1.4;">Get additional cashback with platform-specific gift cards.</p>
        </div>
        <div>
          <strong style="color: #242424;">⚡ Smart Notifications</strong>
          <p style="color: #555; margin: 4px 0 0 0; line-height: 1.4;">Automatic popups when better prices are available.</p>
        </div>
      </div>

      <div style="margin-bottom: 24px;">
        <h3 style="color: #242424; font-size: 18px; margin: 0 0 12px 0;">📖 How to Use</h3>
        <div style="background: #f8f9ff; padding: 16px; border-radius: 8px; border-left: 4px solid #687AE4;">
          <ol style="margin: 0; padding-left: 20px; color: #555; line-height: 1.6;">
            <li><strong>Browse</strong> any product on Amazon, Flipkart, or Nykaa</li>
            <li><strong>Look for</strong> the ZEPP Saver popup in the bottom-right corner</li>
            <li><strong>Login</strong> with your student email for exclusive discounts</li>
            <li><strong>Compare</strong> prices and see potential savings</li>
            <li><strong>Click "Save Now"</strong> to shop at the best price</li>
          </ol>
        </div>
      </div>

      <div style="margin-bottom: 24px;">
        <h3 style="color: #242424; font-size: 18px; margin: 0 0 12px 0;">💡 Pro Tips</h3>
        <div style="background: #fff8e1; padding: 16px; border-radius: 8px; border-left: 4px solid #ffa726;">
          <ul style="margin: 0; padding-left: 20px; color: #555; line-height: 1.6;">
            <li><strong>Stay logged in:</strong> Keep your student login active for instant discounts</li>
            <li><strong>Gift cards stack:</strong> Use gift cards on top of existing coupons and discounts</li>
            <li><strong>Payment pages:</strong> Check Nykaa payment pages for additional savings</li>
            <li><strong>Multiple platforms:</strong> Compare across all supported e-commerce sites</li>
          </ul>
        </div>
      </div>

      <div style="margin-bottom: 24px;">
        <h3 style="color: #242424; font-size: 18px; margin: 0 0 12px 0;">🛡️ Privacy & Security</h3>
        <p style="color: #555; margin: 0; line-height: 1.5;">ZEPP Saver only stores your authentication status locally and never shares your personal information. All price comparisons happen securely through ZEPP's servers.</p>
      </div>
      
      <div style="text-align: center; margin-top: 24px;">
        <button 
          id="closeInfoModal"
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
  document.getElementById('closeInfoModal').addEventListener('click', () => {
    modal.remove();
  });

  // Close modal when clicking outside
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.remove();
    }
  });
}

// OTP authentication system removed - using simplified auth check

// Authentication Handler Functions
function setupInlineLoginHandlers() {
  const startLoginBtn = document.getElementById('startLoginBtn');
  const cancelLoginBtn = document.getElementById('cancelLoginBtn');
  const sendOtpBtn = document.getElementById('sendOtpBtn');
  const verifyOtpBtn = document.getElementById('verifyOtpBtn');
  const backToEmailBtn = document.getElementById('backToEmailBtn');

  if (startLoginBtn) {
    startLoginBtn.addEventListener('click', showInlineLoginForm);
  }
  if (cancelLoginBtn) {
    cancelLoginBtn.addEventListener('click', hideInlineLoginForm);
  }
  if (sendOtpBtn) {
    sendOtpBtn.addEventListener('click', handleSendOtp);
  }
  if (verifyOtpBtn) {
    verifyOtpBtn.addEventListener('click', handleVerifyOtp);
  }
  if (backToEmailBtn) {
    backToEmailBtn.addEventListener('click', () => {
      showEmailStep();
    });
  }
}

function showInlineLoginForm() {
  const authPrompt = document.getElementById('authPrompt');
  const loginForm = document.getElementById('loginForm');

  if (authPrompt) authPrompt.style.display = 'none';
  if (loginForm) loginForm.style.display = 'block';

  showEmailStep();
}

function hideInlineLoginForm() {
  const authPrompt = document.getElementById('authPrompt');
  const loginForm = document.getElementById('loginForm');

  if (authPrompt) authPrompt.style.display = 'block';
  if (loginForm) loginForm.style.display = 'none';

  // Clear form
  const emailInput = document.getElementById('studentEmail');
  const otpInput = document.getElementById('otpCode');
  if (emailInput) emailInput.value = '';
  if (otpInput) otpInput.value = '';

  clearInlineLoginMessage();
}

function showEmailStep() {
  const emailStep = document.getElementById('emailStep');
  const otpStep = document.getElementById('otpStep');

  if (emailStep) emailStep.style.display = 'block';
  if (otpStep) otpStep.style.display = 'none';
}

function showOtpStep() {
  const emailStep = document.getElementById('emailStep');
  const otpStep = document.getElementById('otpStep');

  if (emailStep) emailStep.style.display = 'none';
  if (otpStep) otpStep.style.display = 'block';
}

async function handleSendOtp() {
  const emailInput = document.getElementById('studentEmail');
  const email = emailInput.value.trim();
  const messageDiv = document.getElementById('loginMessage');
  const sendBtn = document.getElementById('sendOtpBtn');

  if (!email) {
    showInlineLoginMessage('Please enter your email address', 'error');
    return;
  }

  if (!isValidStudentEmail(email)) {
    showInlineLoginMessage('Please enter a valid email address', 'error');
    return;
  }

  sendBtn.disabled = true;
  sendBtn.textContent = 'Sending...';

  // Send OTP via API
  try {
    const result = await window.authManager.sendOTP(email);

    if (result.success) {
      // Store email securely in chrome storage (not localStorage for security)
      // This will be handled by AuthManager
      showInlineLoginMessage(result.message || 'OTP sent to your email!', 'success');
      showOtpStep();
    } else {
      showInlineLoginMessage(result.error || 'Failed to send OTP', 'error');
    }
  } catch (error) {
    console.error('OTP send error:', error);
    showInlineLoginMessage('Network error. Please try again.', 'error');
  }

  sendBtn.disabled = false;
  sendBtn.textContent = 'Send OTP';
}

async function handleVerifyOtp() {
  const emailInput = document.getElementById('studentEmail');
  const otpInput = document.getElementById('otpCode');
  const email = emailInput.value.trim();
  const otp = otpInput.value.trim();
  const verifyBtn = document.getElementById('verifyOtpBtn');

  if (!otp) {
    showInlineLoginMessage('Please enter the OTP', 'error');
    return;
  }

  verifyBtn.disabled = true;
  verifyBtn.textContent = 'Verifying...';

  // Verify OTP via API
  try {
    const result = await window.authManager.verifyOTP(email, otp);

    if (result.success) {
      // Clean up temp data
      // Email will be managed by AuthManager

      showInlineLoginMessage(result.message || 'Login successful!', 'success');

      setTimeout(() => {
        // Refresh the popup to show prices
        location.reload();
      }, 1500);
    } else {
      showInlineLoginMessage(result.error || 'Invalid OTP', 'error');
    }
  } catch (error) {
    console.error('OTP verification error:', error);
    showInlineLoginMessage('Network error. Please try again.', 'error');
  }

  verifyBtn.disabled = false;
  verifyBtn.textContent = 'Verify & Login';
}

function showInlineLoginMessage(message, type) {
  const messageDiv = document.getElementById('loginMessage');
  if (messageDiv) {
    messageDiv.textContent = message;
    messageDiv.style.display = 'block';
    messageDiv.style.backgroundColor = type === 'error' ? '#fee' : '#efe';
    messageDiv.style.color = type === 'error' ? '#c33' : '#363';
    messageDiv.style.border = `1px solid ${type === 'error' ? '#fcc' : '#cfc'}`;
  }
}

function clearInlineLoginMessage() {
  const messageDiv = document.getElementById('loginMessage');
  if (messageDiv) {
    messageDiv.style.display = 'none';
  }
}

function isValidStudentEmail(email) {
  // Accept any valid email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Helper function to manage Price Section visibility
function updatePriceSectionVisibility(isAuthenticated, zeppPriceAvailable) {
  const priceSection = document.getElementById("priceSection");
  if (priceSection) {
    if (isAuthenticated && zeppPriceAvailable) {
      priceSection.style.display = 'block';
      console.log('✅ Price section shown - user authenticated and ZEPP price available');
    } else {
      priceSection.style.display = 'none';
      console.log('❌ Price section hidden - condition not met:', {
        isAuthenticated,
        zeppPriceAvailable,
        reason: !isAuthenticated ? 'user not authenticated' : 'ZEPP price not available'
      });
    }
  }
}

// -- Entry Point --
observeUrlChange(injectZeppPopup);
injectZeppPopup();
