/**
 * @file Content script for a Chrome extension.
 * Injects a toggleable gift card popup in the bottom-right corner if the backend returns card data for the current domain.
 */

// Your backend API endpoint that reads Google Sheet via server.js
const API_URL = 'https://localhost:3000/giftcard';

// Gift card cache with 5-minute expiry using localStorage
const GC_CACHE_DURATION = 2 * 60 * 1000; // 2 minutes
const GC_CACHE_PREFIX = 'zepp_gc_';

function getCachedGiftCard(domain) {
    try {
        const cacheKey = GC_CACHE_PREFIX + domain;
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
            const parsedCache = JSON.parse(cached);
            if (parsedCache && (Date.now() - parsedCache.timestamp) < GC_CACHE_DURATION) {
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
        const cacheKey = GC_CACHE_PREFIX + domain;
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

/**
 * Normalizes a hostname by removing the 'www.' prefix.
 * @param {string} hostname - The hostname from window.location.
 * @returns {string} The normalized hostname.
 */
function normalizeDomain(hostname) {
    return hostname.replace(/^www\./, '').toLowerCase();
}

/**
 * Fetches cardData from the backend for the current domain and injects the UI if data is available.
 */
async function injectGiftCardBanner() {
    const domain = normalizeDomain(window.location.hostname);
    
    // Check if ZEPP content scripts are already running on supported domains
    const supportedDomains = ['amazon.in', 'flipkart.com', 'nykaa.com'];
    if (supportedDomains.includes(domain)) {
        console.log(`ZEPP content script handles gift cards for ${domain}, skipping gc.js popup`);
        return;
    }
    
    let cardData = null;

    // Check cache first
    cardData = getCachedGiftCard(domain);
    let isFromCache = false;
    
    // Debug cache status
    console.log('🔍 Cache check for domain:', domain);
    console.log('🔍 Cache result:', cardData ? 'HIT' : 'MISS');

    if (!cardData) {
        // Fetch from the backend instead of a static map
        try {
            console.log('🚀 Fetching gift card data from API for:', domain);
            const resp = await fetch(`${API_URL}?domain=${encodeURIComponent(domain)}`);
            if (!resp.ok) {
                console.log(`No gift card offer for domain: ${domain} (Status: ${resp.status})`);
                return;
            }
            cardData = await resp.json();
            if (!cardData || cardData.error) {
                console.log(`No gift card data returned or error received for domain: ${domain}`);
                return;
            }
            
            // Cache the successful response
            setCachedGiftCard(domain, cardData);
            console.log('🎁 Gift card data fetched and cached successfully for:', domain);
            isFromCache = false;
        } catch (err) {
            console.error("Failed to fetch gift card data:", err);
            return;
        }
    } else {
        console.log('⚡ Using cached gift card data for faster loading:', domain);
        isFromCache = true;
    }

    // Remove any existing popup container to prevent duplicates.
    const existingContainer = document.getElementById('zepp-gc-container');
    if (existingContainer) {
        existingContainer.remove();
    }

    // --- All style/UI code below is updated with the new design (matching content.js) ---
    const styles = `
        @font-face {
            font-family: 'Funnel Display';
            src: url('${chrome.runtime.getURL('FunnelDisplay.ttf')}') format('truetype');
            font-weight: normal;
            font-style: normal;
        }
        .zepp-gc-popup * {
            font-family: 'Funnel Display', sans-serif !important;
        }
        @keyframes shimmer {
            0% { background-position: -200% 0; }
            100% { background-position: 200% 0; }
        }
        #zepp-gc-container {
            position: fixed;
            bottom: 20px;
            right: 20px;
            z-index: 99998;
            font-family: 'Funnel Display', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        }
        #zepp-gc-toggle-btn {
            width: 60px;
            height: 60px;
            background: #242424;
            border-radius: 50%;
            border: none;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 15px rgba(0,0,0,0.2);
            transition: transform 0.2s ease;
        }
        #zepp-gc-toggle-btn:hover {
            transform: scale(1.1);
        }
        .zepp-gc-popup {
            position: fixed;
            bottom: 5%;
            right: 80px;
            z-index: 9999;
            background: linear-gradient(to bottom right, rgba(255, 255, 255, 0.2), rgba(255, 255, 255, 0.2));
            backdrop-filter: blur(35px);
            border: 1px solid rgba(255,255,255,0.2);
            border-radius: 12px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.25);
            width: 350px;
            transition: all 0.3s ease;
            opacity: 0;
            overflow: hidden;
            transform: translateY(-10px);
            display: none;
        }
        .zepp-gc-popup.visible {
            opacity: 1;
            transform: translateY(0);
            display: block;
        }
    `;
    const styleSheet = document.createElement("style");
    styleSheet.type = "text/css";
    styleSheet.innerText = styles;
    document.head.appendChild(styleSheet);

    // Create the popup container and its contents
    const container = document.createElement('div');
    container.id = 'zepp-gc-container';

    container.innerHTML = `
        <!-- The Gift Card Popup (matching content.js style) -->
        <div class="zepp-gc-popup" id="zepp-gc-popup">
            <!-- Header Section with Dark Background -->
            <div style="background: #242424; color: white; padding: 16px 20px; border-radius: 12px 12px 0 0;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div style="font-weight: 600; font-size: 16px;">
                        Zepp Saver
                    </div>
                    <div style="display: flex; align-items: center;">
                        <img id="gcInfoIcon" style="height: 20px; margin-left: 10px; cursor: pointer;" />
                        <img id="gcSettingsIcon" style="height: 20px; margin-left: 10px; cursor: pointer;" />
                        <button id="zepp-gc-close-popup" style="background: none; border: none; font-size: 18px; cursor: pointer; color: #ffffff; margin-left: 10px;">✕</button>
                    </div>
                </div>
            </div>

            <!-- Content Area with Light Gray Background -->
            <div style="background: #ffffffff; padding: 10px; border-radius: 0 0 12px 12px;">
              
              <!-- Gift Card Skeleton Loader -->
              <div id="giftCardSkeleton" style="display: none; margin-bottom: 16px;">
                <div style="
                  background: white;
                  border-radius: 12px;
                  padding: 20px;
                  position: relative;
                ">
                  <div style="text-align: center;">
                    <!-- Skeleton Discount Text -->
                    <div style="
                      background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
                      background-size: 200% 100%;
                      animation: shimmer 1.5s infinite;
                      height: 30px;
                      width: 120px;
                      border-radius: 25px;
                      margin: 0 auto 12px auto;
                    "></div>
                    
                    <!-- Skeleton Title -->
                    <div style="
                      background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
                      background-size: 200% 100%;
                      animation: shimmer 1.5s infinite;
                      height: 20px;
                      width: 150px;
                      border-radius: 4px;
                      margin: 0 auto 8px auto;
                    "></div>
                    
                    <!-- Skeleton Description -->
                    <div style="
                      background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
                      background-size: 200% 100%;
                      animation: shimmer 1.5s infinite;
                      height: 16px;
                      width: 200px;
                      border-radius: 4px;
                      margin: 0 auto 20px auto;
                    "></div>
                    
                    <!-- Skeleton Button -->
                    <div style="
                      background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
                      background-size: 200% 100%;
                      animation: shimmer 1.5s infinite;
                      height: 40px;
                      width: 120px;
                      border-radius: 8px;
                      margin: 0 auto;
                    "></div>
                  </div>
                </div>
              </div>
              
              <!-- Gift Card Section with White Background and Logo -->
              <div id="giftCardSection" style="display: none; margin-bottom: 16px;">
                <div style="
                  background: white;
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
                      background: linear-gradient(135deg, #687AE4 0%, #7c8ce8 100%);
                      color: white;
                      padding: 8px 16px;
                      border-radius: 25px;
                      font-size: 14px;
                      font-weight: 700;
                      margin-bottom: 12px;
                      display: inline-block;
                      box-shadow: 0 2px 8px rgba(104, 122, 228, 0.3);
                    ">
                      <span id="giftCardDiscountText">Save 25% now with</span>
                    </div>
                    
                    <h3 id="giftCardTitle" style="
                      font-size: 18px; 
                      font-weight: 700; 
                      color: #333;
                      margin: 0 0 8px 0;
                    ">Gift Cards</h3>
                    
                    <p id="giftCardDesc" style="
                      color: #666; 
                      margin: 0 0 20px 0; 
                      font-size: 14px;
                      line-height: 1.4;
                    ">Get instant discounts on your purchases</p>
                    
                    <a id="giftCardCTA" href="#" target="_blank" style="
                      display: inline-block;
                      background: linear-gradient(135deg, #687AE4 0%, #5a6fd8 100%);
                      color: white;
                      text-decoration: none;
                      padding: 12px 24px;
                      border-radius: 8px;
                      font-size: 14px;
                      font-weight: 600;
                      transition: all 0.3s ease;
                      box-shadow: 0 2px 8px rgba(104, 122, 228, 0.3);
                    ">Get your Gift Card</a>
                    
                    <!-- Gift Card Disclaimer -->
                    <div style="
                      margin-top: 16px;
                      padding: 10px 12px;
                      background: #fff3cd;
                      border-radius: 6px;
                      border: 1px solid #ffeaa7;
                    ">
                      <p style="
                        font-size: 12px;
                        color: #856404;
                        margin: 0;
                        line-height: 1.3;
                        text-align: center;
                        font-weight: 600;
                      ">
                        💡 Applied on top of all coupons & discounts
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
        </div>

        <!-- The Toggle Button -->
        <button id="zepp-gc-toggle-btn" aria-label="Show gift card offer">
          <img id="zeppIcon" style="height: 24px;" />
        </button>
    `;

    // Append to body
    document.body.appendChild(container);

    // Get references to the new elements
    const toggleButton = document.getElementById('zepp-gc-toggle-btn');
    const popupElement = document.getElementById('zepp-gc-popup');
    const closeButton = document.getElementById('zepp-gc-close-popup');
    const giftCardSection = document.getElementById('giftCardSection');
    const giftCardSkeleton = document.getElementById('giftCardSkeleton');
    const giftCardCTA = document.getElementById('giftCardCTA');

    // Load icons
    document.getElementById('zeppIcon').src = chrome.runtime.getURL('icon.png');
    document.getElementById('gcInfoIcon').src = chrome.runtime.getURL('info.svg');

    // Get button references
    const infoButton = document.getElementById('gcInfoIcon');

    // Check authentication status for gift card description
    const authData = await checkGcAuthStatus();
    const isAuthenticated = authData && authData.isAuthenticated;
    
    // Add settings icon click handler
    document.getElementById('gcSettingsIcon').src = chrome.runtime.getURL('settings.svg');
    document.getElementById('gcSettingsIcon').addEventListener('click', () => {
        openGcSettingsModal();
    });
    
    // Show gift card skeleton first (only if fetching from API)
    if (!isFromCache) {
        giftCardSkeleton.style.display = 'block';
        console.log('🔄 Showing skeleton loader while fetching from API...');
    }
    popupElement.classList.add('visible');
    
    // Function to update gift card content
    const updateGiftCardContent = () => {
        // Update gift card content with actual data
        const giftCardLogo = document.getElementById('giftCardLogo');
        const giftCardDiscountText = document.getElementById('giftCardDiscountText');
        const giftCardTitle = document.getElementById('giftCardTitle');
        const giftCardDesc = document.getElementById('giftCardDesc');
        const giftCardCTALink = document.getElementById('giftCardCTA');
        
        if (giftCardLogo) giftCardLogo.textContent = cardData.title.charAt(0).toUpperCase();
        if (giftCardDiscountText) giftCardDiscountText.textContent = `Save ${cardData.discount}% now with`;
        if (giftCardTitle) giftCardTitle.textContent = cardData.title;
        
        // Update description based on authentication status
        if (giftCardDesc) {
            if (isAuthenticated) {
                giftCardDesc.textContent = 'Get 1% extra as cashback';
            } else {
                giftCardDesc.textContent = cardData.desc;
            }
        }
        
        if (giftCardCTALink) {
            giftCardCTALink.textContent = cardData.cta;
            giftCardCTALink.href = cardData.link;
        }
    };
    
    // Hide skeleton and show actual gift card content
    if (isFromCache) {
        // Cached data: Show immediately with minimal delay
        console.log('⚡ Displaying cached gift card content immediately');
        giftCardSkeleton.style.display = 'none';
        updateGiftCardContent();
        
        // Show gift card section with animation
        giftCardSection.style.display = 'block';
        setTimeout(() => {
            const cardContainer = giftCardSection.querySelector('div');
            if (cardContainer) {
                cardContainer.style.opacity = '1';
                cardContainer.style.transform = 'translateY(0)';
            }
        }, 50);
    } else {
        // API data: Show immediately after fetch
        console.log('🔄 API data loaded - displaying immediately');
        giftCardSkeleton.style.display = 'none';
        updateGiftCardContent();
        
        // Show gift card section with animation
        giftCardSection.style.display = 'block';
        setTimeout(() => {
            const cardContainer = giftCardSection.querySelector('div');
            if (cardContainer) {
                cardContainer.style.opacity = '1';
                cardContainer.style.transform = 'translateY(0)';
            }
        }, 50);
    }

    // Add hover effects to CTA button
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

    // Add event listeners for toggling visibility
    toggleButton.onclick = () => {
        if (popupElement.classList.contains('visible')) {
            popupElement.classList.remove('visible');
            setTimeout(() => {
                popupElement.style.display = 'none';
            }, 300);
        } else {
            popupElement.style.display = 'block';
            setTimeout(() => {
                popupElement.classList.add('visible');
            }, 10);
        }
    };
    
    closeButton.onclick = () => {
        popupElement.classList.remove('visible');
        setTimeout(() => {
            popupElement.style.display = 'none';
        }, 300);
    };
    
    // Settings handling moved to authentication-based icon loading above
    
    // Info functionality moved to popup.html - no click handler needed
    infoButton.style.cursor = 'default';
}

/**
 * Sets up a MutationObserver to detect URL changes in SPAs.
 */
function observeUrlChanges() {
    let lastHref = location.href;
    const observer = new MutationObserver(() => {
        if (location.href !== lastHref) {
            lastHref = location.href;
            injectGiftCardBanner();
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

// Authentication and Settings Functions for gc.js
async function checkGcAuthStatus() {
    return new Promise((resolve) => {
        chrome.storage.local.get(['authData'], (result) => {
            const authData = result.authData;
            resolve(authData && authData.isAuthenticated ? authData : null);
        });
    });
}

function openGcSettingsModal() {
    // Remove any existing settings modal
    const existingModal = document.getElementById('zepp-gc-settings-modal');
    if (existingModal) {
        existingModal.remove();
    }

    const modal = document.createElement('div');
    modal.id = 'zepp-gc-settings-modal';
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
            
            <div id="gcSettingsContent">
                <div style="margin-bottom: 24px;">
                    <label style="display: block; margin-bottom: 8px; color: #333; font-weight: 500;">Logged in as:</label>
                    <div id="gcUserEmailDisplay" style="
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
                    id="gcLogoutBtn"
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
                    id="closeGcSettingsModal"
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
            
            <div id="gcSettingsMessage" style="
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
    loadGcUserSettings();

    // Event listeners
    document.getElementById('closeGcSettingsModal').addEventListener('click', () => {
        modal.remove();
    });

    document.getElementById('gcLogoutBtn').addEventListener('click', handleGcSettingsLogout);

    // Close modal when clicking outside
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

async function loadGcUserSettings() {
    const authData = await checkGcAuthStatus();
    const userEmailDisplay = document.getElementById('gcUserEmailDisplay');

    if (authData && authData.isAuthenticated) {
        userEmailDisplay.textContent = authData.email;
        userEmailDisplay.style.color = '#28a745';
    } else {
        userEmailDisplay.textContent = 'Not logged in';
        userEmailDisplay.style.color = '#dc3545';
        document.getElementById('gcLogoutBtn').disabled = true;
        document.getElementById('gcLogoutBtn').style.background = '#6c757d';
        document.getElementById('gcLogoutBtn').textContent = 'Already logged out';
    }
}

async function handleGcSettingsLogout() {
    const logoutBtn = document.getElementById('gcLogoutBtn');
    const settingsMessage = document.getElementById('gcSettingsMessage');

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

        showGcSettingsMessage('Successfully logged out!', 'success');

        setTimeout(() => {
            document.getElementById('zepp-gc-settings-modal').remove();
            // Refresh the page to update UI
            location.reload();
        }, 1500);

    } catch (error) {
        showGcSettingsMessage('Error logging out. Please try again.', 'error');
        logoutBtn.disabled = false;
        logoutBtn.textContent = 'Logout';
    }
}

function showGcSettingsMessage(message, type) {
    const messageDiv = document.getElementById('gcSettingsMessage');
    messageDiv.textContent = message;
    messageDiv.style.display = 'block';
    messageDiv.style.backgroundColor = type === 'error' ? '#fee' : '#efe';
    messageDiv.style.color = type === 'error' ? '#c33' : '#363';
    messageDiv.style.border = `1px solid ${type === 'error' ? '#fcc' : '#cfc'}`;
}

// Info Modal Functions for GC
function openGcInfoModal() {
    // Remove any existing info modal
    const existingModal = document.getElementById('zepp-gc-info-modal');
    if (existingModal) {
        existingModal.remove();
    }

    const modal = document.createElement('div');
    modal.id = 'zepp-gc-info-modal';
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
                <h3 style="color: #242424; font-size: 18px; margin: 0 0 12px 0;">🎁 Universal Gift Card System</h3>
                <p style="color: #555; margin: 0 0 16px 0; line-height: 1.5;">On websites not directly supported by ZEPP, our universal gift card system helps you save money with platform-specific gift cards and exclusive offers.</p>
            </div>

            <div style="margin-bottom: 24px;">
                <h3 style="color: #242424; font-size: 18px; margin: 0 0 12px 0;">🚀 Key Features</h3>
                <div style="margin-bottom: 16px;">
                    <strong style="color: #242424;">🎁 Smart Gift Card Detection</strong>
                    <p style="color: #555; margin: 4px 0 0 0; line-height: 1.4;">Automatically detects supported websites and shows relevant gift card offers.</p>
                </div>
                <div style="margin-bottom: 16px;">
                    <strong style="color: #242424;">🎓 Student Benefits</strong>
                    <p style="color: #555; margin: 4px 0 0 0; line-height: 1.4;">Extra 1% cashback for verified student accounts.</p>
                </div>
                <div style="margin-bottom: 16px;">
                    <strong style="color: #242424;">⚡ Fast Loading</strong>
                    <p style="color: #555; margin: 4px 0 0 0; line-height: 1.4;">Cached gift card data for instant loading on repeat visits.</p>
                </div>
                <div>
                    <strong style="color: #242424;">💰 Stackable Savings</strong>
                    <p style="color: #555; margin: 4px 0 0 0; line-height: 1.4;">Gift cards work on top of existing coupons and promotions.</p>
                </div>
            </div>

            <div style="margin-bottom: 24px;">
                <h3 style="color: #242424; font-size: 18px; margin: 0 0 12px 0;">📖 How to Use</h3>
                <div style="background: #f8f9ff; padding: 16px; border-radius: 8px; border-left: 4px solid #687AE4;">
                    <ol style="margin: 0; padding-left: 20px; color: #555; line-height: 1.6;">
                        <li><strong>Visit</strong> any supported e-commerce website</li>
                        <li><strong>Look for</strong> the ZEPP Saver icon in the bottom-right corner</li>
                        <li><strong>Click the icon</strong> to see available gift card offers</li>
                        <li><strong>Login</strong> with your student email for extra cashback</li>
                        <li><strong>Purchase gift cards</strong> and apply them during checkout</li>
                    </ol>
                </div>
            </div>

            <div style="margin-bottom: 24px;">
                <h3 style="color: #242424; font-size: 18px; margin: 0 0 12px 0;">💡 Pro Tips</h3>
                <div style="background: #fff8e1; padding: 16px; border-radius: 8px; border-left: 4px solid #ffa726;">
                    <ul style="margin: 0; padding-left: 20px; color: #555; line-height: 1.6;">
                        <li><strong>Universal coverage:</strong> Works on hundreds of e-commerce websites</li>
                        <li><strong>Best discounts first:</strong> Higher percentage offers are prioritized</li>
                        <li><strong>Student exclusive:</strong> Login for additional cashback opportunities</li>
                        <li><strong>No conflicts:</strong> Gift cards don't interfere with site-specific price comparisons</li>
                    </ul>
                </div>
            </div>

            <div style="margin-bottom: 24px;">
                <h3 style="color: #242424; font-size: 18px; margin: 0 0 12px 0;">🛡️ Privacy & Security</h3>
                <p style="color: #555; margin: 0; line-height: 1.5;">ZEPP Saver only detects the website domain to show relevant offers. No browsing data or personal information is transmitted to external servers.</p>
            </div>
            
            <div style="text-align: center; margin-top: 24px;">
                <button 
                    id="closeGcInfoModal"
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
    document.getElementById('closeGcInfoModal').addEventListener('click', () => {
        modal.remove();
    });

    // Close modal when clicking outside
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

// Initial execution and observer setup.
injectGiftCardBanner();
observeUrlChanges();
