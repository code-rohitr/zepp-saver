const BACKEND_LOG_URL = "http://localhost:3000/api/log-keyword"; // Your local Express server endpoint

let lastLoggedKeyword = null;

function getSearchKeywordFromURL() {
  const url = new URL(window.location.href);
  const keyword = url.searchParams.get("k");

  // Only run on Amazon search pages
  if (!keyword || !location.pathname.startsWith("/s")) return;

  const decodedKeyword = decodeURIComponent(keyword);

  // Avoid logging same keyword multiple times
  if (decodedKeyword === lastLoggedKeyword) return;
  lastLoggedKeyword = decodedKeyword;

  const datetime = new Date().toISOString(); // Use ISO format for server-side parsing
  const device = /Mobile|Android/i.test(navigator.userAgent) ? "Mobile" : "Desktop";
  const category = location.pathname.split("/")[1] || "Unknown";

  const data = {
    keyword: decodedKeyword,
    timestamp: datetime,
    url: window.location.href,
    category,
    source: "amazon",
    device
  };

  console.log("📤 Sending to backend:", data);

  fetch(BACKEND_LOG_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  })
    .then(res => res.json())
    .then(response => console.log("✅ Logged to sheet via server:", response))
    .catch(err => console.error("❌ Backend logging error:", err));
}

// Detect URL changes in SPA (Amazon is SPA-like)
let lastUrl = location.href;
const observer = new MutationObserver(() => {
  if (location.href !== lastUrl) {
    lastUrl = location.href;
    getSearchKeywordFromURL();
  }
});
observer.observe(document, { childList: true, subtree: true });

// Initial trigger
getSearchKeywordFromURL();
