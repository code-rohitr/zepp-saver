# ZEPP Saver Extension - Comprehensive Test Cases

## 🔐 **Security Test Cases**

### **Authentication Security Tests**

#### **Test Case SEC-001: OTP Fallback Removal**
- **Objective**: Verify hardcoded OTP bypass has been completely removed
- **Steps**:
  1. Navigate to any supported e-commerce site
  2. Click login button in ZEPP popup
  3. Enter any valid email address
  4. Click "Send OTP"
  5. Enter OTP as "123456" (the old fallback)
  6. Click "Verify & Login"
- **Expected Result**: ❌ Login should FAIL with "Invalid OTP" error
- **Security Impact**: Critical - Prevents authentication bypass
- **Status**: ✅ **FIXED** - Fallback removed in auth.js

#### **Test Case SEC-002: XSS Prevention in Product Titles**
- **Objective**: Verify product titles are sanitized before DOM insertion
- **Steps**:
  1. Use API to return product with malicious title: `<script>alert('XSS')</script>`
  2. Navigate to product page
  3. Check if popup displays product information
- **Expected Result**: ❌ Script should NOT execute, title should be escaped
- **Security Impact**: High - Prevents code injection
- **Status**: 🔴 **VULNERABLE** - Needs HTML sanitization

#### **Test Case SEC-003: HTTPS API Communication**
- **Objective**: Verify all API calls use HTTPS instead of HTTP
- **Steps**:
  1. Open browser DevTools Network tab
  2. Navigate to any product page and trigger API calls
  3. Check all network requests to localhost:3000
- **Expected Result**: ❌ Currently shows HTTP requests
- **Security Impact**: Critical - Prevents MITM attacks
- **Status**: 🔴 **VULNERABLE** - All APIs use HTTP

#### **Test Case SEC-004: Console Data Exposure**
- **Objective**: Verify no sensitive data is logged to console
- **Steps**:
  1. Open browser DevTools Console
  2. Complete full authentication flow
  3. Trigger Shop Now button click
  4. Search console for email addresses and tokens
- **Expected Result**: ❌ Should NOT show emails, login links, or auth data
- **Security Impact**: Medium - Prevents data leakage
- **Status**: 🔴 **VULNERABLE** - Extensive sensitive logging

#### **Test Case SEC-005: URL Validation for Redirects**
- **Objective**: Verify Shop Now button validates URLs before opening
- **Steps**:
  1. Intercept API response for login-with-email
  2. Modify loginLink to malicious URL: `https://evil.com/phish`
  3. Click Shop Now button
- **Expected Result**: ❌ Should validate and reject malicious URLs
- **Security Impact**: High - Prevents phishing attacks
- **Status**: 🔴 **VULNERABLE** - No URL validation

## 🛍️ **Functional Test Cases**

### **Product Page Integration Tests**

#### **Test Case FUNC-001: Amazon Product Detection**
- **Objective**: Verify ASIN extraction and price detection on Amazon
- **Test Data**:
  - URL: `https://www.amazon.in/dp/B08N5WRWNW`
  - Expected ASIN: `B08N5WRWNW`
- **Steps**:
  1. Navigate to Amazon product page
  2. Wait for ZEPP popup to appear
  3. Check browser console for extracted ASIN and price
- **Expected Result**: ✅ ASIN extracted correctly, price shown in popup
- **Status**: ✅ **WORKING**

#### **Test Case FUNC-002: Flipkart Product Detection**
- **Objective**: Verify FSN extraction and price detection on Flipkart
- **Test Data**:
  - URL: `https://www.flipkart.com/product/p/itm123?pid=ABC123`
  - Expected FSN: From URL parameters
- **Steps**:
  1. Navigate to Flipkart product page
  2. Wait for ZEPP popup to appear
  3. Verify FSN extraction and price display
- **Expected Result**: ✅ FSN extracted, Flipkart price detected
- **Status**: ✅ **WORKING**

#### **Test Case FUNC-003: Nykaa Product Detection**
- **Objective**: Verify SKU extraction and price detection on Nykaa
- **Test Data**:
  - URL: `https://www.nykaa.com/product?skuId=123456`
  - Expected SKU: `123456`
- **Steps**:
  1. Navigate to Nykaa product page
  2. Check SKU extraction from URL
  3. Verify price detection from page elements
- **Expected Result**: ✅ SKU extracted, price shown correctly
- **Status**: ✅ **WORKING**

### **Price Comparison Logic Tests**

#### **Test Case LOGIC-001: Conditional Display - Show Price Comparison**
- **Objective**: Verify price comparison shows when conditions are met
- **Test Conditions**:
  - Product status: 1 (active)
  - ZEPP price: ₹1,000
  - Platform price: ₹1,200
  - User: Authenticated
- **Steps**:
  1. Mock API to return status=1, special_price=1000
  2. Navigate to product with price ₹1,200
  3. Login as authenticated user
- **Expected Result**: ✅ Price comparison section visible, Shop Now button shown
- **Status**: ✅ **WORKING**

#### **Test Case LOGIC-002: Conditional Display - Show Gift Card**
- **Objective**: Verify gift card shows when price comparison conditions not met
- **Test Conditions**:
  - Product status: 0 (inactive) OR
  - ZEPP price ≥ Platform price OR
  - User not authenticated
- **Steps**:
  1. Mock API to return status=0 or higher ZEPP price
  2. Navigate to product page
- **Expected Result**: ✅ Gift card section visible, price comparison hidden
- **Status**: ✅ **WORKING**

#### **Test Case LOGIC-003: Price Calculation Accuracy**
- **Objective**: Verify savings calculation is correct
- **Test Data**:
  - Platform price: ₹5,000
  - Special price: ₹4,200
  - Surcharge: ₹300
  - Expected final price: ₹4,500
  - Expected savings: ₹500
- **Steps**:
  1. Mock API with test price data
  2. Check popup displays correct calculations
- **Expected Result**: ✅ All prices and savings calculated accurately
- **Status**: ✅ **WORKING**

### **Authentication Flow Tests**

#### **Test Case AUTH-001: Valid Email OTP Send**
- **Objective**: Verify OTP sending works with valid student email
- **Steps**:
  1. Click "Login" in ZEPP popup
  2. Enter valid email: `student@university.edu`
  3. Click "Send OTP"
- **Expected Result**: ✅ "OTP sent to your email!" message, OTP step shown
- **Status**: ✅ **WORKING** (requires backend API)

#### **Test Case AUTH-002: Invalid Email Validation**
- **Objective**: Verify invalid emails are rejected
- **Test Data**: `invalid-email`, `test@`, `@domain.com`
- **Steps**:
  1. Enter invalid email format
  2. Click "Send OTP"
- **Expected Result**: ✅ "Please enter a valid email address" error
- **Status**: ✅ **WORKING**

#### **Test Case AUTH-003: OTP Verification Success**
- **Objective**: Verify valid OTP authenticates user
- **Prerequisites**: Valid OTP received from backend
- **Steps**:
  1. Complete email step successfully
  2. Enter correct OTP from email
  3. Click "Verify & Login"
- **Expected Result**: ✅ "Login successful!" message, page refresh, authenticated state
- **Status**: ✅ **WORKING** (requires backend API)

#### **Test Case AUTH-004: OTP Verification Failure**
- **Objective**: Verify invalid OTP is rejected
- **Steps**:
  1. Complete email step
  2. Enter incorrect OTP: `000000`
  3. Click "Verify & Login"
- **Expected Result**: ✅ "Invalid OTP" error message
- **Status**: ✅ **WORKING**

#### **Test Case AUTH-005: Session Persistence**
- **Objective**: Verify authentication persists across tabs/browser restarts
- **Steps**:
  1. Complete authentication flow
  2. Open new tab to same e-commerce site
  3. Restart browser and revisit site
- **Expected Result**: ✅ User remains authenticated in all scenarios
- **Status**: ✅ **WORKING**

### **UI Consistency Tests**

#### **Test Case UI-001: Popup Width Consistency**
- **Objective**: Verify all popups are exactly 300px wide
- **Sites to test**: Amazon, Flipkart, Nykaa, Cart pages
- **Steps**:
  1. Navigate to each site
  2. Inspect ZEPP popup element
  3. Measure width using DevTools
- **Expected Result**: ✅ All popups exactly 300px wide
- **Status**: ✅ **WORKING**

#### **Test Case UI-002: Header Design Consistency**
- **Objective**: Verify all headers use white background with inverted icons
- **Steps**:
  1. Check header background color: `#ffffff`
  2. Check text color: `black`
  3. Verify icons have `filter: invert(1)`
- **Expected Result**: ✅ Consistent white header design across all files
- **Status**: ✅ **WORKING**

#### **Test Case UI-003: Trigger Icon Color**
- **Objective**: Verify all trigger icons use brand color
- **Steps**:
  1. Inspect trigger icon on each platform
  2. Check background color
- **Expected Result**: ✅ All trigger icons use `#4755A5` background
- **Status**: ✅ **WORKING**

#### **Test Case UI-004: Button Styling**
- **Objective**: Verify consistent button styling across platforms
- **Elements to check**: Shop Now buttons, Gift Card CTAs
- **Expected Styles**:
  - Background: `#4755A5`
  - Border-radius: `100px`
  - Hover effects working
- **Status**: ✅ **WORKING**

### **Cart Integration Tests**

#### **Test Case CART-001: Amazon Cart Detection**
- **Objective**: Verify cart page detection and product extraction
- **Steps**:
  1. Add products to Amazon cart
  2. Navigate to cart page
  3. Check ZEPP popup appears with cart items
- **Expected Result**: ✅ Cart popup shows with multiple products, total savings
- **Status**: ✅ **WORKING**

#### **Test Case CART-002: Flipkart Cart Detection**
- **Objective**: Verify Flipkart cart integration
- **Steps**:
  1. Add products to Flipkart cart
  2. Navigate to cart page
  3. Verify product extraction and pricing
- **Expected Result**: ✅ Cart popup with improved UI design
- **Status**: ✅ **WORKING**

#### **Test Case CART-003: Total Savings Calculation**
- **Objective**: Verify accurate total savings across cart items
- **Test Data**:
  - Item 1: ₹500 savings
  - Item 2: ₹300 savings
  - Expected total: ₹800
- **Status**: ✅ **WORKING**

### **Payment Integration Tests**

#### **Test Case PAY-001: Amazon Payment Detection**
- **Objective**: Verify payment page detection and amount extraction
- **Steps**:
  1. Navigate to Amazon checkout
  2. Verify payment popup appears
  3. Check payment amount extraction accuracy
- **Expected Result**: ✅ Payment popup with gift card discount calculation
- **Status**: ✅ **WORKING**

#### **Test Case PAY-002: Flipkart Payment Detection**
- **Objective**: Verify Flipkart payment page integration
- **Steps**:
  1. Navigate to Flipkart checkout
  2. Check payment amount detection
  3. Verify UI consistency with other payment pages
- **Expected Result**: ✅ Consistent white header, proper discount calculation
- **Status**: ✅ **WORKING**

#### **Test Case PAY-003: Nykaa Payment SPA Navigation**
- **Objective**: Verify payment detection works with SPA navigation
- **Steps**:
  1. Navigate from address page to payment page
  2. Verify popup only shows on actual payment page
- **Expected Result**: ✅ No popup on address page, popup on payment page
- **Status**: ✅ **WORKING**

## 🔄 **API Integration Tests**

#### **Test Case API-001: Price API Response Handling**
- **Endpoint**: `GET /api/price?id_type=asn&id_value=B08N5WRWNW`
- **Expected Response**:
```json
{
  "items": [{
    "status": 1,
    "custom_attributes": [
      {"attribute_code": "special_price", "value": "4500"},
      {"attribute_code": "productsurcharge_fee", "value": "200"},
      {"attribute_code": "url_key", "value": "product-name"}
    ]
  }]
}
```
- **Test**: Verify proper parsing and calculation
- **Status**: ✅ **WORKING**

#### **Test Case API-002: Gift Card API Fallback**
- **Objective**: Verify fallback to mock data when API fails
- **Steps**:
  1. Disconnect from internet
  2. Trigger gift card loading
- **Expected Result**: ✅ Shows mock gift card data for amazon.in/flipkart.com
- **Status**: ✅ **WORKING**

#### **Test Case API-003: Login-with-Email API**
- **Endpoint**: `POST /api/login-with-email`
- **Request Body**: `{"email": "user@example.com", "urlKey": "product-name"}`
- **Test**: Verify caching and URL opening
- **Status**: ✅ **WORKING** (requires backend)

## 🧪 **Edge Case Tests**

#### **Test Case EDGE-001: Very Long Product Titles**
- **Test Data**: Product title with 200+ characters
- **Expected Result**: ✅ Title truncated with ellipsis, no layout breaking
- **Status**: ✅ **WORKING** (CSS handles with -webkit-line-clamp: 2)

#### **Test Case EDGE-002: Network Failure Recovery**
- **Steps**:
  1. Disconnect internet
  2. Navigate to product page
  3. Reconnect internet
- **Expected Result**: ✅ Falls back to gift cards, recovers when network returns
- **Status**: ✅ **WORKING**

#### **Test Case EDGE-003: Multiple Tabs Authentication**
- **Steps**:
  1. Open ZEPP extension in 3 different tabs
  2. Login in tab 1
  3. Check authentication state in tabs 2 and 3
- **Expected Result**: ✅ All tabs show authenticated state
- **Status**: ⚠️ **NEEDS TESTING** - Potential race condition

#### **Test Case EDGE-004: Price Equal Condition**
- **Test Data**: ZEPP price = Platform price (₹1,000 each)
- **Expected Result**: ✅ Should show gift card (since ZEPP price NOT less than platform)
- **Status**: ✅ **WORKING** (condition: `finalPrice >= price`)

## 🚨 **Security Regression Tests**

#### **Test Case REGR-001: OTP Bypass Prevention**
- **Objective**: Confirm hardcoded OTP cannot be used
- **Steps**:
  1. Try login with any email
  2. Enter OTP: `123456`, `000000`, `111111`, `999999`
  3. Try common test OTPs
- **Expected Result**: ✅ ALL attempts should fail with "Invalid OTP"
- **Status**: ✅ **SECURE** - Fallback completely removed

#### **Test Case REGR-002: Console Data Audit**
- **Objective**: Regular check for new sensitive data exposure
- **Steps**:
  1. Complete full user journey
  2. Search console for: email, login, password, token, auth
- **Expected Result**: ❌ Should find NO sensitive data
- **Status**: 🔴 **FAILING** - Still extensive logging

#### **Test Case REGR-003: XSS Attack Vectors**
- **Test Payloads**:
  - `<script>alert('XSS')</script>`
  - `javascript:alert('XSS')`
  - `"><script>alert('XSS')</script>`
- **Injection Points**: Product names, API responses
- **Expected Result**: ❌ All payloads should be sanitized
- **Status**: 🔴 **VULNERABLE**

## 📊 **Performance Tests**

#### **Test Case PERF-001: Popup Injection Speed**
- **Objective**: Verify popup appears within 500ms
- **Steps**:
  1. Navigate to product page
  2. Measure time until popup visible
- **Expected Result**: ✅ < 500ms injection time
- **Status**: ✅ **WORKING**

#### **Test Case PERF-002: Memory Leak Detection**
- **Steps**:
  1. Navigate between 20+ product pages
  2. Monitor memory usage in DevTools
- **Expected Result**: ✅ No significant memory growth
- **Status**: ⚠️ **NEEDS MONITORING** - Event listeners may accumulate

## 📱 **Cross-Browser Compatibility**

#### **Test Case COMPAT-001: Chrome Versions**
- **Versions to test**: Chrome 100+, Chrome Beta, Chrome Canary
- **Expected Result**: ✅ Full functionality on all versions
- **Status**: ✅ **WORKING**

#### **Test Case COMPAT-002: Chromium-Based Browsers**
- **Browsers**: Microsoft Edge, Brave Browser
- **Expected Result**: ✅ Extension should work identically
- **Status**: ⚠️ **NEEDS TESTING**

## 📋 **Test Summary Dashboard**

| **Category** | **Total** | **Passing** | **Failing** | **Needs Testing** |
|-------------|-----------|-------------|-------------|-------------------|
| **Security** | 5 | 1 | 4 | 0 |
| **Functional** | 3 | 3 | 0 | 0 |
| **Logic** | 3 | 3 | 0 | 0 |
| **Authentication** | 5 | 5 | 0 | 0 |
| **UI Consistency** | 4 | 4 | 0 | 0 |
| **Cart Integration** | 3 | 3 | 0 | 0 |
| **Payment Integration** | 3 | 3 | 0 | 0 |
| **API Integration** | 3 | 3 | 0 | 0 |
| **Edge Cases** | 4 | 3 | 0 | 1 |
| **Security Regression** | 3 | 1 | 2 | 0 |
| **Performance** | 2 | 1 | 0 | 1 |
| **Compatibility** | 2 | 1 | 0 | 1 |

## 🎯 **Testing Priorities**

### **Immediate (Critical)**
1. ✅ **SEC-001**: OTP fallback removal (**COMPLETED**)
2. 🔴 **SEC-002**: XSS prevention
3. 🔴 **SEC-003**: HTTPS migration
4. 🔴 **SEC-004**: Console data removal

### **High Priority**
5. 🔴 **SEC-005**: URL validation
6. ⚠️ **EDGE-003**: Multi-tab authentication
7. ⚠️ **PERF-002**: Memory leak monitoring

### **Medium Priority**
8. ⚠️ **COMPAT-002**: Cross-browser testing
9. Regular security regression testing
10. Performance optimization validation

## 🔒 **Security Test Status**

**Current Security Score**: 🔴 **4/5 Critical Issues Remaining**

**Recently Fixed**: ✅ Hardcoded OTP bypass vulnerability eliminated

**Next Priority**: XSS prevention and HTTPS migration for immediate security improvement.

---

*Last Updated: $(date)*  
*Test Environment: Chrome Extension Development*  
*Security Status: High Risk - Multiple Critical Vulnerabilities Remain*