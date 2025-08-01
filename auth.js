/**
 * Authentication module for ZEPP extension
 * Handles user login state, email verification, and OTP flow
 */

const AUTH_API_BASE = 'http://localhost:3000/auth';

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
    try {
      const response = await fetch(`${AUTH_API_BASE}/send-otp`, {
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
      console.error('OTP send error:', error);
      return { success: false, error: 'Network error' };
    }
  }

  async verifyOTP(email, otp) {
    try {
      const response = await fetch(`${AUTH_API_BASE}/verify-otp`, {
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
      console.error('OTP verification error:', error);
      return { success: false, error: 'Network error' };
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
    // Accept any valid email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}

// Global auth manager instance
window.authManager = new AuthManager();