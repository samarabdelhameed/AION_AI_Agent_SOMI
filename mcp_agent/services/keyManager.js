/**
 * @fileoverview Secure Key Management System
 * @description Handles encryption, storage, and rotation of sensitive keys
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

export class KeyManager {
  constructor() {
    this.algorithm = 'aes-256-gcm';
    this.keyLength = 32;
    this.ivLength = 16;
    this.tagLength = 16;
    this.masterKey = null;
    this.encryptedKeys = new Map();
    this.keyRotationInterval = 24 * 60 * 60 * 1000; // 24 hours
    this.lastRotation = new Date();
  }

  /**
   * Initialize key manager with master key
   */
  async initialize() {
    try {
      // Generate or load master key
      await this.loadOrGenerateMasterKey();
      
      // Load encrypted keys
      await this.loadEncryptedKeys();
      
      console.log('✅ Key Manager initialized successfully');
      return { success: true };
    } catch (error) {
      console.error('❌ Key Manager initialization failed:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Generate or load master key
   */
  async loadOrGenerateMasterKey() {
    const masterKeyPath = path.join(process.cwd(), '.kiro', 'master.key');
    
    try {
      // Try to load existing master key
      if (fs.existsSync(masterKeyPath)) {
        this.masterKey = fs.readFileSync(masterKeyPath);
        console.log('📖 Master key loaded from file');
      } else {
        // Generate new master key
        this.masterKey = crypto.randomBytes(this.keyLength);
        
        // Ensure .kiro directory exists
        const kiroDir = path.dirname(masterKeyPath);
        if (!fs.existsSync(kiroDir)) {
          fs.mkdirSync(kiroDir, { recursive: true });
        }
        
        // Save master key securely
        fs.writeFileSync(masterKeyPath, this.masterKey, { mode: 0o600 });
        console.log('🔑 New master key generated and saved');
      }
    } catch (error) {
      throw new Error(`Failed to load/generate master key: ${error.message}`);
    }
  }

  /**
   * Load encrypted keys from storage
   */
  async loadEncryptedKeys() {
    const keysPath = path.join(process.cwd(), '.kiro', 'keys.enc');
    
    if (fs.existsSync(keysPath)) {
      try {
        const encryptedData = fs.readFileSync(keysPath);
        const decryptedData = this.decrypt(encryptedData);
        const keys = JSON.parse(decryptedData);
        
        Object.entries(keys).forEach(([name, keyData]) => {
          this.encryptedKeys.set(name, keyData);
        });
        
        console.log(`📚 Loaded ${this.encryptedKeys.size} encrypted keys`);
      } catch (error) {
        console.warn('⚠️ Failed to load encrypted keys:', error.message);
      }
    }
  }

  /**
   * Save encrypted keys to storage
   */
  async saveEncryptedKeys() {
    const keysPath = path.join(process.cwd(), '.kiro', 'keys.enc');
    
    try {
      const keysObject = Object.fromEntries(this.encryptedKeys);
      const jsonData = JSON.stringify(keysObject);
      const encryptedData = this.encrypt(jsonData);
      
      fs.writeFileSync(keysPath, encryptedData, { mode: 0o600 });
      console.log('💾 Encrypted keys saved successfully');
    } catch (error) {
      throw new Error(`Failed to save encrypted keys: ${error.message}`);
    }
  }

  /**
   * Encrypt data using master key
   */
  encrypt(data) {
    const iv = crypto.randomBytes(this.ivLength);
    const cipher = crypto.createCipher(this.algorithm, this.masterKey, { iv });
    
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const tag = cipher.getAuthTag();
    
    // Combine iv, tag, and encrypted data
    return Buffer.concat([iv, tag, Buffer.from(encrypted, 'hex')]);
  }

  /**
   * Decrypt data using master key
   */
  decrypt(encryptedBuffer) {
    const iv = encryptedBuffer.slice(0, this.ivLength);
    const tag = encryptedBuffer.slice(this.ivLength, this.ivLength + this.tagLength);
    const encrypted = encryptedBuffer.slice(this.ivLength + this.tagLength);
    
    const decipher = crypto.createDecipher(this.algorithm, this.masterKey, { iv });
    decipher.setAuthTag(tag);
    
    let decrypted = decipher.update(encrypted, null, 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  /**
   * Store encrypted key
   */
  async storeKey(name, key, metadata = {}) {
    try {
      const keyData = {
        key,
        metadata: {
          ...metadata,
          createdAt: new Date().toISOString(),
          lastUsed: null,
          usageCount: 0
        }
      };

      this.encryptedKeys.set(name, keyData);
      await this.saveEncryptedKeys();
      
      console.log(`🔐 Key '${name}' stored successfully`);
      return { success: true };
    } catch (error) {
      throw new Error(`Failed to store key '${name}': ${error.message}`);
    }
  }

  /**
   * Retrieve and decrypt key
   */
  async getKey(name) {
    try {
      const keyData = this.encryptedKeys.get(name);
      if (!keyData) {
        throw new Error(`Key '${name}' not found`);
      }

      // Update usage statistics
      keyData.metadata.lastUsed = new Date().toISOString();
      keyData.metadata.usageCount++;
      
      await this.saveEncryptedKeys();
      
      return keyData.key;
    } catch (error) {
      throw new Error(`Failed to retrieve key '${name}': ${error.message}`);
    }
  }

  /**
   * Generate new key
   */
  generateKey(length = 32) {
    return crypto.randomBytes(length).toString('hex');
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
   * Hash password with salt
   */
  hashPassword(password, salt = null) {
    const actualSalt = salt || crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, actualSalt, 10000, 64, 'sha512').toString('hex');
    return { hash, salt: actualSalt };
  }

  /**
   * Verify password hash
   */
  verifyPassword(password, hash, salt) {
    const verifyHash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
    return hash === verifyHash;
  }

  /**
   * Rotate keys (should be called periodically)
   */
  async rotateKeys() {
    try {
      const now = new Date();
      const timeSinceRotation = now - this.lastRotation;
      
      if (timeSinceRotation < this.keyRotationInterval) {
        return { rotated: false, reason: 'Too early for rotation' };
      }

      // Generate new master key
      const oldMasterKey = this.masterKey;
      this.masterKey = crypto.randomBytes(this.keyLength);
      
      // Re-encrypt all keys with new master key
      const tempKeys = new Map();
      for (const [name, keyData] of this.encryptedKeys.entries()) {
        tempKeys.set(name, keyData);
      }
      
      this.encryptedKeys.clear();
      for (const [name, keyData] of tempKeys.entries()) {
        await this.storeKey(name, keyData.key, keyData.metadata);
      }
      
      // Save new master key
      const masterKeyPath = path.join(process.cwd(), '.kiro', 'master.key');
      fs.writeFileSync(masterKeyPath, this.masterKey, { mode: 0o600 });
      
      this.lastRotation = now;
      
      console.log('🔄 Key rotation completed successfully');
      return { rotated: true, timestamp: now.toISOString() };
      
    } catch (error) {
      console.error('❌ Key rotation failed:', error.message);
      throw error;
    }
  }

  /**
   * Get key statistics
   */
  getKeyStats() {
    const stats = {
      totalKeys: this.encryptedKeys.size,
      lastRotation: this.lastRotation.toISOString(),
      nextRotation: new Date(this.lastRotation.getTime() + this.keyRotationInterval).toISOString(),
      keys: {}
    };

    for (const [name, keyData] of this.encryptedKeys.entries()) {
      stats.keys[name] = {
        createdAt: keyData.metadata.createdAt,
        lastUsed: keyData.metadata.lastUsed,
        usageCount: keyData.metadata.usageCount
      };
    }

    return stats;
  }

  /**
   * Delete key
   */
  async deleteKey(name) {
    try {
      if (!this.encryptedKeys.has(name)) {
        throw new Error(`Key '${name}' not found`);
      }

      this.encryptedKeys.delete(name);
      await this.saveEncryptedKeys();
      
      console.log(`🗑️ Key '${name}' deleted successfully`);
      return { success: true };
    } catch (error) {
      throw new Error(`Failed to delete key '${name}': ${error.message}`);
    }
  }

  /**
   * Check if key exists
   */
  hasKey(name) {
    return this.encryptedKeys.has(name);
  }

  /**
   * List all key names
   */
  listKeys() {
    return Array.from(this.encryptedKeys.keys());
  }
}

export default KeyManager;