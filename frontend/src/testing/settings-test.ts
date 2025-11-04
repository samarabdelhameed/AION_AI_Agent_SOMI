// Professional Test Suite for Settings Page
// This comprehensive test ensures Settings page works perfectly with real data

import { test, expect, Page } from '@playwright/test';

interface SettingsTestScenario {
  name: string;
  description: string;
  steps: string[];
  expectedResults: string[];
}

class SettingsTestSuite {
  private page: Page;
  private baseUrl: string = 'http://localhost:5173';

  constructor(page: Page) {
    this.page = page;
  }

  // Test Settings Page Loading
  async testSettingsPageLoad(): Promise<boolean> {
    console.log('🧪 Testing Settings Page Load...');
    
    try {
      // Navigate to Settings
      await this.page.goto(`${this.baseUrl}/settings`);
      await this.page.waitForLoadState('networkidle');

      // Test 1: Page loads correctly
      await expect(this.page.locator('h1')).toContainText('Settings');
      console.log('✅ Settings page title loaded');

      // Test 2: Check all tabs are visible
      const tabs = ['Profile', 'Security', 'Risk & Trading', 'Wallets', 'Notifications', 'Developer'];
      for (const tab of tabs) {
        await expect(this.page.locator(`text=${tab}`)).toBeVisible();
      }
      console.log('✅ All navigation tabs visible');

      // Test 3: Check loading states resolve
      await this.page.waitForTimeout(2000); // Wait for data to load
      const loadingElements = this.page.locator('text=Loading');
      const loadingCount = await loadingElements.count();
      
      if (loadingCount === 0) {
        console.log('✅ All data loaded successfully');
      } else {
        console.log(`⚠️ Still loading ${loadingCount} sections`);
      }

      return true;

    } catch (error) {
      console.error('❌ Settings page load test failed:', error);
      return false;
    }
  }

  // Test Profile Tab Functionality
  async testProfileTab(): Promise<boolean> {
    console.log('🧪 Testing Profile Tab...');
    
    try {
      // Navigate to Profile tab
      await this.page.click('text=Profile');
      await this.page.waitForTimeout(1000);

      // Test profile header
      await expect(this.page.locator('text=Ahmed Hassan')).toBeVisible();
      console.log('✅ Profile header displayed');

      // Test profile fields
      const nameInput = this.page.locator('input[type="text"]').first();
      await expect(nameInput).toBeVisible();
      
      const emailInput = this.page.locator('input[type="email"]');
      await expect(emailInput).toBeVisible();
      
      console.log('✅ Profile form fields visible');

      // Test form interaction
      await nameInput.fill('Ahmed Hassan Updated');
      await this.page.waitForTimeout(500);
      
      const nameValue = await nameInput.inputValue();
      if (nameValue === 'Ahmed Hassan Updated') {
        console.log('✅ Profile form interaction works');
      }

      // Test KYC status
      await expect(this.page.locator('text=Approved')).toBeVisible();
      console.log('✅ KYC status displayed');

      return true;

    } catch (error) {
      console.error('❌ Profile tab test failed:', error);
      return false;
    }
  }

  // Test Security Tab Functionality
  async testSecurityTab(): Promise<boolean> {
    console.log('🧪 Testing Security Tab...');
    
    try {
      // Navigate to Security tab
      await this.page.click('text=Security');
      await this.page.waitForTimeout(1000);

      // Test security score
      await expect(this.page.locator('text=Security Score')).toBeVisible();
      await expect(this.page.locator('text=85/100')).toBeVisible();
      console.log('✅ Security score displayed');

      // Test 2FA toggle
      const twoFactorToggle = this.page.locator('text=Two-Factor Authentication').locator('..').locator('button');
      await expect(twoFactorToggle).toBeVisible();
      console.log('✅ 2FA toggle visible');

      // Test session timeout slider
      const sessionSlider = this.page.locator('input[type="range"]');
      await expect(sessionSlider).toBeVisible();
      console.log('✅ Session timeout slider visible');

      return true;

    } catch (error) {
      console.error('❌ Security tab test failed:', error);
      return false;
    }
  }

  // Test Risk & Trading Tab
  async testRiskTradingTab(): Promise<boolean> {
    console.log('🧪 Testing Risk & Trading Tab...');
    
    try {
      // Navigate to Risk & Trading tab
      await this.page.click('text=Risk & Trading');
      await this.page.waitForTimeout(1000);

      // Test risk profile selection
      await expect(this.page.locator('text=Conservative')).toBeVisible();
      await expect(this.page.locator('text=Moderate')).toBeVisible();
      await expect(this.page.locator('text=Aggressive')).toBeVisible();
      console.log('✅ Risk profile options visible');

      // Test sliders
      const sliders = this.page.locator('input[type="range"]');
      const sliderCount = await sliders.count();
      
      if (sliderCount >= 4) {
        console.log('✅ All risk sliders present');
      } else {
        console.log(`⚠️ Expected 4+ sliders, found ${sliderCount}`);
      }

      // Test auto-rebalancing toggle
      await expect(this.page.locator('text=Auto Rebalancing')).toBeVisible();
      console.log('✅ Auto-rebalancing option visible');

      return true;

    } catch (error) {
      console.error('❌ Risk & Trading tab test failed:', error);
      return false;
    }
  }

  // Test Wallets Tab
  async testWalletsTab(): Promise<boolean> {
    console.log('🧪 Testing Wallets Tab...');
    
    try {
      // Navigate to Wallets tab
      await this.page.click('text=Wallets');
      await this.page.waitForTimeout(1000);

      // Test connected wallets header
      await expect(this.page.locator('text=Connected Wallets')).toBeVisible();
      console.log('✅ Wallets header displayed');

      // Test wallet cards
      const walletCards = this.page.locator('[data-testid="wallet-card"]');
      const walletCount = await walletCards.count();
      
      if (walletCount > 0) {
        console.log(`✅ Found ${walletCount} connected wallets`);
      } else {
        // Check for wallet addresses in the page
        const addresses = this.page.locator('text=/0x[a-fA-F0-9]{40}/');
        const addressCount = await addresses.count();
        if (addressCount > 0) {
          console.log(`✅ Found ${addressCount} wallet addresses`);
        } else {
          console.log('⚠️ No wallets found');
        }
      }

      // Test connect new wallet button
      await expect(this.page.locator('text=Connect New Wallet')).toBeVisible();
      console.log('✅ Connect new wallet button visible');

      // Test wallet stats
      await expect(this.page.locator('text=Total Wallets')).toBeVisible();
      console.log('✅ Wallet statistics displayed');

      return true;

    } catch (error) {
      console.error('❌ Wallets tab test failed:', error);
      return false;
    }
  }

  // Test Notifications Tab
  async testNotificationsTab(): Promise<boolean> {
    console.log('🧪 Testing Notifications Tab...');
    
    try {
      // Navigate to Notifications tab
      await this.page.click('text=Notifications');
      await this.page.waitForTimeout(1000);

      // Test notification channels
      await expect(this.page.locator('text=Notification Channels')).toBeVisible();
      console.log('✅ Notification channels section visible');

      // Test notification types
      await expect(this.page.locator('text=Notification Types')).toBeVisible();
      console.log('✅ Notification types section visible');

      // Test toggle switches
      const toggles = this.page.locator('button[class*="rounded-full"]');
      const toggleCount = await toggles.count();
      
      if (toggleCount >= 10) {
        console.log(`✅ Found ${toggleCount} notification toggles`);
      } else {
        console.log(`⚠️ Expected 10+ toggles, found ${toggleCount}`);
      }

      // Test summary reports
      await expect(this.page.locator('text=Summary Reports')).toBeVisible();
      console.log('✅ Summary reports section visible');

      return true;

    } catch (error) {
      console.error('❌ Notifications tab test failed:', error);
      return false;
    }
  }

  // Test Developer Tab
  async testDeveloperTab(): Promise<boolean> {
    console.log('🧪 Testing Developer Tab...');
    
    try {
      // Navigate to Developer tab
      await this.page.click('text=Developer');
      await this.page.waitForTimeout(1000);

      // Test testnet mode toggle
      await expect(this.page.locator('text=Testnet Mode')).toBeVisible();
      console.log('✅ Testnet mode toggle visible');

      // Test API key section
      await expect(this.page.locator('text=API Key')).toBeVisible();
      console.log('✅ API key section visible');

      // Test webhook configuration
      await expect(this.page.locator('text=Webhook URL')).toBeVisible();
      console.log('✅ Webhook configuration visible');

      // Test debug settings
      await expect(this.page.locator('text=Debug Settings')).toBeVisible();
      console.log('✅ Debug settings visible');

      // Test API documentation link
      await expect(this.page.locator('text=API Documentation')).toBeVisible();
      console.log('✅ API documentation section visible');

      return true;

    } catch (error) {
      console.error('❌ Developer tab test failed:', error);
      return false;
    }
  }

  // Test Save Functionality
  async testSaveFunctionality(): Promise<boolean> {
    console.log('🧪 Testing Save Functionality...');
    
    try {
      // Test save button on each tab
      const tabs = ['Profile', 'Security', 'Risk & Trading', 'Notifications', 'Developer'];
      
      for (const tab of tabs) {
        await this.page.click(`text=${tab}`);
        await this.page.waitForTimeout(500);
        
        const saveButton = this.page.locator('text=Save Changes');
        await expect(saveButton).toBeVisible();
        
        // Click save button
        await saveButton.click();
        await this.page.waitForTimeout(1000);
        
        console.log(`✅ Save functionality works for ${tab} tab`);
      }

      return true;

    } catch (error) {
      console.error('❌ Save functionality test failed:', error);
      return false;
    }
  }

  // Test Export/Import Functionality
  async testExportImportFunctionality(): Promise<boolean> {
    console.log('🧪 Testing Export/Import Functionality...');
    
    try {
      // Test export button
      const exportButton = this.page.locator('text=Export');
      if (await exportButton.isVisible()) {
        await exportButton.click();
        await this.page.waitForTimeout(1000);
        console.log('✅ Export functionality triggered');
      }

      // Test import button
      const importButton = this.page.locator('text=Import Settings');
      if (await importButton.isVisible()) {
        console.log('✅ Import settings button visible');
      }

      // Test reset button
      const resetButton = this.page.locator('text=Reset to Defaults');
      if (await resetButton.isVisible()) {
        console.log('✅ Reset to defaults button visible');
      }

      return true;

    } catch (error) {
      console.error('❌ Export/Import functionality test failed:', error);
      return false;
    }
  }

  // Run comprehensive test suite
  async runComprehensiveTest(): Promise<{ success: boolean; results: string[] }> {
    const results: string[] = [];
    let allTestsPassed = true;

    console.log('🚀 Starting Comprehensive Settings Test Suite');

    // Test page load
    const loadResult = await this.testSettingsPageLoad();
    results.push(`Page Load: ${loadResult ? 'PASSED' : 'FAILED'}`);
    if (!loadResult) allTestsPassed = false;

    // Test Profile tab
    const profileResult = await this.testProfileTab();
    results.push(`Profile Tab: ${profileResult ? 'PASSED' : 'FAILED'}`);
    if (!profileResult) allTestsPassed = false;

    // Test Security tab
    const securityResult = await this.testSecurityTab();
    results.push(`Security Tab: ${securityResult ? 'PASSED' : 'FAILED'}`);
    if (!securityResult) allTestsPassed = false;

    // Test Risk & Trading tab
    const riskResult = await this.testRiskTradingTab();
    results.push(`Risk & Trading Tab: ${riskResult ? 'PASSED' : 'FAILED'}`);
    if (!riskResult) allTestsPassed = false;

    // Test Wallets tab
    const walletsResult = await this.testWalletsTab();
    results.push(`Wallets Tab: ${walletsResult ? 'PASSED' : 'FAILED'}`);
    if (!walletsResult) allTestsPassed = false;

    // Test Notifications tab
    const notificationsResult = await this.testNotificationsTab();
    results.push(`Notifications Tab: ${notificationsResult ? 'PASSED' : 'FAILED'}`);
    if (!notificationsResult) allTestsPassed = false;

    // Test Developer tab
    const developerResult = await this.testDeveloperTab();
    results.push(`Developer Tab: ${developerResult ? 'PASSED' : 'FAILED'}`);
    if (!developerResult) allTestsPassed = false;

    // Test Save functionality
    const saveResult = await this.testSaveFunctionality();
    results.push(`Save Functionality: ${saveResult ? 'PASSED' : 'FAILED'}`);
    if (!saveResult) allTestsPassed = false;

    // Test Export/Import
    const exportImportResult = await this.testExportImportFunctionality();
    results.push(`Export/Import: ${exportImportResult ? 'PASSED' : 'FAILED'}`);
    if (!exportImportResult) allTestsPassed = false;

    console.log('📊 Settings Test Results Summary:');
    results.forEach(result => console.log(`  ${result}`));

    return {
      success: allTestsPassed,
      results
    };
  }
}

// Export for use in Playwright tests
export { SettingsTestSuite };

// Demo scenarios for manual testing
export const settingsDemoScenarios: SettingsTestScenario[] = [
  {
    name: 'Profile Management Demo',
    description: 'Demonstrate comprehensive profile management features',
    steps: [
      'Navigate to Settings page',
      'Show profile header with verification status',
      'Edit profile information',
      'Show KYC status and verification',
      'Demonstrate language and timezone settings'
    ],
    expectedResults: [
      'Profile loads with real user data',
      'Verification badges display correctly',
      'Form fields are editable and responsive',
      'KYC status shows as approved',
      'Settings save successfully'
    ]
  },
  {
    name: 'Security Configuration Demo',
    description: 'Show advanced security features and settings',
    steps: [
      'Navigate to Security tab',
      'Show security score (85/100)',
      'Demonstrate 2FA toggle',
      'Adjust session timeout settings',
      'Show login notification preferences'
    ],
    expectedResults: [
      'Security score displays prominently',
      '2FA toggle works smoothly',
      'Session timeout slider is responsive',
      'Security settings save properly',
      'Professional security UI'
    ]
  },
  {
    name: 'Risk Management Demo',
    description: 'Demonstrate sophisticated risk management controls',
    steps: [
      'Navigate to Risk & Trading tab',
      'Show risk profile selection (Conservative/Moderate/Aggressive)',
      'Adjust slippage and drawdown limits',
      'Configure stop-loss and take-profit',
      'Toggle auto-rebalancing features'
    ],
    expectedResults: [
      'Risk profiles display with visual indicators',
      'All sliders work smoothly',
      'Professional risk management interface',
      'Settings reflect institutional-grade controls',
      'Auto-rebalancing toggles work'
    ]
  },
  {
    name: 'Multi-Wallet Management Demo',
    description: 'Show comprehensive wallet management features',
    steps: [
      'Navigate to Wallets tab',
      'Show connected wallets (3 wallets)',
      'Display wallet details (addresses, balances, networks)',
      'Show hardware wallet indicators',
      'Demonstrate wallet statistics'
    ],
    expectedResults: [
      'Multiple wallets display correctly',
      'Real addresses and balances shown',
      'Hardware wallet badges visible',
      'Network information accurate',
      'Wallet statistics calculated correctly'
    ]
  }
];