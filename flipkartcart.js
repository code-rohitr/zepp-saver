console.log("Flipkart cart price comparison script started");

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
        savings = price - zeppPrice;
      }

      console.log(`Extracted - PID: ${pid}, Title: "${title}", Price: ${price}, Savings: ${savings}`);
      items.push({ pid, title, price, zeppPrice, savings });
    } catch (e) {
      console.warn("Could not parse product info:", e);
    }
  }

  // Filter only products with Zepp price
  const itemsWithZeppPrice = items.filter(i => i.zeppPrice !== null);

  if (itemsWithZeppPrice.length > 0) {
    document.querySelectorAll('#flip-pid-popup').forEach(p => p.remove());

    const popup = document.createElement('div');
    popup.id = 'flip-pid-popup';
    Object.assign(popup.style, {
      position: 'fixed',
      bottom: '5%',
      right: '80px',
      background: 'rgba(255,255,255,0.98)',
      border: '1px solid #eee',
      borderRadius: '12px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
      fontFamily: 'Arial, sans-serif',
      color: '#242424',
      padding: '30px 32px 20px 32px',
      zIndex: 2147483647,
      width: '480px',
      maxHeight: '70vh',
      overflowY: 'auto'
    });

    // Calculate total savings
    const totalSavings = itemsWithZeppPrice.reduce((sum, item) => sum + (item.savings || 0), 0);

    popup.innerHTML = `
      <div style="font-size:22px;font-weight:bold;margin-bottom:10px;">Flipkart Cart Items</div>
      <button id="flipPidPopupClose" style="position:absolute;top:14px;right:14px;background:transparent;border:none;font-size:20px;cursor:pointer;">×</button>
      <div style="display: flex; flex-direction: column; gap: 12px; max-height: 60vh; overflow-y: auto;">
        ${itemsWithZeppPrice.map(i => `
          <div style="
            padding: 16px;
            background: white;
            border-radius: 12px;
            box-shadow: 0 2px 6px rgba(0,0,0,0.1);
            border: 1px solid #00000020;
            font-family: Arial, sans-serif;
            color: #242424;
          ">
            <div style="font-weight: 500; font-size: 16px; margin-bottom: 16px; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;">
              ${i.title || i.pid}
            </div>
            <div style="display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; font-size: 16px; color: #555;">
              <div>
                <div style="font-weight: 500; color: #888;">Flipkart Price</div>
                <div style="font-weight: 600; color: #242424;">₹${i.price !== null ? i.price : '-'}</div>
              </div>
              <div>
                <div style="font-weight: 500; color: #888;">ZEPP Price</div>
                <div style="font-weight: 600; color: #242424;">₹${i.zeppPrice !== null ? Math.round(i.zeppPrice) : '-'}</div>
              </div>
              <div>
                <div style="font-weight: 700; color: #2e7d32;">Savings</div>
                <div style="font-weight: 700; color: #2e7d32;">${i.savings !== null ? ('₹' + Math.round(i.savings)) : '-'}</div>
              </div>
              <div></div>
            </div>
            <div style="display: flex; align-items: flex-end; margin-top: 16px;">
              <a href="https://www.amazon.in" target="_blank" rel="noopener noreferrer" style="
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
      <div style="margin-top: 20px; border-top: 1px solid #ccc; padding-top: 12px; font-size: 18px; font-weight: 700; color: #2e7d32; text-align: right;">
        Total Savings: ₹${Math.round(totalSavings)}
      </div>
    `;

    document.body.appendChild(popup);

    // Create trigger icon
    const triggerIcon = document.createElement('div');
    triggerIcon.setAttribute('zepp-trigger-icon', '');
    Object.assign(triggerIcon.style, {
      position: 'fixed',
      bottom: '5%',
      right: '20px',
      width: '50px',
      height: '50px',
      borderRadius: '50%',
      background: '#000000',
      border: '1px solid rgba(255, 255, 255, 0.5)',
      boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      cursor: 'pointer',
      zIndex: 9998,
      opacity: '1',
    });
    triggerIcon.innerHTML = `<img id="zeppIcon" src="${chrome.runtime.getURL('icon.png')}" style="width: 24px; height: 24px;" alt="ZEPP" />`;

    document.body.appendChild(triggerIcon);

    // Show popup and trigger icon
    popup.style.display = 'block';
    triggerIcon.style.display = 'flex';

    document.getElementById('flipPidPopupClose').onclick = () => popup.remove();

    document.getElementById('closeAutoPopup')?.addEventListener('click', () => {
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
  } else {
    console.log("No products with Zepp price found on this Flipkart cart page.");
  }
}

async function getZeppPrice(fsn) {
  const id_type = "fsn";
  try {
    const res = await fetch(`http://localhost:3000/api/price?id_type=${id_type}&id_value=${fsn}`);
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
    console.warn('ZEPP API error for', fsn, e);
  }
  return null;
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
