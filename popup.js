document.addEventListener("DOMContentLoaded", async () => {
  // Check authentication status first
  const authData = await getAuthData();
  const isAuthenticated = authData && authData.isAuthenticated;

  // Update UI based on authentication status
  updateAuthUI(isAuthenticated, authData);

  if (isAuthenticated) {
    // If authenticated, load price comparison
    loadPriceComparison();
  } else {
    // Add login link handler for popup
    const loginLink = document.getElementById("loginLink");
    if (loginLink) {
      loginLink.addEventListener('click', (e) => {
        e.preventDefault();
        // Send message to content script to open login modal
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          chrome.tabs.sendMessage(tabs[0].id, { type: "OPEN_LOGIN_MODAL" });
        });
      });
    }
  }
});

async function getAuthData() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['authData'], (result) => {
      resolve(result.authData || null);
    });
  });
}

function updateAuthUI(isAuthenticated, authData) {
  const priceSection = document.getElementById("priceSection");
  const authPrompt = document.getElementById("authPrompt");
  const userInfo = document.getElementById("userInfo");

  if (isAuthenticated) {
    if (priceSection) priceSection.style.display = "block";
    if (authPrompt) authPrompt.style.display = "none";
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
        amazonPriceElem.innerText = `₹${parseFloat(amazonPrice).toFixed(2)}`;
      } else if (amazonPriceElem) {
        amazonPriceElem.innerText = "Unavailable";
      }

      if (!asin) {
        if (sheetPriceElem) sheetPriceElem.innerText = "No ASIN";
        return;
      }

      const sheetURL = `https://script.google.com/macros/s/AKfycbwdTgUY6L9wR1KMMtCuglSbj04xAIv-yTj1Y4_D7oe6Sgav34Kg39E12ztktU31Mm3xtw/exec?asin=${asin}`;

      fetch(sheetURL)
        .then(res => res.json())
        .then(data => {
          let sheetPrice = parseFloat(data.sheetPrice);
          if (!sheetPrice || isNaN(sheetPrice)) {
            if (sheetPriceElem) sheetPriceElem.innerText = "Not found";
            return;
          }

          if (sheetPriceElem) sheetPriceElem.innerText = `₹${sheetPrice.toFixed(2)}`;

          if (amazonPrice && !isNaN(amazonPrice) && savingsElem) {
            amazonPrice = parseFloat(amazonPrice);

            if (amazonPrice < sheetPrice) {
              savingsElem.innerText = `You save ₹${(sheetPrice - amazonPrice).toFixed(2)} on Amazon!`;
              savingsElem.style.color = "#28a745";
            } else if (amazonPrice > sheetPrice) {
              savingsElem.innerText = `It's ₹${(amazonPrice - sheetPrice).toFixed(2)} cheaper on ZEPP.`;
              savingsElem.style.color = "#d32f2f";
            } else {
              savingsElem.innerText = "Both prices are the same.";
              savingsElem.style.color = "#333";
            }
          }
        })
        .catch(err => {
          console.error("Sheet fetch error:", err);
          if (sheetPriceElem) sheetPriceElem.innerText = "Fetch error";
        });
    });
  });
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
