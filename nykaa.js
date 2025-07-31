console.log("Nykaa Running content script...");

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

// --- Popup Injection Logic in a Function ---

function injectZeppPopup() {
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
  popup.style.background = 'linear-gradient(to bottom right, hsla(0, 0%, 100%, 0.5), rgba(255, 255, 255, 0.5))';
  popup.style.backdropFilter = 'blur(35px)';
  popup.style.border = '1px solid rgba(255,255,255,0.2)';
  popup.style.borderRadius = '12px';
  popup.style.boxShadow = '0 8px 32px rgba(0,0,0,0.25)';
  popup.style.minWidth = '320px';
  popup.style.transition = 'all 0.3s ease';
  popup.style.opacity = '0'; // initially hidden
  popup.style.overflow = 'hidden';
  popup.style.transform = 'translateY(-10px)';

  popup.innerHTML = `
      <div style="width: 100%; height: 20%; background: linear-gradient(to left, #fc2779, #ea4182ff); color: white; padding: 10px 20px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
          <button id="closeAutoPopup" style="background: none; margin-left: 5px; border: none; font-size: 18px; cursor: pointer; color: #ffffff;">✕</button>
          <div>
            <img id="couponicon" style="height: 20px; margin-left: 10px;" />
            <img id="infoicon" style="height: 20px; margin-left: 10px;" />
            <img id="settingsicon" style="height: 20px; margin-left: 10px;" />
          </div>
        </div>
        <div style="font-weight: bold; font-size: 16px; margin: 10px 0px; text-align: center;">
          ZEPP has a <span style="font-weight: bold;">better price</span> for you
        </div>
      </div>
      <div style="padding: 0 20px;">
        <div style="display: flex; font-size: 16px; justify-content: space-between; padding: 20px 0; border-bottom: 1px solid #ddd;">
          <span>Nykaa Price</span>
          <span id="amazonPrice" style="font-weight: 600;">₹${price ?? 'Unavailable'}</span>
        </div>
        <div style="display: flex; font-size: 16px; justify-content: space-between; padding: 20px 0; border-bottom: 1px solid #ddd;">
          <span>ZEPP Price</span>
          <span id="sheetPrice" style="font-weight: 600; color: #fc2779;">Loading...</span>
        </div>
        <div style="text-align: center; margin-top: 16px;">
          <div style="font-size: 16px; color: #444;">Shop on ZEPP and save</div>
          <div id="savings" style="font-size: 28px; font-weight: 700; color: #ff468dff; margin-top: 10px;"></div>
        </div>
        <style>
          #ctaBtn {
            transition: all 0.2s ease;
            background: #fc2779
          }
          #ctaBtn:hover {
            background: #f15e96ff;
            color: #ffffff;
          }
        </style>
        <a id="ctaBtn" href="https://zepp.studentpurchaseprogram.com/" target="_blank"
          style="display: flex; align-items: center; justify-content: center; gap: 8px;
                  padding: 12px; margin-top: 16px; color: white;
                  border-radius: 100px; text-decoration: none; font-weight: bold; font-size: 16px;">
          <img id="zeppIcon" style="height: 24px;" />
          Shop Now
        </a>
        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 24px; font-size: 10px; padding-bottom: 10px;">
          <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; width: 80px;">
            <img id="icon1" style="height: 40px; width: 40px;" />
            <p style="font-size: 10px; line-height: 150%; margin-top: 10px; text-align: center;">
              <strong>A</strong>lways Free <br/> Shipping
            </p>
          </div>
          <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; width: 80px;">
            <img id="icon2" style="height: 40px; width: 40px;" />
            <p style="font-size: 10px; line-height: 150%; margin-top: 10px; text-align: center;">
              <strong>B</strong>est Price Guaranteed
            </p>
          </div>
          <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; width: 80px;">
            <img id="icon3" style="height: 40px; width: 40px;" />
            <p style="font-size: 10px; line-height: 150%; margin-top: 10px; text-align: center;">
              <strong>C</strong>ashback on Every Order
            </p>
          </div>
          <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; width: 80px;">
            <img id="icon4" style="height: 40px; width: 40px;" />
            <p style="font-size: 10px; line-height: 150%; margin-top: 10px; text-align: center;">
              <strong>D</strong>irect Delivery from Brands
            </p>
          </div>
        </div>
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
  triggerIcon.style.background = '#000000';
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
  document.getElementById('settingsicon').src = chrome.runtime.getURL('settings.svg');
  document.getElementById('infoicon').src = chrome.runtime.getURL('info.svg');
  document.getElementById('couponicon').src = chrome.runtime.getURL('coupon.svg');
  document.getElementById('icon1').src = chrome.runtime.getURL('icon_1.png');
  document.getElementById('icon2').src = chrome.runtime.getURL('icon_2.png');
  document.getElementById('icon3').src = chrome.runtime.getURL('icon_3.png');
  document.getElementById('icon4').src = chrome.runtime.getURL('icon_4.png');

  // Close popup listener
  document.getElementById('closeAutoPopup').addEventListener('click', () => {
    popup.style.opacity = '0';
    popup.style.transform = 'translateY(10px)';
    setTimeout(() => {
      popup.style.display = 'none';
      triggerIcon.style.opacity = '1';
    }, 300);
  });

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


  // Fetch ZEPP Price - Popup will only be shown if ZEPP price is available!
  let sheetPrice = null, title = null, productUrl = null;
  const id_type = "nyka_sku";

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
        sheetPrice = finalPrice;
        title = data.items[0].name;
        // get url_key for cta
        const urlAttr = data.items[0].custom_attributes?.find(attr => attr.attribute_code === "url_key");
        productUrl = urlAttr ? `${urlAttr.value}.html` : null;
        const ctaBtn = document.getElementById("ctaBtn");
        if (ctaBtn && productUrl) {
          ctaBtn.href = `https://zepp.studentpurchaseprogram.com/${productUrl}`;
        }
        if (price && sheetPrice && sheetPriceEl && savingsEl) {
          sheetPriceEl.textContent = `₹${Math.round(sheetPrice)}`;
          const targetSavings = Math.abs(price - sheetPrice);
          savingsEl.innerHTML = `₹${Math.round(targetSavings)}`;
          savingsEl.style.color = "#242424";
        }
        // Only now: show the popup!
        setTimeout(() => {
          popup.style.opacity = '1';
          popup.style.transform = 'translateY(0)';
        }, 100);
      } else {
        if (!finalPrice || finalPrice === "" || data.items.length === 0) {
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
      }
      // If no price found on ZEPP: do NOT make popup visible
    })
    .catch(err => {
      // On fetch/network error: keep popup hidden
      console.error("Sheet fetch error:", err);
    });
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

// -- Entry Point --
observeUrlChange(injectZeppPopup);
injectZeppPopup();
