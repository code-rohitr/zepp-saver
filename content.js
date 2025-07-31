console.log("Running content script...");

function extractAmazonPrice() {
  let whole = document.querySelector(".a-price-whole");
  let fraction = document.querySelector(".a-price-fraction");

  if (whole) {
    let combined = whole.innerText.replace(/[^\d]/g, "") + "." + (fraction ? fraction.innerText.replace(/[^\d]/g, "") : "00");
    let num = parseFloat(combined);
    if (num) return num;
  }

  let jsonLdScripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));
  for (let script of jsonLdScripts) {
    try {
      let json = JSON.parse(script.innerText);
      function findPrice(obj) {
        if (!obj || typeof obj !== 'object') return null;
        if ('price' in obj && (typeof obj.price === 'string' || typeof obj.price === 'number')) {
          return parseFloat(obj.price);
        }
        for (let key in obj) {
          let val = findPrice(obj[key]);
          if (val) return val;
        }
        return null;
      }
      let foundPrice = findPrice(json);
      if (foundPrice) return foundPrice;
    } catch (e) { }
  }

  return null;
}

function extractASINFromProductDetails() {
  const rows = document.querySelectorAll('table tr');
  for (let row of rows) {
    const th = row.querySelector('th');
    const td = row.querySelector('td');
    if (th && td && th.innerText.trim() === 'ASIN') {
      const asin = td.innerText.trim();
      if (/^[A-Z0-9]{10}$/.test(asin)) {
        return asin;
      }
    }
  }
  return null;
}

function getASIN() {
  let asinMatch = window.location.pathname.match(/\/dp\/([A-Z0-9]{10})/);
  let asin = asinMatch ? asinMatch[1] : null;
  if (!asin) asin = extractASINFromProductDetails();
  return asin;
}

function waitForASINandPrice(timeout = 7000, interval = 200) {
  return new Promise((resolve, reject) => {
    let elapsed = 0;
    function poll() {
      const asin = getASIN();
      const price = extractAmazonPrice();
      if (asin && price !== null) {
        resolve({ asin, price });
      } else if (elapsed >= timeout) {
        reject(new Error("Timeout waiting for ASIN and price"));
      } else {
        elapsed += interval;
        setTimeout(poll, interval);
      }
    }
    poll();
  });
}

async function injectAutoPopupWrapper() {
  try {
    const { asin, price } = await waitForASINandPrice();
    injectAutoPopup(asin, price);
  } catch (err) {
    console.warn(err.message);
  }
}

function injectAutoPopup(asin, price) {
  document.querySelectorAll('.zepp-extension-popup').forEach(el => el.remove());
  document.querySelectorAll('[zepp-trigger-icon]').forEach(el => el.remove());

  if (!asin) {
    console.warn("ASIN not found. Popup will not be shown.");
    return;
  }

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

  const popup = document.createElement('div');
  popup.classList.add('zepp-extension-popup');
  popup.style.position = 'fixed';
  popup.style.bottom = '5%';
  popup.style.right = '80px';
  popup.style.zIndex = '9999';
  popup.style.background = 'linear-gradient(to bottom right, rgba(255, 255, 255, 0.2), rgba(255, 255, 255, 0.2))';
  popup.style.backdropFilter = 'blur(35px)';
  popup.style.border = '1px solid rgba(255,255,255,0.2)';
  popup.style.borderRadius = '12px';
  popup.style.boxShadow = '0 8px 32px rgba(0,0,0,0.25)';
  popup.style.minWidth = '320px';
  popup.style.transition = 'all 0.3s ease';
  popup.style.opacity = '0';
  popup.style.overflow = 'hidden';
  popup.style.transform = 'translateY(-10px)';
  popup.style.display = 'none';

  popup.innerHTML = `
    <div style="width: 100%; height: 20%; background: linear-gradient(to right, #242424, #242424); color: white; padding: 10px 20px;">
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
        <span>Amazon Price</span>
        <span id="amazonPrice" style="font-weight: 600;">₹${price ?? 'Unavailable'}</span>
      </div>
      <div style="display: flex; font-size: 16px; justify-content: space-between; padding: 20px 0; border-bottom: 1px solid #ddd;">
        <span>ZEPP Price</span>
        <span id="sheetPrice" style="font-weight: 600; color: #687AE4;">Loading...</span>
      </div>
      <div style="text-align: center; margin-top: 16px;">
        <div style="font-size: 16px; color: #444;">Shop on ZEPP and save</div>
        <div id="savings" style="font-size: 28px; font-weight: 700; color: #687AE4; margin-top: 10px;"></div>
      </div>
      <style>
        #ctaBtn {
          transition: all 0.2s ease;
          background: #242424
        }
        #ctaBtn:hover {
          background: #687AE4;
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

  const triggerIcon = document.createElement('div');
  triggerIcon.setAttribute('zepp-trigger-icon', '');
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

  document.body.appendChild(popup);
  document.body.appendChild(triggerIcon);

  document.getElementById('zeppIcon').src = chrome.runtime.getURL('icon.png');
  document.getElementById('settingsicon').src = chrome.runtime.getURL('settings.svg');
  document.getElementById('infoicon').src = chrome.runtime.getURL('info.svg');
  document.getElementById('couponicon').src = chrome.runtime.getURL('coupon.svg');
  document.getElementById('icon1').src = chrome.runtime.getURL('icon_1.png');
  document.getElementById('icon2').src = chrome.runtime.getURL('icon_2.png');
  document.getElementById('icon3').src = chrome.runtime.getURL('icon_3.png');
  document.getElementById('icon4').src = chrome.runtime.getURL('icon_4.png');

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

  // Fetch ZEPP price and show the popup only if finalPrice is found
  if (asin) {
    const id_type = "asn";  // corrected id_type

    async function logProductPageVisit(productUrl) {
      try {
        const response = await fetch('http://localhost:3000/api/log-product', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: productUrl, id: asin }),
        });
        const result = await response.json();
        console.log('Logged product page:', result);
      } catch (error) {
        console.error('Logging failed:', error);
      }
    }

    logProductPageVisit(window.location.href);

    fetch(`http://localhost:3000/api/price?id_type=${id_type}&id_value=${asin}`)
      .then(res => res.json())
      .then(data => {
        let sheetPrice = null;
        let title = null, productUrl = null;

        if (data.items && data.items.length > 0) {
          const splpriceAttr = data.items[0].custom_attributes?.find(attr => attr.attribute_code === "special_price");
          const surchargeAttr = data.items[0].custom_attributes?.find(attr => attr.attribute_code === "productsurcharge_fee");
          const splprice = splpriceAttr ? parseFloat(splpriceAttr.value) : 0;
          const surcharge = surchargeAttr ? parseFloat(surchargeAttr.value) : 0;
          const finalPrice = splprice + surcharge;

          if (!finalPrice) {
            // Hide or do nothing with popup as no valid price
            return;
          }

          sheetPrice = finalPrice;
          title = data.items[0].name;

          const getProductUrl = (item) => {
            const urlAttr = item.custom_attributes?.find(attr => attr.attribute_code === "url_key");
            return urlAttr ? `${urlAttr.value}.html` : null;
          };
          productUrl = getProductUrl(data.items[0]);

          const ctaBtn = document.getElementById("ctaBtn");
          if (ctaBtn && productUrl) {
            ctaBtn.href = `https://zepp.studentpurchaseprogram.com/${productUrl}`;
          }

          const sheetPriceEl = document.getElementById("sheetPrice");
          const savingsEl = document.getElementById("savings");
          if (typeof price === 'number' && sheetPriceEl && savingsEl) {
            sheetPriceEl.textContent = `₹${Math.round(sheetPrice)}`;
            const targetSavings = Math.abs(price - sheetPrice);
            savingsEl.innerHTML = `₹${Math.round(targetSavings)}`;
            savingsEl.style.color = "#242424";
          }

          // Show the popup now
          popup.style.display = 'block';
          setTimeout(() => {
            popup.style.opacity = '1';
            popup.style.transform = 'translateY(0)';
          }, 50);
        }
        // else popup remains hidden or handle accordingly
      })
      .catch(err => {
        console.error("Sheet fetch error:", err);
        // popup can remain hidden here or handle error UI
      });
  }

}

// ----------- URL change detection for SPA -----------
function onUrlChange(callback) {
  let lastUrl = location.href;
  const observer = new MutationObserver(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      callback();
    }
  });
  observer.observe(document, { subtree: true, childList: true });

  ['pushState', 'replaceState'].forEach(method => {
    const original = history[method];
    history[method] = function () {
      const ret = original.apply(this, arguments);
      window.dispatchEvent(new Event(method));
      return ret;
    };
  });

  window.addEventListener('pushState', () => callback());
  window.addEventListener('replaceState', () => callback());
  window.addEventListener('popstate', () => callback());
}

// ---- RUN SCRIPT ON INITIAL LOAD AND EVERY URL CHANGE ----

onUrlChange(() => {
  injectAutoPopupWrapper();
});
injectAutoPopupWrapper();
