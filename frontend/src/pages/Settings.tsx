import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { 
  User, Shield, Wallet, Bell, Code, Globe, Save, Trash2, 
  Download, Upload, RotateCcw, CheckCircle, AlertTriangle,
  Eye, EyeOff, Copy, ExternalLink, Settings as SettingsIcon,
  Lock, Smartphone, Monitor, Zap
} from 'lucide-react';
import { Page } from '../App';
import { 
  settingsService, 
  type UserProfile, 
  type RiskSettings, 
  type NotificationSettings,
  type ConnectedWallet,
  type SecuritySettings,
  type DeveloperSettings 
} from '../services/settingsService';

interface SettingsProps {
  onNavigate: (page: Page) => void;
}

export function Settings({ onNavigate }: SettingsProps) {
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  
  // Professional settings state
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [riskSettings, setRiskSettings] = useState<RiskSettings | null>(null);
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings | null>(null);
  const [connectedWallets, setConnectedWallets] = useState<ConnectedWallet[]>([]);
  const [securitySettings, setSecuritySettings] = useState<SecuritySettings | null>(null);
  const [developerSettings, setDeveloperSettings] = useState<DeveloperSettings | null>(null);

  // Load all settings on component mount
  useEffect(() => {
    loadAllSettings();
  }, []);

  const loadAllSettings = async () => {
    try {
      setLoading(true);
      console.log('🔄 Loading all settings...');

      const [profile, risk, notifications, wallets, security, developer] = await Promise.all([
        settingsService.getUserProfile(),
        settingsService.getRiskSettings(),
        settingsService.getNotificationSettings(),
        settingsService.getConnectedWallets(),
        settingsService.getSecuritySettings(),
        settingsService.getDeveloperSettings()
      ]);

      setUserProfile(profile);
      setRiskSettings(risk);
      setNotificationSettings(notifications);
      setConnectedWallets(wallets);
      setSecuritySettings(security);
      setDeveloperSettings(developer);

      console.log('✅ All settings loaded successfully');
    } catch (error) {
      console.error('❌ Failed to load settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'profile', name: 'Profile', icon: User, description: 'Personal information and preferences' },
    { id: 'security', name: 'Security', icon: Lock, description: '2FA, sessions, and security settings' },
    { id: 'risk', name: 'Risk & Trading', icon: Shield, description: 'Risk management and trading preferences' },
    { id: 'wallets', name: 'Wallets', icon: Wallet, description: 'Connected wallets and addresses' },
    { id: 'notifications', name: 'Notifications', icon: Bell, description: 'Alert preferences and channels' },
    { id: 'developer', name: 'Developer', icon: Code, description: 'API keys and developer tools' },
  ];

  // Save settings function
  const handleSave = async (category: string, data: any) => {
    try {
      setSaving(true);
      console.log(`💾 Saving ${category} settings...`);
      
      const success = await settingsService.updateSettings(category, data);
      
      if (success) {
        console.log(`✅ ${category} settings saved successfully`);
        // Show success notification here
      } else {
        console.error(`❌ Failed to save ${category} settings`);
        // Show error notification here
      }
    } catch (error) {
      console.error('❌ Save error:', error);
    } finally {
      setSaving(false);
    }
  };

  // Export settings
  const handleExport = async () => {
    try {
      const settingsJson = await settingsService.exportSettings();
      const blob = new Blob([settingsJson], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `aion-settings-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      console.log('✅ Settings exported successfully');
    } catch (error) {
      console.error('❌ Export failed:', error);
    }
  };

  // Copy to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    console.log('📋 Copied to clipboard');
  };

  // Loading state
  if (loading) {
    return (
      <div className="pt-20 min-h-screen bg-dark-900 flex items-center justify-center">
        <div className="text-center">
          <SettingsIcon className="w-12 h-12 text-gold-500 animate-spin mx-auto mb-4" />
          <p className="text-white text-lg">Loading Settings...</p>
        </div>
      </div>
    );
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'profile':
        if (!userProfile) return <div>Loading profile...</div>;
        return (
          <div className="space-y-6">
            {/* Profile Header */}
            <div className="flex items-center gap-4 p-4 bg-dark-700/30 rounded-xl">
              <div className="w-16 h-16 bg-gradient-to-br from-gold-500 to-gold-600 rounded-full flex items-center justify-center text-2xl font-bold text-dark-900">
                {userProfile.name.charAt(0)}
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white">{userProfile.name}</h3>
                <p className="text-gray-400">{userProfile.email}</p>
                <div className="flex items-center gap-2 mt-1">
                  {userProfile.isVerified && (
                    <span className="flex items-center gap-1 text-green-400 text-sm">
                      <CheckCircle className="w-4 h-4" />
                      Verified
                    </span>
                  )}
                  <span className="text-gray-500 text-sm">
                    Joined {userProfile.joinedDate.toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Full Name</label>
                <input
                  type="text"
                  value={userProfile.name}
                  onChange={(e) => setUserProfile(prev => prev ? {...prev, name: e.target.value} : null)}
                  className="w-full px-4 py-3 bg-dark-700/50 border border-dark-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-gold-500/50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Email Address</label>
                <input
                  type="email"
                  value={userProfile.email}
                  onChange={(e) => setUserProfile(prev => prev ? {...prev, email: e.target.value} : null)}
                  className="w-full px-4 py-3 bg-dark-700/50 border border-dark-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-gold-500/50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Language</label>
                <select
                  value={userProfile.language}
                  onChange={(e) => setUserProfile(prev => prev ? {...prev, language: e.target.value} : null)}
                  className="w-full px-4 py-3 bg-dark-700/50 border border-dark-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-gold-500/50"
                >
                  <option value="en">English</option>
                  <option value="ar">Arabic</option>
                  <option value="es">Español</option>
                  <option value="fr">Français</option>
                  <option value="de">Deutsch</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Timezone</label>
                <select
                  value={userProfile.timezone}
                  onChange={(e) => setUserProfile(prev => prev ? {...prev, timezone: e.target.value} : null)}
                  className="w-full px-4 py-3 bg-dark-700/50 border border-dark-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-gold-500/50"
                >
                  <option value="UTC+2">UTC+2 (Cairo, Athens)</option>
                  <option value="UTC+0">UTC+0 (London, Dublin)</option>
                  <option value="UTC-5">UTC-5 (New York, Toronto)</option>
                  <option value="UTC-8">UTC-8 (Los Angeles, Vancouver)</option>
                  <option value="UTC+8">UTC+8 (Singapore, Hong Kong)</option>
                  <option value="UTC+9">UTC+9 (Tokyo, Seoul)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Country</label>
                <select
                  value={userProfile.country}
                  onChange={(e) => setUserProfile(prev => prev ? {...prev, country: e.target.value} : null)}
                  className="w-full px-4 py-3 bg-dark-700/50 border border-dark-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-gold-500/50"
                >
                  <option value="Egypt">Egypt</option>
                  <option value="UAE">United Arab Emirates</option>
                  <option value="Saudi Arabia">Saudi Arabia</option>
                  <option value="USA">United States</option>
                  <option value="UK">United Kingdom</option>
                  <option value="Germany">Germany</option>
                  <option value="Singapore">Singapore</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">KYC Status</label>
                <div className="flex items-center gap-2 px-4 py-3 bg-dark-700/50 border border-dark-600 rounded-xl">
                  {userProfile.kycStatus === 'approved' && (
                    <>
                      <CheckCircle className="w-5 h-5 text-green-400" />
                      <span className="text-green-400">Approved</span>
                    </>
                  )}
                  {userProfile.kycStatus === 'pending' && (
                    <>
                      <AlertTriangle className="w-5 h-5 text-yellow-400" />
                      <span className="text-yellow-400">Pending Review</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        );

      case 'security':
        if (!securitySettings) return <div>Loading security settings...</div>;
        return (
          <div className="space-y-6">
            {/* Security Score */}
            <div className="p-4 bg-gradient-to-r from-green-500/20 to-blue-500/20 rounded-xl border border-green-500/30">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold text-white">Security Score</h3>
                <span className="text-2xl font-bold text-green-400">85/100</span>
              </div>
              <p className="text-gray-400 text-sm">Your account security is strong. Consider enabling biometric authentication for maximum security.</p>
            </div>

            {/* Two-Factor Authentication */}
            <div className="flex items-center justify-between p-4 bg-dark-700/30 rounded-xl">
              <div className="flex items-center gap-3">
                <Smartphone className="w-6 h-6 text-gold-500" />
                <div>
                  <p className="text-white font-medium">Two-Factor Authentication</p>
                  <p className="text-sm text-gray-400">Add an extra layer of security to your account</p>
                </div>
              </div>
              <motion.button
                onClick={() => setSecuritySettings(prev => prev ? {...prev, twoFactorEnabled: !prev.twoFactorEnabled} : null)}
                className={`w-12 h-6 rounded-full transition-colors ${
                  securitySettings.twoFactorEnabled ? 'bg-gold-500' : 'bg-dark-600'
                }`}
                whileTap={{ scale: 0.95 }}
              >
                <motion.div
                  className="w-5 h-5 bg-white rounded-full"
                  animate={{ x: securitySettings.twoFactorEnabled ? 24 : 2 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              </motion.button>
            </div>

            {/* Session Settings */}
            <div className="space-y-4">
              <h4 className="text-white font-medium">Session Management</h4>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Session Timeout: {securitySettings.sessionTimeout} minutes
                </label>
                <input
                  type="range"
                  min="15"
                  max="480"
                  step="15"
                  value={securitySettings.sessionTimeout}
                  onChange={(e) => setSecuritySettings(prev => prev ? {...prev, sessionTimeout: parseInt(e.target.value)} : null)}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>15 min</span>
                  <span>8 hours</span>
                </div>
              </div>
            </div>

            {/* Login Notifications */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white font-medium">Login Notifications</p>
                <p className="text-sm text-gray-400">Get notified of new login attempts</p>
              </div>
              <motion.button
                onClick={() => setSecuritySettings(prev => prev ? {...prev, loginNotifications: !prev.loginNotifications} : null)}
                className={`w-12 h-6 rounded-full transition-colors ${
                  securitySettings.loginNotifications ? 'bg-gold-500' : 'bg-dark-600'
                }`}
                whileTap={{ scale: 0.95 }}
              >
                <motion.div
                  className="w-5 h-5 bg-white rounded-full"
                  animate={{ x: securitySettings.loginNotifications ? 24 : 2 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              </motion.button>
            </div>
          </div>
        );

      case 'risk':
        if (!riskSettings) return <div>Loading risk settings...</div>;
        return (
          <div className="space-y-6">
            {/* Risk Level Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-4">Risk Profile</label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { id: 'conservative', name: 'Conservative', desc: 'Low risk, stable returns', color: 'from-green-500 to-green-600' },
                  { id: 'moderate', name: 'Moderate', desc: 'Balanced risk-reward', color: 'from-yellow-500 to-orange-500' },
                  { id: 'aggressive', name: 'Aggressive', desc: 'High risk, high returns', color: 'from-red-500 to-red-600' }
                ].map((level) => (
                  <motion.button
                    key={level.id}
                    onClick={() => setRiskSettings(prev => prev ? {...prev, level: level.id as any} : null)}
                    className={`p-4 rounded-xl text-center transition-all border-2 ${
                      riskSettings.level === level.id
                        ? 'border-gold-500 bg-gold-500/20'
                        : 'border-dark-600 bg-dark-700/50 hover:border-gold-500/50'
                    }`}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className={`w-12 h-12 rounded-full bg-gradient-to-r ${level.color} mx-auto mb-3`} />
                    <div className="font-medium text-white">{level.name}</div>
                    <div className="text-xs text-gray-400 mt-1">{level.desc}</div>
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Advanced Risk Settings */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Max Slippage: {riskSettings.maxSlippage}%
                </label>
                <input
                  type="range"
                  min="0.1"
                  max="5"
                  step="0.1"
                  value={riskSettings.maxSlippage}
                  onChange={(e) => setRiskSettings(prev => prev ? {...prev, maxSlippage: parseFloat(e.target.value)} : null)}
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Max Drawdown: {riskSettings.maxDrawdown}%
                </label>
                <input
                  type="range"
                  min="5"
                  max="50"
                  step="1"
                  value={riskSettings.maxDrawdown}
                  onChange={(e) => setRiskSettings(prev => prev ? {...prev, maxDrawdown: parseFloat(e.target.value)} : null)}
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Max Position Size: {riskSettings.maxPositionSize}%
                </label>
                <input
                  type="range"
                  min="5"
                  max="50"
                  step="1"
                  value={riskSettings.maxPositionSize}
                  onChange={(e) => setRiskSettings(prev => prev ? {...prev, maxPositionSize: parseFloat(e.target.value)} : null)}
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Stop Loss: {riskSettings.stopLossPercentage}%
                </label>
                <input
                  type="range"
                  min="1"
                  max="25"
                  step="0.5"
                  value={riskSettings.stopLossPercentage}
                  onChange={(e) => setRiskSettings(prev => prev ? {...prev, stopLossPercentage: parseFloat(e.target.value)} : null)}
                  className="w-full"
                />
              </div>
            </div>

            {/* Toggle Settings */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-medium">Auto Rebalancing</p>
                  <p className="text-sm text-gray-400">Automatically rebalance based on AI recommendations</p>
                </div>
                <motion.button
                  onClick={() => setRiskSettings(prev => prev ? {...prev, autoRebalance: !prev.autoRebalance} : null)}
                  className={`w-12 h-6 rounded-full transition-colors ${
                    riskSettings.autoRebalance ? 'bg-gold-500' : 'bg-dark-600'
                  }`}
                  whileTap={{ scale: 0.95 }}
                >
                  <motion.div
                    className="w-5 h-5 bg-white rounded-full"
                    animate={{ x: riskSettings.autoRebalance ? 24 : 2 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                </motion.button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-medium">Emergency Stop</p>
                  <p className="text-sm text-gray-400">Automatically stop trading during high volatility</p>
                </div>
                <motion.button
                  onClick={() => setRiskSettings(prev => prev ? {...prev, emergencyStop: !prev.emergencyStop} : null)}
                  className={`w-12 h-6 rounded-full transition-colors ${
                    riskSettings.emergencyStop ? 'bg-gold-500' : 'bg-dark-600'
                  }`}
                  whileTap={{ scale: 0.95 }}
                >
                  <motion.div
                    className="w-5 h-5 bg-white rounded-full"
                    animate={{ x: riskSettings.emergencyStop ? 24 : 2 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                </motion.button>
              </div>
            </div>
          </div>
        );

      case 'wallets':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Connected Wallets ({connectedWallets.length})</h3>
              <Button size="sm" icon={Wallet}>Connect New Wallet</Button>
            </div>

            <div className="space-y-4">
              {connectedWallets.map((wallet, idx) => (
                <motion.div
                  key={wallet.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    wallet.isActive 
                      ? 'border-gold-500 bg-gold-500/10' 
                      : 'border-dark-600 bg-dark-700/50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-4 h-4 rounded-full ${
                        wallet.isActive ? 'bg-green-400' : 'bg-gray-400'
                      }`} />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-white font-medium">{wallet.nickname || wallet.network}</span>
                          {wallet.isHardware && (
                            <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded-full">
                              Hardware
                            </span>
                          )}
                          {wallet.isActive && (
                            <span className="px-2 py-1 bg-gold-500/20 text-gold-400 text-xs rounded-full">
                              Active
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-400 capitalize">{wallet.walletType}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="ghost" icon={Copy} onClick={() => copyToClipboard(wallet.address)}>
                        Copy
                      </Button>
                      <Button size="sm" variant="ghost" icon={ExternalLink}>
                        Explorer
                      </Button>
                      <Button size="sm" variant="ghost" icon={Trash2}>
                        Remove
                      </Button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-gray-400">Address:</span>
                      <p className="text-white font-mono">
                        {wallet.address.slice(0, 8)}...{wallet.address.slice(-6)}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-400">Network:</span>
                      <p className="text-white">{wallet.network}</p>
                    </div>
                    <div>
                      <span className="text-gray-400">Balance:</span>
                      <p className="text-white font-semibold">{wallet.balance.toFixed(4)} {wallet.currency}</p>
                    </div>
                    <div>
                      <span className="text-gray-400">Last Used:</span>
                      <p className="text-white">{wallet.lastUsed.toLocaleDateString()}</p>
                    </div>
                  </div>

                  {wallet.tags.length > 0 && (
                    <div className="flex items-center gap-2 mt-3">
                      <span className="text-gray-400 text-sm">Tags:</span>
                      {wallet.tags.map(tag => (
                        <span key={tag} className="px-2 py-1 bg-dark-600 text-gray-300 text-xs rounded-full">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </motion.div>
              ))}
            </div>

            {/* Wallet Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
              <div className="p-4 bg-dark-700/30 rounded-xl text-center">
                <p className="text-2xl font-bold text-gold-500">{connectedWallets.length}</p>
                <p className="text-gray-400 text-sm">Total Wallets</p>
              </div>
              <div className="p-4 bg-dark-700/30 rounded-xl text-center">
                <p className="text-2xl font-bold text-green-400">{connectedWallets.filter(w => w.isActive).length}</p>
                <p className="text-gray-400 text-sm">Active Wallets</p>
              </div>
              <div className="p-4 bg-dark-700/30 rounded-xl text-center">
                <p className="text-2xl font-bold text-blue-400">{connectedWallets.filter(w => w.isHardware).length}</p>
                <p className="text-gray-400 text-sm">Hardware Wallets</p>
              </div>
            </div>
          </div>
        );

      case 'notifications':
        if (!notificationSettings) return <div>Loading notifications...</div>;
        return (
          <div className="space-y-6">
            {/* Notification Channels */}
            <div>
              <h4 className="text-white font-medium mb-4">Notification Channels</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { key: 'email', name: 'Email', icon: '📧', desc: 'Receive notifications via email' },
                  { key: 'browser', name: 'Browser', icon: '🌐', desc: 'Show browser push notifications' },
                  { key: 'mobile', name: 'Mobile', icon: '📱', desc: 'Mobile app notifications' },
                  { key: 'telegram', name: 'Telegram', icon: '💬', desc: 'Telegram bot notifications' }
                ].map(channel => (
                  <div key={channel.key} className="flex items-center justify-between p-3 bg-dark-700/30 rounded-xl">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{channel.icon}</span>
                      <div>
                        <p className="text-white font-medium">{channel.name}</p>
                        <p className="text-sm text-gray-400">{channel.desc}</p>
                      </div>
                    </div>
                    <motion.button
                      onClick={() => setNotificationSettings(prev => prev ? {...prev, [channel.key]: !prev[channel.key as keyof NotificationSettings]} : null)}
                      className={`w-12 h-6 rounded-full transition-colors ${
                        notificationSettings[channel.key as keyof NotificationSettings] ? 'bg-gold-500' : 'bg-dark-600'
                      }`}
                      whileTap={{ scale: 0.95 }}
                    >
                      <motion.div
                        className="w-5 h-5 bg-white rounded-full"
                        animate={{ x: notificationSettings[channel.key as keyof NotificationSettings] ? 24 : 2 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                      />
                    </motion.button>
                  </div>
                ))}
              </div>
            </div>

            {/* Notification Types */}
            <div>
              <h4 className="text-white font-medium mb-4">Notification Types</h4>
              <div className="space-y-3">
                {[
                  { key: 'transactions', name: 'Transactions', desc: 'Deposit, withdraw, and trade confirmations' },
                  { key: 'yields', name: 'Yield Earned', desc: 'When you earn yield from strategies' },
                  { key: 'rebalancing', name: 'Rebalancing', desc: 'Before automatic rebalancing occurs' },
                  { key: 'priceAlerts', name: 'Price Alerts', desc: 'When assets reach target prices' },
                  { key: 'securityAlerts', name: 'Security Alerts', desc: 'Login attempts and security events' },
                  { key: 'aiRecommendations', name: 'AI Recommendations', desc: 'Strategy suggestions from AI' }
                ].map(type => (
                  <div key={type.key} className="flex items-center justify-between">
                    <div>
                      <p className="text-white font-medium">{type.name}</p>
                      <p className="text-sm text-gray-400">{type.desc}</p>
                    </div>
                    <motion.button
                      onClick={() => setNotificationSettings(prev => prev ? {...prev, [type.key]: !prev[type.key as keyof NotificationSettings]} : null)}
                      className={`w-12 h-6 rounded-full transition-colors ${
                        notificationSettings[type.key as keyof NotificationSettings] ? 'bg-gold-500' : 'bg-dark-600'
                      }`}
                      whileTap={{ scale: 0.95 }}
                    >
                      <motion.div
                        className="w-5 h-5 bg-white rounded-full"
                        animate={{ x: notificationSettings[type.key as keyof NotificationSettings] ? 24 : 2 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                      />
                    </motion.button>
                  </div>
                ))}
              </div>
            </div>

            {/* Summary Reports */}
            <div>
              <h4 className="text-white font-medium mb-4">Summary Reports</h4>
              <div className="space-y-3">
                {[
                  { key: 'dailySummary', name: 'Daily Summary', desc: 'Daily portfolio performance summary' },
                  { key: 'weeklySummary', name: 'Weekly Summary', desc: 'Weekly performance and yield report' },
                  { key: 'monthlySummary', name: 'Monthly Summary', desc: 'Comprehensive monthly analysis' }
                ].map(report => (
                  <div key={report.key} className="flex items-center justify-between">
                    <div>
                      <p className="text-white font-medium">{report.name}</p>
                      <p className="text-sm text-gray-400">{report.desc}</p>
                    </div>
                    <motion.button
                      onClick={() => setNotificationSettings(prev => prev ? {...prev, [report.key]: !prev[report.key as keyof NotificationSettings]} : null)}
                      className={`w-12 h-6 rounded-full transition-colors ${
                        notificationSettings[report.key as keyof NotificationSettings] ? 'bg-gold-500' : 'bg-dark-600'
                      }`}
                      whileTap={{ scale: 0.95 }}
                    >
                      <motion.div
                        className="w-5 h-5 bg-white rounded-full"
                        animate={{ x: notificationSettings[report.key as keyof NotificationSettings] ? 24 : 2 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                      />
                    </motion.button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 'developer':
        if (!developerSettings) return <div>Loading developer settings...</div>;
        return (
          <div className="space-y-6">
            {/* Developer Mode Toggle */}
            <div className="flex items-center justify-between p-4 bg-dark-700/30 rounded-xl">
              <div className="flex items-center gap-3">
                <Code className="w-6 h-6 text-gold-500" />
                <div>
                  <p className="text-white font-medium">Testnet Mode</p>
                  <p className="text-sm text-gray-400">Use testnet for development and testing</p>
                </div>
              </div>
              <motion.button
                onClick={() => setDeveloperSettings(prev => prev ? {...prev, testnetMode: !prev.testnetMode} : null)}
                className={`w-12 h-6 rounded-full transition-colors ${
                  developerSettings.testnetMode ? 'bg-gold-500' : 'bg-dark-600'
                }`}
                whileTap={{ scale: 0.95 }}
              >
                <motion.div
                  className="w-5 h-5 bg-white rounded-full"
                  animate={{ x: developerSettings.testnetMode ? 24 : 2 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              </motion.button>
            </div>

            {/* API Key Management */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-medium text-gray-400">API Key</label>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span>Created: {developerSettings.apiKeyCreated.toLocaleDateString()}</span>
                  {developerSettings.apiKeyLastUsed && (
                    <span>• Last used: {developerSettings.apiKeyLastUsed.toLocaleDateString()}</span>
                  )}
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex-1 relative">
                  <input
                    type={showApiKey ? 'text' : 'password'}
                    value={developerSettings.apiKey}
                    readOnly
                    className="w-full px-4 py-3 bg-dark-700/50 border border-dark-600 rounded-xl text-white font-mono pr-12"
                  />
                  <button
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                  >
                    {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <Button size="sm" variant="secondary" icon={Copy} onClick={() => copyToClipboard(developerSettings.apiKey)}>
                  Copy
                </Button>
                <Button size="sm" variant="secondary" icon={RotateCcw}>
                  Regenerate
                </Button>
              </div>
            </div>

            {/* Webhook Configuration */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Webhook URL</label>
              <input
                type="url"
                value={developerSettings.webhookUrl}
                onChange={(e) => setDeveloperSettings(prev => prev ? {...prev, webhookUrl: e.target.value} : null)}
                placeholder="https://your-app.com/webhook"
                className="w-full px-4 py-3 bg-dark-700/50 border border-dark-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-gold-500/50"
              />
            </div>

            {/* Webhook Secret */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Webhook Secret</label>
              <div className="flex gap-3">
                <input
                  type="password"
                  value={developerSettings.webhookSecret}
                  readOnly
                  className="flex-1 px-4 py-3 bg-dark-700/50 border border-dark-600 rounded-xl text-white font-mono"
                />
                <Button size="sm" variant="secondary" icon={Copy} onClick={() => copyToClipboard(developerSettings.webhookSecret)}>
                  Copy
                </Button>
              </div>
            </div>

            {/* Debug Settings */}
            <div>
              <h4 className="text-white font-medium mb-4">Debug Settings</h4>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Log Level</label>
                  <select
                    value={developerSettings.logLevel}
                    onChange={(e) => setDeveloperSettings(prev => prev ? {...prev, logLevel: e.target.value as any} : null)}
                    className="w-full px-4 py-3 bg-dark-700/50 border border-dark-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-gold-500/50"
                  >
                    <option value="error">Error</option>
                    <option value="warn">Warning</option>
                    <option value="info">Info</option>
                    <option value="debug">Debug</option>
                  </select>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white font-medium">Debug Mode</p>
                    <p className="text-sm text-gray-400">Enable detailed logging and debugging</p>
                  </div>
                  <motion.button
                    onClick={() => setDeveloperSettings(prev => prev ? {...prev, debugMode: !prev.debugMode} : null)}
                    className={`w-12 h-6 rounded-full transition-colors ${
                      developerSettings.debugMode ? 'bg-gold-500' : 'bg-dark-600'
                    }`}
                    whileTap={{ scale: 0.95 }}
                  >
                    <motion.div
                      className="w-5 h-5 bg-white rounded-full"
                      animate={{ x: developerSettings.debugMode ? 24 : 2 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    />
                  </motion.button>
                </div>
              </div>
            </div>

            {/* API Documentation */}
            <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <Code className="w-5 h-5 text-blue-400" />
                <h4 className="text-blue-400 font-medium">API Documentation</h4>
              </div>
              <p className="text-gray-400 text-sm mb-3">
                Access our comprehensive API documentation to integrate AION with your applications.
              </p>
              <Button size="sm" variant="secondary" icon={ExternalLink}>
                View API Docs
              </Button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="pt-20 min-h-screen bg-dark-900">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-white mb-2">Settings</h1>
          <p className="text-gray-400">Manage your preferences and account settings</p>
        </motion.div>

        <div className="grid lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <Card>
              <nav className="space-y-2">
                {tabs.map((tab) => (
                  <motion.button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all ${
                      activeTab === tab.id
                        ? 'bg-gold-500 text-dark-900'
                        : 'text-gray-300 hover:bg-dark-700/50 hover:text-gold-500'
                    }`}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <tab.icon size={20} />
                    <span className="font-medium">{tab.name}</span>
                  </motion.button>
                ))}
              </nav>
            </Card>
          </div>

          {/* Content */}
          <div className="lg:col-span-3">
            <Card>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-semibold text-white">
                    {tabs.find(tab => tab.id === activeTab)?.name}
                  </h2>
                  <p className="text-gray-400 text-sm">
                    {tabs.find(tab => tab.id === activeTab)?.description}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Button 
                    size="sm" 
                    variant="secondary" 
                    icon={Download}
                    onClick={handleExport}
                  >
                    Export
                  </Button>
                  <Button 
                    icon={Save} 
                    onClick={() => {
                      const currentData = 
                        activeTab === 'profile' ? userProfile :
                        activeTab === 'security' ? securitySettings :
                        activeTab === 'risk' ? riskSettings :
                        activeTab === 'notifications' ? notificationSettings :
                        activeTab === 'developer' ? developerSettings : null;
                      
                      if (currentData) {
                        handleSave(activeTab, currentData);
                      }
                    }}
                    loading={saving}
                    loadingText="Saving..."
                  >
                    Save Changes
                  </Button>
                </div>
              </div>

              <motion.div
                key={activeTab}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
              >
                {renderTabContent()}
              </motion.div>
            </Card>

            {/* Settings Actions */}
            <Card className="mt-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">Settings Management</h3>
                  <p className="text-gray-400 text-sm">Export, import, or reset your settings</p>
                </div>
                <div className="flex items-center gap-3">
                  <Button size="sm" variant="secondary" icon={Upload}>
                    Import Settings
                  </Button>
                  <Button size="sm" variant="ghost" icon={RotateCcw}>
                    Reset to Defaults
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}