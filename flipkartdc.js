const BACKEND_LOG_URL_FLIPKART = "http://localhost:3000/api/log-keyword"; // Your backend endpoint for Flipkart logs

let lastLoggedKeywordFlipkart = null;

function getFlipkartSearchKeywordFromURL() {
  const url = new URL(window.location.href);
  const keyword = url.searchParams.get('q');

  // Only proceed if keyword exists and URL path starts with /search
  if (!keyword || !location.pathname.startsWith('/search')) return;

  const decodedKeyword = decodeURIComponent(keyword);

  // Avoid logging same keyword multiple times
  if (decodedKeyword === lastLoggedKeywordFlipkart) return;
  lastLoggedKeywordFlipkart = decodedKeyword;

  const datetime = new Date().toISOString();
  const device = /Mobile|Android/i.test(navigator.userAgent) ? "Mobile" : "Desktop";
  const category = "Unknown"; // Flipkart URL doesn't have clear category in path, set as needed

  const data = {
    keyword: decodedKeyword,
    timestamp: datetime,
    url: window.location.href,
    category,
    source: "flipkart",
    device
  };

  console.log("📤 Sending Flipkart keyword to backend:", data);

  fetch(BACKEND_LOG_URL_FLIPKART, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  })
  .then(res => res.json())
  .then(response => console.log("✅ Flipkart keyword logged:", response))
  .catch(err => console.error("❌ Flipkart backend logging error:", err));
}

// Detect URL changes in Flipkart SPA-like navigation
let lastFlipkartUrl = location.href;
const flipkartObserver = new MutationObserver(() => {
  if (location.href !== lastFlipkartUrl) {
    lastFlipkartUrl = location.href;
    getFlipkartSearchKeywordFromURL();
  }
});
flipkartObserver.observe(document, { childList: true, subtree: true });

// Initial trigger on page load
getFlipkartSearchKeywordFromURL();
