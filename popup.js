document.addEventListener("DOMContentLoaded", () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.tabs.sendMessage(tabs[0].id, { type: "GET_PRICE_INFO" }, (response) => {
      if (!response) return;

      let { amazonPrice, asin } = response;

      const amazonPriceElem = document.getElementById("amazonPrice");
      const sheetPriceElem = document.getElementById("sheetPrice");
      const savingsElem = document.getElementById("savings");

      // Set Amazon price
      if (amazonPrice) {
        amazonPriceElem.innerText = `₹${parseFloat(amazonPrice).toFixed(2)}`;
      } else {
        amazonPriceElem.innerText = "Unavailable";
      }

      if (!asin) {
        sheetPriceElem.innerText = "No ASIN";
        return;
      }

      const sheetURL = `https://script.google.com/macros/s/AKfycbwdTgUY6L9wR1KMMtCuglSbj04xAIv-yTj1Y4_D7oe6Sgav34Kg39E12ztktU31Mm3xtw/exec?asin=${asin}`;

      fetch(sheetURL)
        .then(res => res.json())
        .then(data => {
          let sheetPrice = parseFloat(data.sheetPrice);
          if (!sheetPrice || isNaN(sheetPrice)) {
            sheetPriceElem.innerText = "Not found";
            return;
          }

          sheetPriceElem.innerText = `₹${sheetPrice.toFixed(2)}`;

          if (amazonPrice && !isNaN(amazonPrice)) {
            amazonPrice = parseFloat(amazonPrice);

            if (amazonPrice < sheetPrice) {
              savingsElem.innerText = `You save ₹${(sheetPrice - amazonPrice).toFixed(2)} on Amazon!`;
              savingsElem.style.color = "#28a745"; // green
            } else if (amazonPrice > sheetPrice) {
              savingsElem.innerText = `It's ₹${(amazonPrice - sheetPrice).toFixed(2)} cheaper on ZEPP.`;
              savingsElem.style.color = "#d32f2f"; // red
            } else {
              savingsElem.innerText = "Both prices are the same.";
              savingsElem.style.color = "#333";
            }
          }
        })
        .catch(err => {
          console.error("Sheet fetch error:", err);
          sheetPriceElem.innerText = "Fetch error";
        });
    });
  });
});
