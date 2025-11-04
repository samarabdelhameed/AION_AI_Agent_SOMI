/**
 * @fileoverview Security Management System
 * @description Comprehensive security measures including authentication, rate limiting, and protection
 */

import crypto from 'crypto';
import { RateLimiterMemory } from 'rate-limiter-flexible';

export class SecurityManager {
  constructor() {
    this.rateLimiters = new Map();
    this.apiKeys = new Map();
    this.sessions = new Map();
    this.setupRateLimiters();
    this.setupSecurityHeaders();
  }

  /**
   * Setup rate limiters for different endpoints
   */
  setupRateLimiters() {
    // General API rate limiter
    this.rateLimiters.set('api', new RateLimiterMemory({
      keyGenerator: (req) => req.ip,
      points: 100, // Number of requests
      duration: 60, // Per 60 seconds
    }));

    // Execution endpoint rate limiter (more restrictive)
    this.rateLimiters.set('execute', new RateLimiterMemory({
      keyGenerator: (req) => req.ip,
      points: 10, // Number of requests
      duration: 60, // Per 60 seconds
    }));

    // Decision endpoint rate limiter
    this.rateLimiters.set('decide', new RateLimiterMemory({
      keyGenerator: (req) => req.ip,
      points: 30, // Number of requests
      duration: 60, // Per 60 seconds
    }));
  }

  /**
   * Setup security headers
   */
  setupSecurityHeaders() {
    this.securityHeaders = {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline';"
    };
  }

  /**
   * Generate API key
   */
  generateApiKey() {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Generate session token
   */
  generateSessionToken() {
    return crypto.randomBytes(24).toString('hex');
  }

  /**
   * Hash password or sensitive data
   */
  hashData(data, salt = null) {
    const actualSalt = salt || crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(data, actualSalt, 10000, 64, 'sha512').toString('hex');
    return { hash, salt: actualSalt };
  }

  /**
   * Verify hashed data
   */
  verifyHash(data, hash, salt) {
    const verifyHash = crypto.pbkdf2Sync(data, salt, 10000, 64, 'sha512').toString('hex');
    return hash === verifyHash;
  }

  /**
   * Create API key
   */
  createApiKey(userId, permissions = []) {
    const apiKey = this.generateApiKey();
    const keyData = {
      userId,
      permissions,
      createdAt: new Date(),
      lastUsed: null,
      usageCount: 0
    };
    
    this.apiKeys.set(apiKey, keyData);
    return apiKey;
  }

  /**
   * Validate API key
   */
  validateApiKey(apiKey) {
    const keyData = this.apiKeys.get(apiKey);
    if (!keyData) {
      return { valid: false, error: 'Invalid API key' };
    }

    // Update usage statistics
    keyData.lastUsed = new Date();
    keyData.usageCount++;

    return { valid: true, data: keyData };
  }

  /**
   * Create session
   */
  createSession(userId, metadata = {}) {
    const sessionToken = this.generateSessionToken();
    const sessionData = {
      userId,
      createdAt: new Date(),
      lastActivity: new Date(),
      metadata,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
    };

    this.sessions.set(sessionToken, sessionData);
    return sessionToken;
  }

  /**
   * Validate session
   */
  validateSession(sessionToken) {
    const sessionData = this.sessions.get(sessionToken);
    if (!sessionData) {
      return { valid: false, error: 'Invalid session' };
    }

    if (new Date() > sessionData.expiresAt) {
      this.sessions.delete(sessionToken);
      return { valid: false, error: 'Session expired' };
    }

    // Update last activity
    sessionData.lastActivity = new Date();

    return { valid: true, data: sessionData };
  }

  /**
   * Rate limiting middleware
   */
  createRateLimitMiddleware(limiterName = 'api') {
    return async (request, reply) => {
      const limiter = this.rateLimiters.get(limiterName);
      if (!limiter) {
        return; // No rate limiting if limiter not found
      }

      try {
        await limiter.consume(request.ip);
      } catch (rateLimiterRes) {
        const secs = Math.round(rateLimiterRes.msBeforeNext / 1000) || 1;
        reply.status(429).send({
          success: false,
          error: 'Too many requests',
          retryAfter: secs
        });
        return;
      }
    };
  }

  /**
   * Security headers middleware
   */
  createSecurityMiddleware() {
    return (request, reply, done) => {
      // Add security headers
      Object.entries(this.securityHeaders).forEach(([header, value]) => {
        reply.header(header, value);
      });

      done();
    };
  }

  /**
   * Authentication middleware
   */
  createAuthMiddleware(requireAuth = false) {
    return (request, reply, done) => {
      const apiKey = request.headers['x-api-key'];
      const sessionToken = request.headers['x-session-token'];

      let authResult = { valid: false };

      // Try API key authentication
      if (apiKey) {
        authResult = this.validateApiKey(apiKey);
        if (authResult.valid) {
          request.auth = { type: 'api-key', ...authResult.data };
        }
      }
      // Try session authentication
      else if (sessionToken) {
        authResult = this.validateSession(sessionToken);
        if (authResult.valid) {
          request.auth = { type: 'session', ...authResult.data };
        }
      }

      // Check if authentication is required
      if (requireAuth && !authResult.valid) {
        reply.status(401).send({
          success: false,
          error: 'Authentication required',
          details: authResult.error
        });
        return;
      }

      done();
    };
  }

  /**
   * Input sanitization middleware
   */
  createSanitizationMiddleware() {
    return (request, reply, done) => {
      if (request.body && typeof request.body === 'object') {
        this.sanitizeObject(request.body);
      }

      if (request.query && typeof request.query === 'object') {
        this.sanitizeObject(request.query);
      }

      done();
    };
  }

  /**
   * Sanitize object recursively
   */
  sanitizeObject(obj) {
    Object.keys(obj).forEach(key => {
      if (typeof obj[key] === 'string') {
        obj[key] = this.sanitizeString(obj[key]);
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        this.sanitizeObject(obj[key]);
      }
    });
  }

  /**
   * Sanitize string input
   */
  sanitizeString(input) {
    return input
      .replace(/[<>]/g, '') // Remove potential HTML tags
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+=/gi, '') // Remove event handlers
      .replace(/script/gi, '') // Remove script tags
      .trim()
      .substring(0, 1000); // Limit length
  }

  /**
   * Get security statistics
   */
  getSecurityStats() {
    return {
      activeApiKeys: this.apiKeys.size,
      activeSessions: this.sessions.size,
      rateLimiters: Array.from(this.rateLimiters.keys()),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Cleanup expired sessions
   */
  cleanupExpiredSessions() {
    const now = new Date();
    for (const [token, session] of this.sessions.entries()) {
      if (now > session.expiresAt) {
        this.sessions.delete(token);
      }
    }
  }
}

export default SecurityManager;