(function () {
  console.log("Flipkart Cart - ZEPP Saver Running...");

  // Shop Now redirect cache with 30-minute expiry (scoped to avoid conflicts)
  const SHOP_NOW_CACHE_DURATION = 30 * 60 * 1000; // 30 minutes
  const SHOP_NOW_CACHE_PREFIX = 'zepp_shop_redirect_cart_';

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
      const authData = await checkAuthStatus();
      if (!authData || !authData.email) {
        console.error('User email not found');
        return;
      }

      const hasCachedRedirect = getCachedShopRedirect(urlKey, authData.email);

      if (hasCachedRedirect) {
        console.log('🚀 Using cached redirect - opening direct URL');
        const directUrl = `https://zepp.studentpurchaseprogram.com/${urlKey}.html`;
        window.open(directUrl, '_blank');
        return;
      }

      console.log('🔗 Calling login-with-email API for:', authData.email, 'urlKey:', urlKey);

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
            setCachedShopRedirect(urlKey, authData.email);
            window.open(result.loginLink, '_blank');
          } else {
            console.error('❌ Login-with-email failed:', result.error);
            alert('Failed to generate login link. Please try again.');
          }
        } finally {
          ctaBtn.textContent = originalText;
          ctaBtn.style.pointerEvents = 'auto';
        }
      }
    } catch (error) {
      console.error('Error in handleShopNowClick:', error);
      alert('Network error. Please try again.');
    }
  }

  // Authentication status check
  async function checkAuthStatus() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['authData'], (result) => {
        const authData = result.authData;
        resolve(authData && authData.isAuthenticated ? authData : null);
      });
    });
  }

  // Helper function to format price in Indian currency format
  function formatIndianCurrency(amount) {
    if (!amount || isNaN(amount)) return 'Unavailable';

    const numStr = Math.round(amount).toString();
    let result = '';
    let count = 0;

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

  async function getZeppPrice(fsn) {
    try {
      const res = await fetch(`http://localhost:3000/api/price?id_type=fsn&id_value=${fsn}`);
      const data = await res.json();
      if (data.items && data.items.length > 0) {
        const splpriceAttr = data.items[0].custom_attributes?.find(attr => attr.attribute_code === "special_price");
        const surchargeAttr = data.items[0].custom_attributes?.find(attr => attr.attribute_code === "productsurcharge_fee");
        const urlAttr = data.items[0].custom_attributes?.find(attr => attr.attribute_code === "url_key");

        const splprice = splpriceAttr ? parseFloat(splpriceAttr.value) : 0;
        const surcharge = surchargeAttr ? parseFloat(surchargeAttr.value) : 0;
        const finalPrice = splprice + surcharge;

        return {
          finalPrice,
          title: data.items[0].name,
          urlKey: urlAttr ? urlAttr.value : null
        };
      }
    } catch (e) {
      console.warn('ZEPP API error for', fsn, e);
    }
    return null;
  }

  async function extractAndShowPopup(productElements) {
    const items = [];

    for (const productEl of productElements) {
      const anchor = productEl.querySelector('a[href*="pid="]');
      if (!anchor) continue;

      try {
        const url = new URL(anchor.getAttribute('href'), window.location.origin);
        const pid = url.searchParams.get('pid');
        const titleEl = productEl.querySelector('.T2CNXf.QqLTQ-');

        const title = titleEl ? titleEl.textContent.trim() : 'Unknown';
        let price = null;
        const priceEl = productEl.querySelector('.LAlF6k.re6bBo');
        if (priceEl) {
          const raw = priceEl.textContent.replace(/[^\d]/g, '');
          price = raw ? parseInt(raw, 10) : null;
        }

        // Get Zepp Price async for this pid
        const zeppData = await getZeppPrice(pid);
        const zeppPrice = zeppData ? zeppData.finalPrice : null;

        // Calculate savings if both prices exist and are numbers
        let savings = null;
        if (typeof price === 'number' && typeof zeppPrice === 'number') {
          savings = Math.max(0, price - zeppPrice);
        }

        console.log(`Extracted - PID: ${pid}, Title: "${title}", Price: ${price}, Savings: ${savings}`);
        items.push({
          pid,
          title,
          price,
          zeppPrice,
          savings,
          urlKey: zeppData ? zeppData.urlKey : null
        });
      } catch (e) {
        console.warn("Could not parse product info:", e);
      }
    }

    // Filter only products with Zepp price
    const itemsWithZeppPrice = items.filter(i => i.zeppPrice !== null);

    if (itemsWithZeppPrice.length > 0) {
      await showCartPopup(itemsWithZeppPrice);
    } else {
      console.log("No products with Zepp price found on this Flipkart cart page.");
    }
  }

  async function showCartPopup(results) {
    // Remove old popups
    document.querySelectorAll('.zepp-extension-popup').forEach(el => el.remove());
    document.querySelectorAll('[zepp-trigger-icon]').forEach(el => el.remove());

    if (results.length === 0) {
      console.log('No products with ZEPP price to display.');
      return;
    }

    // Check authentication status
    const authData = await checkAuthStatus();
    const isAuthenticated = authData && authData.isAuthenticated;

    // Calculate total savings
    const totalSavings = results.reduce((sum, item) => sum + (item.savings || 0), 0);

    // Font style
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

    // Create popup
    const popup = document.createElement('div');
    popup.classList.add('zepp-extension-popup');
    popup.style.position = 'fixed';
    popup.style.bottom = '5%';
    popup.style.right = '80px';
    popup.style.zIndex = '9999';
    popup.style.background = 'linear-gradient(to bottom right, rgba(255, 255, 255, 1), rgba(255, 255, 255, 1))';
    popup.style.backdropFilter = 'blur(35px)';
    popup.style.border = '1px solid rgba(255,255,255,0.2)';
    popup.style.borderRadius = '12px';
    popup.style.boxShadow = '0 8px 32px rgba(0,0,0,0.25)';
    popup.style.width = '300px';
    popup.style.maxHeight = '80vh';
    popup.style.overflowY = 'auto';
    popup.style.transition = 'all 0.3s ease';
    popup.style.opacity = '0';
    popup.style.transform = 'translateY(-10px)';

    popup.innerHTML = `
      <!-- Header Section with White Background -->
      <div style="background: #ffffff; color: black; padding: 16px 20px; border-radius: 12px 12px 0 0;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
              <div style="font-weight: 600; font-size: 16px;">
                  ZEPP Saver
              </div>
              <div style="display: flex; align-items: center; filter: invert(1)">
                  <img id="settingsicon" style="height: 20px; margin-left: 10px; cursor: pointer;" />
                  <button id="closeAutoPopup" style="background: none; border: none; font-size: 18px; cursor: pointer; color: #ffffff; margin-left: 10px;">✕</button>
              </div>
          </div>
      </div>

      <!-- Content Area -->
      <div style="background: #ffffff; padding-top: 16px; border-radius: 0 0 12px 12px;">
          
          <!-- Cart Items Section -->
          <div id="cartItemsSection">
              <div style="margin-bottom: 16px; color: #666; font-size: 14px; text-align: center;">
                  ${results.length} item${results.length > 1 ? 's' : ''} with ZEPP discounts available
              </div>
              
              <div style="display: flex; flex-direction: column; gap: 12px; margin-bottom: 16px;">
                  ${results.map(item => `
                      <div style="background: white; border-radius: 8px; margin: 0 16px; padding: 12px; border: 1px solid #ddd;">
                          <div style="font-weight: 600; font-size: 14px; margin-bottom: 8px; color: #333; line-height: 1.3; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
                              ${item.title || item.pid}
                          </div>
                          
                          <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-bottom: 10px">
                              <div style="text-left: center; flex: 1;">
                                  <div style="font-size: 14px; color: #666; margin-bottom: 2px;">Flipkart Price</div>
                                  <div style="font-weight: 600; color: #333; font-size: 16px;">${item.price ? formatIndianCurrency(item.price) : 'N/A'}</div>
                              </div>
                              <div style="text-align: left; flex: 1;">
                                  <div style="font-size: 14px; color: #666; margin-bottom: 2px;">ZEPP Price</div>
                                  <div style="font-weight: 600; color: #333; font-size: 16px;">${formatIndianCurrency(item.zeppPrice)}</div>
                              </div>
                            </div>
                              
                            <div style="text-align: center; flex: 1;">
                                ${isAuthenticated && item.urlKey ? `
                                    <div class="shop-now-btn" data-url-key="${item.urlKey}" style="
                                        background: #4755A5;
                                        color: white;
                                        padding: 12px 16px;
                                        border-radius: 100px;
                                        font-size: 14px;
                                        font-weight: 600;
                                        margin-bottom: 2px;
                                        cursor: pointer;
                                        width: 100%;
                                        text-decoration: none;
                                    ">
                                        Save ${formatIndianCurrency(item.savings)}
                                    </div>
                                ` : `
                                    <div style="
                                        background: #4755A5;
                                        color: white;
                                        padding: 4px 8px;
                                        border-radius: 4px;
                                        font-size: 14px;
                                        font-weight: 600;
                                        margin-bottom: 2px;
                                        width: 100%;
                                        border-radius: 100px;
                                    ">
                                        Save ${formatIndianCurrency(item.savings)}
                                    </div>
                                `}
                            </div>

                          </div>
                      </div>
                  `).join('')}
              </div>
              
              <!-- Total Savings -->
              <div style="padding: 12px; text-align: center; background: rgba(50, 112, 166, 0.1)">
                  <div style="font-size: 14px; margin-bottom: 4px; color: #333;">Total Potential Savings</div>
                  <div style="font-size: 20px; font-weight: 700; color: #333;">${formatIndianCurrency(totalSavings)}</div>
              </div>
          </div>

          <!-- Authentication Section -->
          <div id="authSection" style="display: ${isAuthenticated ? 'none' : 'block'}; margin-top: 16px;">
              <div style="background: #f8f9fa; border-radius: 8px; padding: 16px; text-align: center; border: 1px solid #e9ecef;">
                  <div style="font-size: 14px; color: #666; margin-bottom: 12px;">
                      Login to access Shop Now buttons and personalized deals
                  </div>
                  <div style="font-size: 12px; color: #999;">
                      Visit any Flipkart product page to login with ZEPP Saver
                  </div>
              </div>
          </div>
      </div>
  `;

    // Floating trigger icon
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
    triggerIcon.innerHTML = `<img src="${chrome.runtime.getURL('icon.png')}" style="width: 24px; height: 24px;" alt="ZEPP" />`;

    // Append to document
    document.body.appendChild(popup);
    document.body.appendChild(triggerIcon);

    // Set settings icon
    document.getElementById('settingsicon').src = chrome.runtime.getURL('settings.svg');

    // Event listeners
    document.getElementById('closeAutoPopup').addEventListener('click', () => {
      popup.style.opacity = '0';
      popup.style.transform = 'translateY(10px)';
      setTimeout(() => {
        popup.style.display = 'none';
        triggerIcon.style.opacity = '1';
      }, 300);
    });

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

    // Shop Now button handlers
    document.querySelectorAll('.shop-now-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const urlKey = btn.dataset.urlKey;
        if (urlKey) {
          await handleShopNowClick(urlKey);
        }
      });
    });

    // Show popup
    popup.style.display = 'block';
    setTimeout(() => {
      popup.style.opacity = '1';
      popup.style.transform = 'translateY(0)';
    }, 50);
  }

  function waitForProductElements(timeout = 10000) {
    return new Promise((resolve, reject) => {
      const start = Date.now();

      const observer = new MutationObserver((mutations, obs) => {
        const products = document.querySelectorAll('.eGXlor.pk3Guc');
        if (products.length > 0) {
          console.log(`Detected ${products.length} product elements`);
          obs.disconnect();
          resolve(products);
        } else if (Date.now() - start > timeout) {
          obs.disconnect();
          reject(new Error('Timeout waiting for product elements'));
        }
      });

      observer.observe(document.body, { childList: true, subtree: true });

      // Initial check in case elements already exist
      const initialProducts = document.querySelectorAll('.eGXlor.pk3Guc');
      if (initialProducts.length > 0) {
        observer.disconnect();
        resolve(initialProducts);
      }
    });
  }

  window.onload = () => {
    // Run only if URL is flipkart cart page
    if (!location.href.includes('flipkart.com/viewcart?')) {
      console.log('Not a Flipkart cart page; script not running.');
      return;
    }

    waitForProductElements()
      .then(async productElements => {
        await extractAndShowPopup(productElements);
      })
      .catch(async err => {
        console.warn('Error or timeout waiting for product elements:', err);
        const fallbackProducts = document.querySelectorAll('.eGXlor.pk3Guc');
        if (fallbackProducts.length > 0) {
          await extractAndShowPopup(fallbackProducts);
        }
      });
  };

})(); // End of IIFE to avoid variable conflicts