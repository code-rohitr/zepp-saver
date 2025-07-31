console.log("Running Flipkart content script...");

function extractFlipkartPrice() {
  const priceElement = document.querySelector("div.Nx9bqj.CxhGGd");
  if (priceElement) {
    const text = priceElement.innerText;
    const num = parseFloat(text.replace(/[^\d]/g, ""));
    return isNaN(num) ? null : num;
  }
  return null;
}

function extractFlipkartPID() {
  const pidMatch = window.location.href.match(/pid=([A-Z0-9]+)/i);
  return pidMatch ? pidMatch[1] : null;
}

function injectStylishPopup(sheetPrice, productURL, flipkartPrice) {
  const savings = flipkartPrice && sheetPrice ? (flipkartPrice - sheetPrice) : null;

  const style = document.createElement('style');
  style.textContent = `
    @font-face {
      font-family: 'Funnel Display';
      src: url('${chrome.runtime.getURL('FunnelDisplay.ttf')}') format('truetype');
    }
    .zepp-extension-popup * {
      font-family: 'Funnel Display', sans-serif !important;
    }
  `;
  document.head.appendChild(style);

  const popup = document.createElement('div');
  popup.classList.add('zepp-extension-popup');
  popup.style.cssText = `
    position: fixed;
    bottom: 5%;
    right: 80px;
    z-index: 9999;
    background: linear-gradient(to bottom right, rgba(255, 255, 255, 0.2), rgba(255, 255, 255, 0.2));
    backdrop-filter: blur(35px);
    border: 1px solid rgba(255,255,255,0.2);
    border-radius: 12px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.25);
    min-width: 320px;
    transition: all 0.3s ease;
    overflow: hidden;
    opacity: 0;
    transform: translateY(-10px);
  `;

  popup.innerHTML = `
<div style="width: 100%; height: 20%; background: linear-gradient(to right, rgba(104, 122, 228, 1), rgba(116, 82, 171, 1)); color: white; padding: 10px 20px;">
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
    <span>Flipkart Price</span>
    <span id="flipkartPrice" style="font-weight: 600;">₹${flipkartPrice ?? 'Unavailable'}</span>
  </div>

  <div style="display: flex; font-size: 16px; justify-content: space-between; padding: 20px 0; border-bottom: 1px solid #ddd;">
    <span>ZEPP Price</span>
    <span id="zeppPrice" style="font-weight: 600; color: #687AE4;">Loading...</span>
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
            border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px;">
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
  triggerIcon.style.cssText = `
    position: fixed;
    bottom: 5%;
    right: 20px;
    width: 50px;
    height: 50px;
    border-radius: 50%;
    background: #000000;
    display: flex;
    justify-content: center;
    align-items: center;
    cursor: pointer;
    z-index: 9998;
    opacity: 0;
  `;
  triggerIcon.innerHTML = `<img src="${chrome.runtime.getURL('icon.png')}" style="width: 24px;" />`;

  document.body.appendChild(popup);
  document.body.appendChild(triggerIcon);

  // Start hidden
  popup.style.opacity = '1';

  // Toggle popup on trigger icon click
  triggerIcon.addEventListener("click", () => {
    const isVisible = popup.style.display === "block";
    popup.style.display = isVisible ? "none" : "block";
    if (!isVisible) {
      popup.style.opacity = '0';
      popup.style.transform = 'translateY(10px)';
      setTimeout(() => {
        popup.style.opacity = '1';
        popup.style.transform = 'translateY(0)';
      }, 10);
    }

  });

  setTimeout(() => {
    triggerIcon.style.opacity = '1';
  }, 100);


  document.getElementById('settingsicon').src = chrome.runtime.getURL('settings.svg');
  document.getElementById('infoicon').src = chrome.runtime.getURL('info.svg');
  document.getElementById('couponicon').src = chrome.runtime.getURL('coupon.svg');

  document.getElementById('icon1').src = chrome.runtime.getURL('icon_1.png');
  document.getElementById('icon2').src = chrome.runtime.getURL('icon_2.png');
  document.getElementById('icon3').src = chrome.runtime.getURL('icon_3.png');
  document.getElementById('icon4').src = chrome.runtime.getURL('icon_4.png');

  document.getElementById('closeAutoPopup').onclick = () => {
    popup.remove();
  };

  if (sheetPrice && document.getElementById("zeppPrice")) {
    animatePrice("zeppPrice", flipkartPrice, sheetPrice);
  }
  if (savings && document.getElementById("savings")) {
    animateSavings("savings", savings);
  }
}

function animatePrice(id, from, to) {
  let current = from;
  const step = (from - to) / 30;
  const el = document.getElementById(id);
  function tick() {
    if (current > to) {
      current -= step;
      if (current < to) current = to;
      el.innerText = `₹${Math.round(current)}`;
      requestAnimationFrame(tick);
    } else {
      el.innerText = `₹${Math.round(to)}`;
    }
  }
  tick();
}

function animateSavings(id, to) {
  let current = 0;
  const step = to / 30;
  const el = document.getElementById(id);
  function tick() {
    if (current < to) {
      current += step;
      if (current > to) current = to;
      el.innerText = `₹${Math.round(current)}`;
      requestAnimationFrame(tick);
    } else {
      el.innerText = `₹${Math.round(to)}`;
    }
  }
  tick();
}

function main() {
  const flipkartPrice = extractFlipkartPrice();
  const pid = extractFlipkartPID();

  console.log("Flipkart PID:", pid);
  console.log("Flipkart Price:", flipkartPrice);

  if (!pid || !flipkartPrice) return;

  const apiURL = `https://script.google.com/macros/s/AKfycbwdTgUY6L9wR1KMMtCuglSbj04xAIv-yTj1Y4_D7oe6Sgav34Kg39E12ztktU31Mm3xtw/exec?asin=${pid}`;

  fetch(apiURL)
    .then(res => res.json())
    .then(data => {
      const sheetPrice = parseFloat(data.sheetPrice);
      const productURL = data.productURL;
      console.log("Injecting popup with:", { sheetPrice, productURL, flipkartPrice });
      injectStylishPopup(sheetPrice, productURL, flipkartPrice);
    })
    .catch(err => {
      console.error("Error fetching sheet price:", err);
      injectStylishPopup(null, null, flipkartPrice);
    });
}

window.addEventListener("load", () => setTimeout(main, 1500));
