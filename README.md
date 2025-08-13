# ZEPP Saver - Developer Documentation

## Overview

ZEPP Saver is a Chrome Extension that helps users compare prices between major e-commerce platforms (Amazon, Flipkart, Nykaa) and ZEPP's student discount platform. The extension automatically injects price comparison popups, manages gift card offers, and provides authentication for student discounts.

## Architecture

### Extension Structure
```
zepp-saver/
├── manifest.json              # Extension configuration
├── popup.html                 # Extension popup UI
├── popup.js                   # Popup logic and price comparison
├── auth.js                    # Authentication utilities
├── gc.js                      # Standalone gift card system
├── content.js                 # Amazon product page integration
├── flipkart.js               # Flipkart product page integration
├── nykaa.js                  # Nykaa product page integration
├── amazoncart.js             # Amazon cart price comparison
├── flipkartcart.js           # Flipkart cart price comparison
├── amazondc.js               # Amazon domain controller
├── flipkartdc.js             # Flipkart domain controller
└── assets/                   # Icons, fonts, and resources
```

## Application Flow

### 1. Extension Initialization
```mermaid
graph TD
    A[User visits e-commerce site] --> B{Site Detection}
    B -->|Amazon| C[Load content.js + auth.js + amazondc.js + amazoncart.js]
    B -->|Flipkart Product| D[Load flipkart.js]
    B -->|Flipkart Cart| E[Load flipkartcart.js]
    B -->|Nykaa| F[Load nykaa.js]
    B -->|Other Sites| G[Load gc.js for gift cards]
```

### 2. Product Page Integration Flow

#### Amazon (content.js)
```mermaid
graph TD
    A[Page Load] --> B[Extract ASIN & Price]
    B --> C[Check Authentication Status]
    C --> D[Inject Popup Container]
    D --> E{User Authenticated?}
    E -->|Yes| F[Fetch ZEPP Price API]
    E -->|No| G[Show Login Form]
    F --> H{ZEPP Price Available?}
    H -->|Yes| I[Show Price Comparison + Hide Gift Cards]
    H -->|No| J[Hide Price Section + Show Gift Cards]
    G --> K[Show Gift Cards]
    I --> L[Enable Shop Now Button]
    J --> M[Keep Shop Now Hidden]
```

#### Flipkart (flipkart.js)
```mermaid
graph TD
    A[Product Page Detection] --> B[Extract FSN & Price]
    B --> C[Wait for Price & PID Load]
    C --> D[Check Authentication]
    D --> E[Inject Popup with Flipkart Branding]
    E --> F[Fetch ZEPP Price via FSN]
    F --> G{Price Available?}
    G -->|Yes| H[Show Comparison + Hide Gift Cards]
    G -->|No| I[Show Gift Cards Only]
```

#### Nykaa (nykaa.js)
```mermaid
graph TD
    A[Page Load] --> B[Extract Nykaa SKU & Price]
    B --> C[Check Authentication]
    C --> D[Inject Popup with Nykaa Branding]
    D --> E[Fetch ZEPP Price via nyka_sku]
    E --> F{Price Available?}
    F -->|Yes| G[Show Comparison]
    F -->|No| H[Show Gift Cards]
```

### 3. Authentication System Flow

```mermaid
graph TD
    A[User Clicks Login] --> B[Show Email Form]
    B --> C[User Enters Student Email]
    C --> D[Send OTP Request]
    D --> E[Show OTP Form]
    E --> F[User Enters OTP]
    F --> G[Verify OTP]
    G -->|Valid| H[Store Auth Data in Chrome Storage]
    G -->|Invalid| I[Show Error Message]
    H --> J[Refresh UI to Show Authenticated State]
    J --> K[Enable Price Comparisons]
    J --> L[Hide Gift Cards if ZEPP Price Available]
```

### 4. Gift Card System Flow

```mermaid
graph TD
    A[Page Load] --> B[Check Authentication Status]
    B --> C[Check ZEPP Price Availability]
    C --> D{Show Gift Card?}
    D -->|User NOT authenticated OR No ZEPP price| E[Show Skeleton Loader]
    D -->|User authenticated AND ZEPP price available| F[Hide Gift Cards]
    E --> G[Fetch Gift Card API]
    G -->|Success| H[Display Gift Card with Discount Badge]
    G -->|Fail| I[Use Fallback Mock Data]
    H --> J[Animate Card Appearance]
    I --> J
```

### 5. Price Comparison Logic

```mermaid
graph TD
    A[Product Detected] --> B[Extract Product ID]
    B --> C{ID Type}
    C -->|Amazon| D[Use ASIN with id_type=asn]
    C -->|Flipkart| E[Use FSN with id_type=fsn]
    C -->|Nykaa| F[Use SKU with id_type=nyka_sku]
    D --> G[API Call: localhost:3000/api/price]
    E --> G
    F --> G
    G --> H[Parse special_price + productsurcharge_fee]
    H --> I[Calculate Final ZEPP Price]
    I --> J{Price Valid?}
    J -->|Yes| K[Show Price Section + Shop Now Button]
    J -->|No| L[Hide Price Section + Shop Now Button]
    K --> M[Calculate & Display Savings]
    L --> N[Show Gift Cards Instead]
```

## Core Components

### 1. Authentication (auth.js)
```javascript
// AuthManager Class - Global Instance: window.authManager
class AuthManager {
  async sendOTP(email)           // POST /api/send-otp
  async verifyOTP(email, otp)    // POST /api/verify-otp  
  async getStoredAuthData()      // Retrieve from chrome.storage.local
  async setStoredAuthData(data)  // Store to chrome.storage.local
  async logout()                 // Clear authentication state
  getAuthStatus()                // Get current auth status
  isValidStudentEmail(email)     // Email validation
}

// Storage Structure:
authData = {
  isAuthenticated: true,        // Boolean: logged in status
  email: "user@example.com",    // String: user's email  
  timestamp: 1672531200000      // Number: login timestamp
}
```

### 2. Price Formatting (All Files)
```javascript
formatIndianCurrency(amount) // ₹24,00,000 format
```

### 3. Product Detection
```javascript
// Amazon
extractAmazonPrice()        // From DOM selectors
extractASIN()              // From product details/URL

// Flipkart  
extractFlipkartPrice()     // From price elements
extractFlipkartPID()       // From URL parameters

// Nykaa
extractNykaaPrice()        // From CSS selectors  
extractNykaaPID()          // From skuId parameter
```

### 4. API Integration

#### ZEPP Price API
```javascript
// Endpoint: http://localhost:3000/api/price
// Parameters: 
//   - id_type: 'asn' | 'fsn' | 'nyka_sku'
//   - id_value: product identifier
// Response: items[0].custom_attributes[]
```

#### Authentication API
```javascript
// Send OTP Endpoint: http://localhost:3000/api/send-otp
// Method: POST
// Body: { email: "student@university.edu" }
// Response: { success: true, message: "OTP sent!" } | { success: false, error: "Error message" }

// Verify OTP Endpoint: http://localhost:3000/api/verify-otp  
// Method: POST
// Body: { email: "student@university.edu", otp: "123456" }
// Response: { success: true, message: "Authenticated!" } | { success: false, error: "Invalid OTP" }

// Development Fallback: 
// - If API unavailable, uses hardcoded OTP: "123456"
// - Shows warning: "🚧 Using development fallback OTP"
```

#### Gift Card API  
```javascript
// Endpoint: http://localhost:3000/giftcard
// Parameters: domain (e.g., 'amazon.in')
// Response: { discount, img, title, desc, cta, link }
```

## UI Components

### 1. Popup Structure
```html
<!-- Header with branding and controls -->
<div class="header">
  <button id="closeAutoPopup">✕</button>
  <div class="controls">
    <img id="couponicon">
    <img id="infoicon">  
    <img id="settingsicon">
  </div>
</div>

<!-- Price Comparison (conditionally shown) -->
<div id="priceSection">
  <div class="price-row">Platform Price</div>
  <div class="price-row">ZEPP Price</div>
  <div class="savings">Savings Amount</div>
</div>

<!-- Authentication Forms -->
<div id="authPrompt">
  <button id="loginBtn">Student Login</button>
</div>
<div id="loginForm">
  <!-- Email/OTP forms -->
</div>

<!-- Gift Cards (conditionally shown) -->
<div id="giftCardSection">
  <!-- Gift card with discount highlighting -->
</div>

<!-- Shop Now Button (conditionally shown) -->
<a id="ctaBtn">Shop Now</a>
```

### 2. Conditional Visibility Logic
```javascript
// Price Section: Show only if authenticated AND ZEPP price available
updatePriceSectionVisibility(isAuthenticated, zeppPriceAvailable)

// Shop Now Button: Same conditions as price section  
updateShopNowButtonVisibility(isAuthenticated, zeppPriceAvailable)

// Gift Cards: Show if NOT authenticated OR no ZEPP price
shouldShowGiftCard = !isAuthenticated || !zeppPriceAvailable
```

## Development Setup

### Prerequisites
- Chrome/Chromium browser
- Local ZEPP API server running on localhost:3000
- Basic understanding of Chrome Extension Manifest V3

### Installation
1. Clone the repository
2. Open Chrome → Extensions → Developer Mode
3. Load Unpacked → Select project folder
4. Test on supported e-commerce sites

### API Requirements
The extension expects these endpoints:
```
GET  http://localhost:3000/api/price?id_type={type}&id_value={id}
GET  http://localhost:3000/giftcard?domain={domain}
POST http://localhost:3000/api/log-product (for analytics)
POST http://localhost:3000/api/send-otp (authentication)
POST http://localhost:3000/api/verify-otp (authentication)
```

## Key Features

### 1. Multi-Platform Support
- **Amazon**: ASIN-based product matching
- **Flipkart**: FSN-based product matching  
- **Nykaa**: SKU-based product matching
- **Universal**: Gift card system for unsupported domains

### 2. Smart UI Logic
- **Skeleton Loading**: Prevents sudden content appearance
- **Conditional Rendering**: Shows relevant content based on auth/price status
- **Responsive Design**: Adapts to different screen sizes
- **Indian Currency Formatting**: Proper lakhs/crores display

### 3. Authentication System
- **Student Email Validation**: Ensures academic email domains
- **OTP Verification**: Secure login process
- **Persistent Sessions**: Chrome Storage integration
- **Inline Forms**: No external redirects

### 4. Performance Optimizations
- **Lazy Loading**: Gift cards load only when needed
- **API Caching**: Reduces redundant price checks
- **DOM Observers**: Handles SPA navigation
- **Debounced Updates**: Prevents excessive API calls

## Browser Permissions

```json
{
  "permissions": ["activeTab", "scripting", "storage"],
  "host_permissions": [
    "https://script.google.com/*",
    "http://localhost:3000/*"
  ]
}
```

## Security Considerations

1. **No Sensitive Data Storage**: Only authentication status and email
2. **Local API Only**: No external API keys in code
3. **Content Script Isolation**: Runs in isolated context
4. **CSP Compliance**: Follows Chrome Extension security policies

## Testing Strategy

### Core Functionality Tests

#### 🛍️ **Product Page Integration**
- [ ] **Amazon (content.js)**
  - [ ] ASIN extraction from product URLs and tables
  - [ ] Price extraction from DOM selectors and JSON-LD
  - [ ] Popup injection and positioning (300px width)
  - [ ] White header with #4755A5 trigger icon
- [ ] **Flipkart (flipkart.js)**
  - [ ] FSN extraction from URL parameters
  - [ ] Price detection from CSS selectors
  - [ ] Product page vs cart page detection
  - [ ] 300px popup consistency
- [ ] **Nykaa (nykaa.js)**
  - [ ] SKU extraction from URL parameters
  - [ ] Price parsing from price elements
  - [ ] Popup styling consistency with other platforms

#### 🛒 **Cart Page Integration**
- [ ] **Amazon Cart (amazoncart.js)**
  - [ ] Multiple product extraction from cart items
  - [ ] ASIN detection from data attributes
  - [ ] Cart popup with white header design
  - [ ] Total savings calculation accuracy
- [ ] **Flipkart Cart (flipkartcart.js)**
  - [ ] FSN extraction from cart product links
  - [ ] Multi-product price comparison
  - [ ] Enhanced UI with improved spacing
  - [ ] Shop Now button styling consistency

#### 💳 **Payment Page Integration**
- [ ] **Amazon Payment (amazon_payment.js)**
  - [ ] Payment page URL detection and filtering
  - [ ] Price extraction from checkout elements
  - [ ] Gift card discount calculation
  - [ ] Payment-specific popup styling
- [ ] **Flipkart Payment (flipkart_payment.js)**
  - [ ] Checkout page detection
  - [ ] Payment amount extraction
  - [ ] Gift card integration
- [ ] **Nykaa Payment (nykaa_payment.js)**
  - [ ] SPA navigation detection
  - [ ] Payment page vs address page filtering
  - [ ] Price extraction from payment elements

### 🔐 **Authentication System Tests**

#### **Login Flow**
- [ ] Student email validation and formatting
- [ ] OTP request to `/api/send-otp` endpoint
- [ ] OTP verification via `/api/verify-otp` endpoint
- [ ] Authentication state persistence in Chrome storage
- [ ] Session management across tabs and browser restarts
- [ ] Settings modal functionality (logout, user display)

#### **Shop Now Integration**
- [ ] Login-with-email API call to `/api/login-with-email`
- [ ] 30-minute redirect caching system
- [ ] Cache key generation (email + urlKey)
- [ ] Direct ZEPP link opening in new tab
- [ ] Loading states and error handling

### 📊 **Price Comparison Logic Tests**

#### **Conditional Display Logic**
- [ ] **Show Price Comparison When:**
  - [ ] Product status = 1 (active)
  - [ ] ZEPP price is available (> 0)  
  - [ ] ZEPP price < platform price
  - [ ] User is authenticated
- [ ] **Show Gift Cards When:**
  - [ ] Product status ≠ 1
  - [ ] ZEPP price ≥ platform price
  - [ ] No ZEPP price available
  - [ ] User not authenticated
  - [ ] API errors occur

#### **Price Calculation Accuracy**
- [ ] Special price + surcharge fee calculation
- [ ] Indian currency formatting (₹24,00,000 format)
- [ ] Savings calculation accuracy
- [ ] Negative savings handling (when platform cheaper)

### 🎨 **UI/UX Consistency Tests**

#### **Design System Compliance**
- [ ] **Popup Dimensions**
  - [ ] All popups exactly 300px width
  - [ ] Consistent height and positioning
  - [ ] Proper responsive behavior
- [ ] **Header Design**
  - [ ] White background (#ffffff) across all files
  - [ ] Black text color consistency
  - [ ] Inverted icons (filter: invert(1))
  - [ ] ZEPP Saver branding consistency
- [ ] **Trigger Icons**
  - [ ] #4755A5 background color on all files
  - [ ] 50px width/height consistency
  - [ ] Proper positioning and z-index

#### **Interactive Elements**
- [ ] **Shop Now Buttons**
  - [ ] #4755A5 background color
  - [ ] 100px border-radius (rounded)
  - [ ] Loading states during API calls
  - [ ] Hover effects and animations
- [ ] **Gift Card Sections**
  - [ ] Skeleton loader display
  - [ ] Smooth animations and transitions
  - [ ] Proper discount highlighting
  - [ ] CTA button functionality

### 🔄 **API Integration Tests**

#### **ZEPP Price API**
- [ ] Correct id_type parameter (asn/fsn/nyka_sku)
- [ ] Product ID formatting and validation
- [ ] Response parsing (special_price, productsurcharge_fee, url_key)
- [ ] Status field handling (1 for active products)
- [ ] Error handling for invalid product IDs

#### **Authentication API**  
- [ ] OTP send request format and validation
- [ ] OTP verification with email + code
- [ ] Login-with-email API integration
- [ ] Proper error handling for API failures
- [ ] Development fallback behavior

#### **Gift Card API**
- [ ] Domain-based gift card fetching
- [ ] Cache implementation (5-minute localStorage)
- [ ] Fallback to mock data on API failure
- [ ] Proper discount percentage display

### 🧪 **Edge Case Testing**

#### **Network & API Failures**
- [ ] No internet connection during price fetch
- [ ] API server down scenarios
- [ ] Invalid JSON responses from APIs
- [ ] Timeout handling for slow API responses
- [ ] Graceful degradation to gift cards on price API failure

#### **Product Detection Edge Cases**
- [ ] Products without clear price elements
- [ ] Invalid or malformed product IDs (ASIN/FSN/SKU)
- [ ] Products with multiple price variations
- [ ] Out of stock products
- [ ] Products with promotional pricing

#### **Authentication Edge Cases**
- [ ] Invalid email formats
- [ ] Expired OTP codes
- [ ] Multiple login attempts
- [ ] Authentication state corruption
- [ ] Cross-tab authentication sync

#### **UI Edge Cases**
- [ ] Very long product titles (text truncation)
- [ ] Extremely high/low prices (currency formatting)
- [ ] Multiple popups on same page
- [ ] Popup positioning on small screens
- [ ] Popup behavior during page navigation

### 🔍 **Cross-Platform Compatibility**

#### **Browser Testing**
- [ ] Chrome (primary target)
- [ ] Chromium-based browsers (Edge, Brave)
- [ ] Different screen resolutions
- [ ] Various zoom levels (90%, 100%, 110%, 125%)

#### **E-commerce Platform Variations**
- [ ] Amazon India regional variations
- [ ] Flipkart mobile vs desktop layouts  
- [ ] Nykaa app vs web differences
- [ ] Cart page layout changes over time
- [ ] Payment page UI updates

### 📱 **Performance Testing**

#### **Loading Performance**
- [ ] Popup injection speed (<500ms)
- [ ] API response times (<2 seconds)
- [ ] Cache hit performance (<100ms)
- [ ] Memory usage optimization
- [ ] No memory leaks during navigation

#### **User Experience**
- [ ] Smooth animations and transitions
- [ ] No UI blocking during API calls
- [ ] Proper loading states visibility
- [ ] Intuitive interaction flows
- [ ] Accessible design compliance

### 🔒 **Security Testing**

#### **Data Protection**
- [ ] No sensitive data in console logs
- [ ] Secure storage of authentication tokens
- [ ] Proper input validation and sanitization
- [ ] No XSS vulnerabilities in dynamic content
- [ ] HTTPS enforcement where applicable

#### **Permission Usage**  
- [ ] Minimal required permissions only
- [ ] No unnecessary data access
- [ ] Proper content script isolation
- [ ] Secure API communication

## Troubleshooting

### Common Issues
1. **Popup not appearing**: Check product ID extraction
2. **Price not loading**: Verify API endpoint accessibility  
3. **Authentication failing**: Check OTP generation/validation
4. **Gift cards not showing**: Review conditional logic
5. **Currency formatting wrong**: Verify formatIndianCurrency function

### Debug Tools
- Chrome DevTools Console
- Extension popup debugging
- Chrome Storage inspection
- Network tab for API calls

## Contributing

1. Follow existing code patterns
2. Test on all supported platforms
3. Maintain backward compatibility
4. Update documentation for new features
5. Use Indian currency formatting for all prices

## Future Enhancements

- [ ] Additional e-commerce platform support
- [ ] Advanced price tracking/alerts  
- [ ] Bulk cart comparison improvements
- [ ] Analytics dashboard integration
- [ ] Mobile app companion
- [ ] Wishlist price monitoring

## Recent Updates & Changes

### Latest Development Session Changes:

#### 🆕 **New Features Added:**

1. **Smart Price Comparison Logic**
   - Implemented conditional display logic: price comparison shows only when status=1 AND ZEPP price < Amazon price
   - When conditions aren't met, gift card section displays instead of hiding everything
   - Enhanced user experience by always showing relevant content (either price comparison or gift cards)
   - Applied across all API error cases and "no ZEPP items" scenarios

2. **Login-with-Email API Integration**
   - Added `handleShopNowClick()` function with caching system for 30-minute redirect sessions  
   - Integrated with `/api/login-with-email` endpoint for seamless ZEPP platform access
   - Smart caching prevents repeated API calls for same user/product combinations
   - Enhanced Shop Now button with loading states and error handling

3. **Unified UI Design System**
   - Standardized popup width to 300px across all platforms for consistency
   - Updated trigger icon background color to brand color #4755A5 (from black #000000)
   - Synchronized header design: white backgrounds with black text and inverted icons
   - Applied modern design language with rounded buttons (border-radius: 100px)
   - Enhanced cart UI with improved spacing, typography, and color scheme

4. **Enhanced Payment Page Integration**
   - Added `amazon_payment.js` for Amazon checkout pages with gift card discount calculation
   - Improved price extraction strategies with multiple fallback selectors
   - Real-time payment amount analysis and discount suggestions
   - Payment-specific UI with different styling from product pages

#### 🎨 **UI/UX Improvements:**

1. **Modern White Header Design**
   - Updated from dark headers (#242424) to clean white headers (#ffffff) across all files
   - Added `filter: invert(1)` for icons to maintain visibility on white backgrounds
   - Consistent "ZEPP Saver" branding with black text for better readability

2. **Enhanced Cart Interface**
   - Redesigned cart popups (amazoncart.js, flipkartcart.js) with improved spacing
   - Larger font sizes: price labels (12px→14px), price values (14px→16px)
   - Full-width Shop Now buttons with #4755A5 background and rounded corners
   - Better visual hierarchy with left-aligned text and improved margins

3. **Consistent Popup Dimensions**
   - Standardized all popup widths to 300px (from varying 350px/400px widths)
   - Uniform trigger icon styling with #4755A5 brand color
   - Better responsive design across different screen sizes

4. **Improved Interactive Elements**
   - Enhanced Shop Now buttons with hover effects and loading states
   - Better visual feedback for user interactions
   - Consistent button styling with modern rounded corners (border-radius: 100px)
   - Improved total savings section with subtle background highlighting

#### 🏗️ **Technical Improvements:**

1. **Smart Conditional Logic**
   - Enhanced price comparison conditions: show only when status=1 AND ZEPP price < platform price
   - Implemented fallback to gift cards when price comparison conditions aren't met
   - Improved error handling for API failures with graceful degradation to gift cards
   - Better user experience by always showing relevant content

2. **Advanced Caching System**
   - 30-minute Shop Now redirect caching to prevent repeated API calls
   - User-specific caching with email-based cache keys
   - Smart cache invalidation and cleanup of expired entries
   - Improved performance for frequent users

3. **API Integration Enhancements**
   - Added `/api/login-with-email` endpoint integration for seamless ZEPP access
   - Enhanced price API with better error handling and status checking
   - Improved product logging with session tracking
   - Better API response parsing and validation

4. **Code Standardization**
   - Unified design patterns across all content scripts
   - Consistent function naming and structure
   - Better separation of UI logic and business logic
   - Enhanced code reusability between platform-specific scripts

#### 🔧 **Bug Fixes:**

1. **Authentication System Fixes**
   - Fixed JSON parsing errors when backend APIs return HTML error pages
   - Resolved authentication state persistence across browser sessions and tabs
   - Fixed OTP placeholder text and user messaging inconsistencies

2. **Performance Issues**
   - Fixed slow loading on URL changes in Amazon due to gift card/price detection coupling
   - Resolved gc.js slow loading by removing artificial delays
   - Fixed SPA navigation issues in Nykaa payment flow

3. **UI and UX Fixes**
   - Fixed nykaa_payment.js showing popups on non-payment pages like address page
   - Resolved header styling inconsistencies across all scripts
   - Fixed button text inconsistencies ("Get your Code" → "Get your Gift Card")
   - Corrected discount text formatting for better readability

4. **Security Vulnerabilities**
   - Addressed critical security issues identified in security audit
   - Removed hardcoded authentication bypass (OTP: 123456)
   - Enhanced error handling to prevent information disclosure
   - Improved input validation and API response handling

### Files Modified in Latest Session:
- ✅ `content.js` - Implemented conditional price comparison logic and gift card fallback
- ✅ `flipkart.js` - Updated popup width to 300px and applied UI consistency changes
- ✅ `nykaa.js` - Already had 300px width, confirmed UI consistency
- ✅ `amazoncart.js` - Updated header design and cart UI to match flipkartcart.js
- ✅ `flipkartcart.js` - Applied white header design and improved cart interface
- ✅ `amazon_payment.js` - Updated trigger icon color to #4755A5
- ✅ `flipkart_payment.js` - Updated trigger icon color to #4755A5  
- ✅ `nykaa_payment.js` - Updated trigger icon color to #4755A5
- ✅ `flipkart copy.js` - Updated trigger icon color to #4755A5
- ✅ `flipkart_backup.js` - Updated trigger icon color to #4755A5  

### Security Status:
🔴 **Previously**: Multiple critical vulnerabilities (hardcoded OTP, unencrypted HTTP, XSS risks)
🟡 **Currently**: Partially secured (dynamic OTP implemented, fallback for development)
🟢 **Next Steps**: Full HTTPS implementation, input sanitization, permission reduction needed

### Backend Requirements:
Your API server must implement:
```bash
GET  /api/price?id_type={type}&id_value={id}  # Product price lookup
POST /api/send-otp                            # Send OTP to email
POST /api/verify-otp                          # Verify OTP code  
POST /api/login-with-email                    # Generate login links for ZEPP platform
POST /api/log-product                         # Product visit analytics
GET  /giftcard?domain={domain}                # Gift card offers by domain
```

---

*This documentation reflects the current state of the ZEPP Saver extension as of the latest development session, including the implementation of dynamic OTP authentication and comprehensive security improvements.*