/**
 * @file Content script for a Chrome extension.
 * Injects a toggleable gift card popup in the bottom-right corner if the backend returns card data for the current domain.
 */

// Your backend API endpoint that reads Google Sheet via server.js
const API_URL = 'http://localhost:3000/giftcard';

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
    let cardData = null;

    // Fetch from the backend instead of a static map
    try {
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
    } catch (err) {
        console.error("Failed to fetch gift card data:", err);
        return;
    }

    // Remove any existing popup container to prevent duplicates.
    const existingContainer = document.getElementById('zepp-gc-container');
    if (existingContainer) {
        existingContainer.remove();
    }

    // --- All style/UI code below is updated with the new design ---
    const styles = `
        #zepp-gc-container {
            position: fixed;
            bottom: 20px;
            right: 20px;
            z-index: 99998;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
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
        .zepp-gc-card {
            width: 340px; /* More compact width */
            min-height: 340px; /* More compact height */
            height: auto; /* More compact height */
            background-color: #ffffff;
            border-radius: 16px;
            box-shadow: 0 8px 30px rgba(0, 0, 0, 0.15);
            position: absolute;
            bottom: 5%; /* Position in the left of the toggle button */
            right: 80px;
            overflow: hidden; /* Important for the ribbon effect */
            color: #1a202c;
            display: flex;
            flex-direction: column;
            border: 1px solid #e2e8f0;
            /* Hidden state */
            opacity: 0;
            transform: translateY(20px) scale(0.95);
            transition: opacity 0.3s ease, transform 0.3s ease;
            pointer-events: none;
        }
        .zepp-gc-card.visible {
            opacity: 1;
            transform: translateY(0) scale(1);
            pointer-events: auto;
        }
        /* New Discount Ribbon Style */
        .zepp-gc-discount-ribbon {
            position: absolute;
            top: -10px;
            right: -10px;
            width: 120px;
            height: 120px;
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
        }
        .zepp-gc-discount-ribbon::before {
            content: attr(data-content);
            position: absolute;
            width: 150%;
            height: 40px;
            background: #ff4a5d;
            transform: rotate(45deg) translateY(-20px);
            display: flex;
            align-items: center;
            justify-content: center;
            color: #fff;
            font-weight: bold;
            font-size: 18px;
            box-shadow: 0 5px 10px rgba(0,0,0,0.2);
        }
        .zepp-gc-card-body {
            display: flex;
            flex-direction: column;
            height: 100%;
            padding: 24px; /* Adjusted padding */
            text-align: center;
        }
        .zepp-gc-cta-button {
            background-color: #242424;
            text-decoration: none;
            color: #ffffff;
            font-weight: 600;
            padding: 16px 32px; /* Adjusted padding */
            border-radius: 100px;
            font-size: 16px;
            text-align: center;
            transition: all 0.3s ease;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
            border: none;
            cursor: pointer;
            width: 100%;
            text-decoration: none;
        }
        .zepp-gc-cta-button:hover {
            background-color: #3c3c3cff;
            color: white;
            transform: translateY(-2px);
        }
        #zepp-gc-close-popup {
            position: absolute;
            top: 12px;
            left: 12px; /* Moved to top-left for better design */
            border: none;
            background: #f0f0f0;
            color: #555;
            width: 30px;
            height: 30px;
            border-radius: 50%;
            font-size: 20px;
            line-height: 30px;
            cursor: pointer;
            z-index: 10;
            transition: background 0.2s;
        }
        #zepp-gc-close-popup:hover {
            background: #e0e0e0;
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
        <!-- The Gift Card Popup (initially visible) -->
        <div class="zepp-gc-card visible" id="zepp-gc-card">
            <div class="zepp-gc-discount-ribbon" data-content="${cardData.discount}% OFF"></div>
            <button id="zepp-gc-close-popup">&times;</button>
            <div class="zepp-gc-card-body">
                <div style="flex-shrink: 0; margin-top: 32px; margin-bottom: 24px;">
                    <img src="${cardData.img}" alt="${cardData.title}" style="width: 70px; height: 70px; border-radius: 50%; margin: 0 auto 1rem auto; box-shadow: 0 0 10px rgba(0,0,0,0.1);">
                    <h1 style="font-size: 16px; font-weight: bold; color: #1a202c;">${cardData.title}</h1>
                    <p style="font-size: 16px; color: #555; font-weight: 500;">Exclusive Offer Just For You</p>
                </div>

                <div style="flex-shrink: 0;">
                    <p style="color: #555; margin-bottom: 28px; font-size: 16px; font-weight: 400;">${cardData.desc}</p>
                    <a href="${cardData.link}" target="_blank" rel="noopener noreferrer" class="zepp-gc-cta-button">${cardData.cta}</a>
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
    const cardElement = document.getElementById('zepp-gc-card');
    const closeButton = document.getElementById('zepp-gc-close-popup');

    document.getElementById('zeppIcon').src = chrome.runtime.getURL('icon.png');

    // Add event listeners for toggling visibility
    toggleButton.onclick = () => {
        cardElement.classList.toggle('visible');
    };
    closeButton.onclick = () => {
        cardElement.classList.remove('visible');
    };
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

// Initial execution and observer setup.
injectGiftCardBanner();
observeUrlChanges();
