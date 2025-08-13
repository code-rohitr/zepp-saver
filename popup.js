document.addEventListener("DOMContentLoaded", async () => {
  console.log('Popup loaded, DOM ready');
  
  // Setup tab navigation
  setupTabNavigation();
  
  // Check authentication status first
  const authData = await getAuthData();
  const isAuthenticated = authData && authData.isAuthenticated;

  // Always show test gift card first
  showTestGiftCard();

  // Load gift card data for current tab
  await loadGiftCardData();

  // Update UI based on authentication status
  updateAuthUI(isAuthenticated, authData);

  if (isAuthenticated) {
    // If authenticated, load price comparison
    loadPriceComparison();
  } else {
    // Setup login handlers
    setupLoginHandlers();
  }
});

async function getAuthData() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['authData'], (result) => {
      resolve(result.authData || null);
    });
  });
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

// Helper function to update the Shop Now button visibility in popup
function updateShopNowButtonVisibility(isAuthenticated, zeppPriceAvailable) {
  const ctaBtn = document.getElementById("ctaBtn");
  if (ctaBtn) {
    if (isAuthenticated && zeppPriceAvailable) {
      ctaBtn.style.display = 'flex';
      console.log('✅ Shop Now button shown in popup - both conditions met');
    } else {
      ctaBtn.style.display = 'none';
      console.log('❌ Shop Now button hidden in popup - missing condition:', {
        isAuthenticated,
        zeppPriceAvailable
      });
    }
  }
}

function updateAuthUI(isAuthenticated, authData) {
  const priceSection = document.getElementById("priceSection");
  const authPrompt = document.getElementById("authPrompt");
  const loginForm = document.getElementById("loginForm");
  const userInfo = document.getElementById("userInfo");

  // Initially hide the button until we verify ZEPP price availability
  updateShopNowButtonVisibility(isAuthenticated, false);

  if (isAuthenticated) {
    if (priceSection) priceSection.style.display = "block";
    if (authPrompt) authPrompt.style.display = "none";
    if (loginForm) loginForm.style.display = "none";
    if (userInfo) {
      userInfo.style.display = "block";
      userInfo.innerHTML = `
        <div style="text-align: center; padding: 10px; background: #f8f9fa; border-radius: 8px; margin-bottom: 16px;">
          <div style="font-size: 14px; color: #28a745; font-weight: 600;">✓ Verified Student</div>
          <div style="font-size: 12px; color: #666;">${authData.email}</div>
          <button id="logoutBtn" style="
            background: none; 
            border: none; 
            color: #687AE4; 
            cursor: pointer; 
            font-size: 12px; 
            text-decoration: underline;
            margin-top: 4px;
          ">Logout</button>
        </div>
      `;
      
      document.getElementById("logoutBtn").addEventListener('click', handleLogout);
    }
  } else {
    if (priceSection) priceSection.style.display = "none";
    if (authPrompt) authPrompt.style.display = "block";
    if (loginForm) loginForm.style.display = "none";
    if (userInfo) userInfo.style.display = "none";
  }
}

function loadPriceComparison() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.tabs.sendMessage(tabs[0].id, { type: "GET_PRICE_INFO" }, (response) => {
      if (!response) return;

      let { amazonPrice, asin } = response;

      const amazonPriceElem = document.getElementById("amazonPrice");
      const sheetPriceElem = document.getElementById("sheetPrice");
      const savingsElem = document.getElementById("savings");

      // Set Amazon price
      if (amazonPrice && amazonPriceElem) {
        amazonPriceElem.innerText = formatIndianCurrency(amazonPrice);
      } else if (amazonPriceElem) {
        amazonPriceElem.innerText = "Unavailable";
      }

      if (!asin) {
        if (sheetPriceElem) sheetPriceElem.innerText = "No ASIN";
        // No ASIN, so no ZEPP price available
        updateShopNowButtonVisibility(true, false);
        return;
      }

      // Use the new API endpoint to check ZEPP price availability
      fetch(`https://localhost:3000/api/price?id_type=asn&id_value=${asin}`)
        .then(res => res.json())
        .then(data => {
          let zeppPriceAvailable = false;
          let sheetPrice = null;
          
          if (data.items && data.items.length > 0) {
            const splpriceAttr = data.items[0].custom_attributes?.find(attr => attr.attribute_code === "special_price");
            const surchargeAttr = data.items[0].custom_attributes?.find(attr => attr.attribute_code === "productsurcharge_fee");
            const splprice = splpriceAttr ? parseFloat(splpriceAttr.value) : 0;
            const surcharge = surchargeAttr ? parseFloat(surchargeAttr.value) : 0;
            const finalPrice = splprice + surcharge;
            
            if (finalPrice && finalPrice > 0) {
              zeppPriceAvailable = true;
              sheetPrice = finalPrice;
            }
          }
          
          // Update button visibility based on ZEPP price availability
          updateShopNowButtonVisibility(true, zeppPriceAvailable);
          
          if (zeppPriceAvailable && sheetPrice) {
            if (sheetPriceElem) sheetPriceElem.innerText = formatIndianCurrency(sheetPrice);

            if (amazonPrice && !isNaN(amazonPrice) && savingsElem) {
              amazonPrice = parseFloat(amazonPrice);

              if (amazonPrice < sheetPrice) {
                savingsElem.innerText = `You save ${formatIndianCurrency(sheetPrice - amazonPrice)} on Amazon!`;
                savingsElem.style.color = "#28a745";
              } else if (amazonPrice > sheetPrice) {
                savingsElem.innerText = `It's ${formatIndianCurrency(amazonPrice - sheetPrice)} cheaper on ZEPP.`;
                savingsElem.style.color = "#d32f2f";
              } else {
                savingsElem.innerText = "Both prices are the same.";
                savingsElem.style.color = "#333";
              }
            }
          } else {
            if (sheetPriceElem) sheetPriceElem.innerText = "Not found";
          }
        })
        .catch(err => {
          console.error("ZEPP price fetch error:", err);
          if (sheetPriceElem) sheetPriceElem.innerText = "Fetch error";
          // Error fetching ZEPP price, keep button hidden
          updateShopNowButtonVisibility(true, false);
        });
    });
  });
}

function setupLoginHandlers() {
  const loginBtn = document.getElementById("loginBtn");
  const cancelLoginBtn = document.getElementById("cancelLoginBtn");
  const sendOtpBtn = document.getElementById("sendOtpBtn");
  const verifyOtpBtn = document.getElementById("verifyOtpBtn");
  const backToEmailBtn = document.getElementById("backToEmailBtn");

  if (loginBtn) {
    loginBtn.addEventListener('click', showLoginForm);
  }
  if (cancelLoginBtn) {
    cancelLoginBtn.addEventListener('click', hideLoginForm);
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

function showLoginForm() {
  const authPrompt = document.getElementById("authPrompt");
  const loginForm = document.getElementById("loginForm");
  
  if (authPrompt) authPrompt.style.display = "none";
  if (loginForm) loginForm.style.display = "block";
  
  showEmailStep();
}

function hideLoginForm() {
  const authPrompt = document.getElementById("authPrompt");
  const loginForm = document.getElementById("loginForm");
  
  if (authPrompt) authPrompt.style.display = "block";
  if (loginForm) loginForm.style.display = "none";
  
  // Clear form
  const emailInput = document.getElementById("studentEmail");
  const otpInput = document.getElementById("otpCode");
  if (emailInput) emailInput.value = "";
  if (otpInput) otpInput.value = "";
  
  clearLoginMessage();
}

function showEmailStep() {
  const emailStep = document.getElementById("emailStep");
  const otpStep = document.getElementById("otpStep");
  
  if (emailStep) emailStep.style.display = "block";
  if (otpStep) otpStep.style.display = "none";
}

function showOtpStep() {
  const emailStep = document.getElementById("emailStep");
  const otpStep = document.getElementById("otpStep");
  
  if (emailStep) emailStep.style.display = "none";
  if (otpStep) otpStep.style.display = "block";
}

async function handleSendOtp() {
  const emailInput = document.getElementById("studentEmail");
  const sendBtn = document.getElementById("sendOtpBtn");
  const email = emailInput?.value.trim();

  if (!email) {
    showLoginMessage('Please enter your email address', 'error');
    return;
  }

  if (!isValidStudentEmail(email)) {
    showLoginMessage('Please enter a valid email address', 'error');
    return;
  }

  if (sendBtn) {
    sendBtn.disabled = true;
    sendBtn.textContent = 'Sending...';
  }

  // Send OTP via API
  try {
    const result = await window.authManager.sendOTP(email);
    
    if (result.success) {
      chrome.storage.local.set({ 'zepp_temp_email': email });
      showLoginMessage(result.message || 'OTP sent to your email!', 'success');
      showOtpStep();
    } else {
      showLoginMessage(result.error || 'Failed to send OTP', 'error');
    }
  } catch (error) {
    console.error('OTP send error:', error);
    showLoginMessage('Network error. Please try again.', 'error');
  }
  
  if (sendBtn) {
    sendBtn.disabled = false;
    sendBtn.textContent = 'Send OTP';
  }
}

async function handleVerifyOtp() {
  const emailInput = document.getElementById("studentEmail");
  const otpInput = document.getElementById("otpCode");
  const verifyBtn = document.getElementById("verifyOtpBtn");
  const email = emailInput?.value.trim();
  const otp = otpInput?.value.trim();

  if (!otp) {
    showLoginMessage('Please enter the OTP', 'error');
    return;
  }

  if (verifyBtn) {
    verifyBtn.disabled = true;
    verifyBtn.textContent = 'Verifying...';
  }

  // Verify OTP via API
  try {
    const result = await window.authManager.verifyOTP(email, otp);
    
    if (result.success) {
      // Clean up temp data
      await chrome.storage.local.remove(['zepp_temp_email']);
      
      showLoginMessage(result.message || 'Login successful!', 'success');
      
      setTimeout(() => {
        location.reload();
      }, 1500);
    } else {
      showLoginMessage(result.error || 'Invalid OTP', 'error');
      
      if (verifyBtn) {
        verifyBtn.disabled = false;
        verifyBtn.textContent = 'Verify & Login';
      }
    }
  } catch (error) {
    console.error('OTP verification error:', error);
    showLoginMessage('Network error. Please try again.', 'error');
    
    if (verifyBtn) {
      verifyBtn.disabled = false;
      verifyBtn.textContent = 'Verify & Login';
    }
  }
}

function showLoginMessage(message, type) {
  const messageDiv = document.getElementById('loginMessage');
  if (messageDiv) {
    messageDiv.textContent = message;
    messageDiv.style.display = 'block';
    messageDiv.style.backgroundColor = type === 'error' ? '#fee' : '#efe';
    messageDiv.style.color = type === 'error' ? '#c33' : '#363';
    messageDiv.style.border = `1px solid ${type === 'error' ? '#fcc' : '#cfc'}`;
  }
}

function clearLoginMessage() {
  const messageDiv = document.getElementById('loginMessage');
  if (messageDiv) {
    messageDiv.style.display = 'none';
  }
}

function isValidStudentEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function showTestGiftCard() {
  console.log('Showing test gift card');
  const testCard = {
    discount: 25,
    img: 'https://logo.clearbit.com/amazon.com',
    title: 'Test Gift Card',
    desc: 'This is a test gift card to verify the UI is working',
    cta: 'Test Button',
    link: 'https://example.com'
  };
  
  displayGiftCard(testCard);
}

function normalizeDomain(hostname) {
  return hostname.replace(/^www\./, '').toLowerCase();
}

async function loadGiftCardData() {
  try {
    // Get current tab URL
    const tabs = await new Promise((resolve) => {
      chrome.tabs.query({ active: true, currentWindow: true }, resolve);
    });
    
    if (!tabs[0]) return;
    
    const url = new URL(tabs[0].url);
    const domain = normalizeDomain(url.hostname);
    
    console.log('Fetching gift card for domain:', domain);
    
    // Try to fetch gift card data from API
    try {
      const response = await fetch(`https://localhost:3000/giftcard?domain=${encodeURIComponent(domain)}`);
      
      if (response.ok) {
        const cardData = await response.json();
        
        if (cardData && !cardData.error) {
          console.log('Gift card data loaded');
          displayGiftCard(cardData);
          return;
        }
      }
      
      console.log(`No gift card offer for domain: ${domain} (Status: ${response.status})`);
    } catch (fetchError) {
      console.log('API fetch failed, trying fallback data:', fetchError.message);
    }
    
    // Fallback to mock data for testing
    const mockGiftCards = {
      'amazon.in': {
        discount: 15,
        img: 'https://logo.clearbit.com/amazon.in',
        title: 'Amazon Gift Card',
        desc: 'Get 15% off on your next purchase with Amazon gift cards',
        cta: 'Claim Offer',
        link: 'https://zepp.studentpurchaseprogram.com/amazon-offer'
      },
      'flipkart.com': {
        discount: 20,
        img: 'https://logo.clearbit.com/flipkart.com',
        title: 'Flipkart SuperCoin',
        desc: 'Earn 20% extra SuperCoins on all purchases',
        cta: 'Get SuperCoins',
        link: 'https://zepp.studentpurchaseprogram.com/flipkart-offer'
      },
      'zomato.com': {
        discount: 25,
        img: 'https://logo.clearbit.com/zomato.com',
        title: 'Zomato Gold',
        desc: 'Get 25% off on food delivery with Zomato Gold',
        cta: 'Order Now',
        link: 'https://zepp.studentpurchaseprogram.com/zomato-offer'
      },
      'nykaa.com': {
        discount: 30,
        img: 'https://logo.clearbit.com/nykaa.com',
        title: 'Nykaa Beauty',
        desc: 'Exclusive 30% discount on beauty products',
        cta: 'Shop Beauty',
        link: 'https://zepp.studentpurchaseprogram.com/nykaa-offer'
      }
    };
    
    if (mockGiftCards[domain]) {
      console.log('Using fallback gift card data for:', domain);
      displayGiftCard(mockGiftCards[domain]);
    } else {
      console.log('No fallback data available for domain:', domain);
    }
    
  } catch (error) {
    console.error('Failed to load gift card data:', error);
  }
}

function displayGiftCard(cardData) {
  console.log('displayGiftCard called');
  
  const giftCardSection = document.getElementById('giftCardSection');
  const giftCardRibbon = document.getElementById('giftCardRibbon');
  const giftCardImage = document.getElementById('giftCardImage');
  const giftCardTitle = document.getElementById('giftCardTitle');
  const giftCardDesc = document.getElementById('giftCardDesc');
  const giftCardCTA = document.getElementById('giftCardCTA');
  const closeGiftCard = document.getElementById('closeGiftCard');
  
  console.log('Gift card elements found:', {
    giftCardSection: !!giftCardSection,
    giftCardRibbon: !!giftCardRibbon,
    giftCardImage: !!giftCardImage,
    giftCardTitle: !!giftCardTitle,
    giftCardDesc: !!giftCardDesc,
    giftCardCTA: !!giftCardCTA,
    closeGiftCard: !!closeGiftCard
  });
  
  if (!giftCardSection) {
    console.error('giftCardSection not found!');
    return;
  }
  
  // Populate gift card data
  if (giftCardRibbon) {
    giftCardRibbon.textContent = `${cardData.discount}% OFF`;
    console.log('Set ribbon text');
  }
  if (giftCardImage) {
    giftCardImage.src = cardData.img;
    giftCardImage.alt = cardData.title;
    console.log('Set image src');
  }
  if (giftCardTitle) {
    giftCardTitle.textContent = cardData.title;
    console.log('Set title');
  }
  if (giftCardDesc) {
    giftCardDesc.textContent = cardData.desc;
    console.log('Set description');
  }
  if (giftCardCTA) {
    giftCardCTA.textContent = cardData.cta;
    giftCardCTA.href = cardData.link;
    console.log('Set CTA');
  }
  
  // Show gift card section
  giftCardSection.style.display = 'block';
  console.log('Gift card section made visible');
  
  // Add close handler
  if (closeGiftCard) {
    closeGiftCard.addEventListener('click', () => {
      giftCardSection.style.display = 'none';
      console.log('Gift card closed');
    });
  }
  
  // Add hover effect to CTA
  if (giftCardCTA) {
    giftCardCTA.addEventListener('mouseenter', () => {
      giftCardCTA.style.background = '#3c3c3c';
    });
    giftCardCTA.addEventListener('mouseleave', () => {
      giftCardCTA.style.background = '#242424';
    });
  }
}

async function handleLogout() {
  await chrome.storage.local.set({
    authData: {
      isAuthenticated: false,
      email: null,
      timestamp: null
    }
  });
  
  // Refresh the popup
  location.reload();
}

// Tab Navigation Functions
function setupTabNavigation() {
  const aboutTab = document.getElementById('aboutTab');
  const infoTab = document.getElementById('infoTab');
  const aboutSection = document.getElementById('aboutSection');
  const infoSection = document.getElementById('infoSection');
  
  // About tab click handler
  if (aboutTab) {
    aboutTab.addEventListener('click', () => {
      // Update tab states
      aboutTab.classList.add('active');
      infoTab.classList.remove('active');
      
      // Show/hide sections
      aboutSection.style.display = 'block';
      infoSection.style.display = 'none';
      
      console.log('Switched to About tab');
    });
  }
  
  // Info tab click handler
  if (infoTab) {
    infoTab.addEventListener('click', () => {
      // Update tab states
      infoTab.classList.add('active');
      aboutTab.classList.remove('active');
      
      // Show/hide sections
      aboutSection.style.display = 'none';
      infoSection.style.display = 'block';
      
      console.log('Switched to Guide tab');
    });
  }
  
  // Initialize with About tab active
  if (aboutSection && infoSection) {
    aboutSection.style.display = 'block';
    infoSection.style.display = 'none';
  }
}
