console.log("Running Amazon cart price comparison script...");

function extractCartItems() {
    const container = document.getElementById('sc-active-cart');
    if (!container) return [];
    // Select all divs with data-asin inside the container
    const items = container.querySelectorAll('div[data-asin]');
    return Array.from(items)
        .map(row => {
            const asin = row.getAttribute('data-asin');
            if (!asin || !/^[A-Z0-9]{10}$/.test(asin)) return null;
            const titleEl = row.querySelector('.sc-product-title');
            const priceEl = row.querySelector('.a-price-whole');
            const priceText = priceEl ? priceEl.innerText.replace(/[^\d.]/g, '') : '';
            const price = priceText ? parseFloat(priceText) : null;
            const title = titleEl ? titleEl.innerText.trim() : '';
            return { asin, title, price };
        })
        .filter(Boolean);
}

async function getZeppPrice(asin) {
    const id_type = "asn";
    try {
        const res = await fetch(`http://localhost:3000/api/price?id_type=${id_type}&id_value=${asin}`);
        const data = await res.json();
        if (data.items && data.items.length > 0) {
            const splpriceAttr = data.items[0].custom_attributes?.find(attr => attr.attribute_code === "special_price");
            const surchargeAttr = data.items[0].custom_attributes?.find(attr => attr.attribute_code === "productsurcharge_fee");
            const splprice = splpriceAttr ? parseFloat(splpriceAttr.value) : 0;
            const surcharge = surchargeAttr ? parseFloat(surchargeAttr.value) : 0;
            const finalPrice = splprice + surcharge;
            return { finalPrice, title: data.items[0].name };
        }
    } catch (e) {
        console.warn('ZEPP API error for', asin, e);
    }
    return null;
}

function showCartPopup(results, totalAmazon, totalZepp, totalSavings) {
    // Remove old popup and trigger icon if any
    document.querySelectorAll('.zepp-cart-popup, [zepp-trigger-icon]').forEach(el => el.remove());

    // Filter to show only products with zeppPrice available
    const filteredResults = results.filter(r => r.zeppPrice !== null);

    if (filteredResults.length === 0) {
        console.log('No products with ZEPP price to display.');
        return;
    }

    // Create popup container
    const popup = document.createElement('div');
    popup.className = 'zepp-cart-popup';
    Object.assign(popup.style, {
        position: 'fixed',
        bottom: '5%',
        right: '80px',
        zIndex: 9999999,
        maxHeight: '75vh',
        width: '480px',
        overflowY: 'auto',
        background: 'linear-gradient(to bottom right, rgba(255,255,255,0.95), rgba(255,255,255,0.98))',
        border: '1px solid #ddd',
        borderRadius: '12px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
        fontFamily: 'Arial, sans-serif',
        padding: '16px 20px',
        color: '#242424',
        transition: 'opacity 0.3s ease, transform 0.3s ease',
        opacity: '1',
        transform: 'translateY(0)',
        display: 'block',
    });

    popup.innerHTML = `
      <div style="display: flex; max-height: 70vh; background: linear-gradient(to bottom right, rgba(255,255,255,0.95), rgba(255,255,255,0.98)); height: auto; justify-content: space-between; align-items: center; font-size: 18px; font-weight: 700; padding-bottom: 10px; border-bottom: 1.5px solid #ccc; backdrop-filter: blur(35px);">
        <span>ZEPP Cart Price Check</span>
        <button id="closeAutoPopup" title="Close" style="background: none; border: none; font-size: 24px; cursor: pointer; line-height: 1; color: #555;">✕</button>
      </div>

      <div style="margin-top: 12px; display: flex; flex-direction: column; gap: 16px;">
        ${filteredResults.map(r => `
          <div style="padding: 16px; background: none; border-radius: 12px; box-shadow: 0 2px 6px rgba(0,0,0,0.1); border: 1px solid #00000020;">
            <div style="font-weight: 500; font-size: 16px; margin-bottom: 16px; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;">
              ${r.title || r.asin}
            </div>

            <div style="display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; font-size: 16px; color: #555;">
              <div>
                <div style="font-weight: 500; color: #888;">Amazon Price</div>
                <div style="font-weight: 600; color: #242424;">₹${r.amazonPrice !== null ? r.amazonPrice : '-'}</div>
              </div>

              <div>
                <div style="font-weight: 500; color: #888;">ZEPP Price</div>
                <div style="font-weight: 600; color: #242424;">₹${Math.round(r.zeppPrice)}</div>
              </div>

              <div>
                <div style="font-weight: 700; color: #2e7d32;">Savings</div>
                <div style="font-weight: 700; color: #2e7d32;">₹${Math.round(r.savings)}</div>
              </div>
            </div>

            <div style="display: flex; align-items: flex-end; margin-top: 16px;">
              <a href="https://www.amazon.in/dp/${r.asin}" target="_blank" rel="noopener noreferrer" style="
                background: #242424;
                color: #fff;
                padding: 8px 16px;
                border-radius: 100px;
                font-size: 14px;
                text-decoration: none;
                font-weight: 600;
                width: 100%;
                text-align: center;
                white-space: nowrap;
              ">
                Shop Now
              </a>
            </div>
          </div>
        `).join('')}
      </div>

      <div style="margin-top: 20px; font-size: 16px; font-weight: 700; color: #2e7d32; text-align: left;">
        Total Savings: ₹${Math.round(totalSavings)}
      </div>
    `;

    // Append popup to the document body
    document.body.appendChild(popup);

    // Create trigger icon
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
    triggerIcon.innerHTML = `<img id="zeppIcon" src="${chrome.runtime.getURL('icon.png')}" style="width: 24px; height: 24px;" alt="ZEPP" />`;

    document.body.appendChild(triggerIcon);


    // Initially hide popup and show trigger icon
    popup.style.display = 'block';  // Show popup by default
    triggerIcon.style.display = 'flex';  // Hide trigger icon initially

    // Assume you have a close button with id 'closeAutoPopup' inside popup
    document.getElementById('closeAutoPopup').addEventListener('click', () => {
        popup.style.opacity = '0';
        popup.style.transform = 'translateY(10px)';
        setTimeout(() => {
            popup.style.display = 'none';
            triggerIcon.style.opacity = '1';  // Ensure trigger icon visible on close
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


    // Optionally set other icons if present
    const optionalIcons = ['settingsicon', 'infoicon', 'couponicon', 'icon1', 'icon2', 'icon3', 'icon4'];
    const iconMap = {
        settingsicon: 'settings.svg',
        infoicon: 'info.svg',
        couponicon: 'coupon.svg',
        icon1: 'icon_1.png',
        icon2: 'icon_2.png',
        icon3: 'icon_3.png',
        icon4: 'icon_4.png'
    };
    optionalIcons.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.src = chrome.runtime.getURL(iconMap[id]);
    });
}

// --- Runner ---
(async function runCartPopup() {
    if (!/\/cart/.test(window.location.pathname)) {
        return;
    }
    const cartItems = await extractCartItems();
    if (!cartItems.length) {
        console.warn("No items found in cart or unable to parse cart items.");
        return;
    }
    const results = await Promise.all(cartItems.map(async item => {
        const zeppResult = await getZeppPrice(item.asin);
        if (zeppResult && zeppResult.finalPrice > 1) {
            return {
                asin: item.asin,
                title: item.title,
                amazonPrice: item.price,
                zeppPrice: zeppResult.finalPrice,
                savings: item.price - zeppResult.finalPrice > 0 ? item.price - zeppResult.finalPrice : 0
            };
        } else {
            return {
                asin: item.asin,
                title: item.title,
                amazonPrice: item.price,
                zeppPrice: null,
                savings: null
            };
        }
    }));

    let totalAmazon = 0, totalZepp = 0, totalSavings = 0;
    for (const item of results) {
        if (item.zeppPrice && item.amazonPrice) {
            totalAmazon += item.amazonPrice;
            totalZepp += item.zeppPrice;
            totalSavings += item.savings || 0;
        }
    }

    showCartPopup(results, totalAmazon, totalZepp, totalSavings);
})();
