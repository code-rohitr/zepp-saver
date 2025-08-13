/**
 * Authentication module for ZEPP extension
 * Handles user login state, email verification, and OTP flow
 */

const API_BASE_URL = 'http://localhost:3000/api';

class AuthManager {
  constructor() {
    this.isAuthenticated = false;
    this.userEmail = null;
    this.init();
  }

  async init() {
    // Check if user is already authenticated
    const authData = await this.getStoredAuthData();
    if (authData && authData.isAuthenticated) {
      this.isAuthenticated = true;
      this.userEmail = authData.email;
    }
  }

  async getStoredAuthData() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['authData'], (result) => {
        resolve(result.authData || null);
      });
    });
  }

  async setStoredAuthData(data) {
    return new Promise((resolve) => {
      chrome.storage.local.set({ authData: data }, () => {
        resolve();
      });
    });
  }

  async sendOTP(email) {
    if (!this.isValidStudentEmail(email)) {
      return { success: false, error: 'Please use a valid student email address' };
    }
    
    try {
      const response = await fetch(`${API_BASE_URL}/send-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email })
      });

      const result = await response.json();
      if (response.ok) {
        return { success: true, message: result.message };
      } else {
        return { success: false, error: result.error || 'Failed to send OTP' };
      }
    } catch (error) {
      console.log('OTP send error:', error);
      return { success: false, error: 'Failed to send OTP' };
    }
  }

  async verifyOTP(email, otp) {
    if (!this.isValidStudentEmail(email)) {
      return { success: false, error: 'Please use a valid student email address' };
    }
    
    // Hardcoded fallback for testing
    if (otp === '123456') {
      this.isAuthenticated = true;
      this.userEmail = email;
      
      await this.setStoredAuthData({
        isAuthenticated: true,
        email: email,
        timestamp: Date.now()
      });

      return { success: true, message: 'OTP verified successfully' };
    }
    
    try {
      const response = await fetch(`${API_BASE_URL}/verify-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, otp })
      });

      const result = await response.json();
      if (response.ok) {
        // Store authentication state
        this.isAuthenticated = true;
        this.userEmail = email;
        
        await this.setStoredAuthData({
          isAuthenticated: true,
          email: email,
          timestamp: Date.now()
        });

        return { success: true, message: result.message };
      } else {
        return { success: false, error: result.error || 'Invalid OTP' };
      }
    } catch (error) {
      console.log('OTP verification error:', error);
      return { success: false, error: 'Invalid OTP' };
    }
  }

  async logout() {
    this.isAuthenticated = false;
    this.userEmail = null;
    
    await this.setStoredAuthData({
      isAuthenticated: false,
      email: null,
      timestamp: null
    });
  }

  getAuthStatus() {
    return {
      isAuthenticated: this.isAuthenticated,
      email: this.userEmail
    };
  }

  isValidStudentEmail(email) {
    // Basic email validation
    return email && email.includes('@') && email.includes('.');
  }
}

// Global auth manager instance
window.authManager = new AuthManager();