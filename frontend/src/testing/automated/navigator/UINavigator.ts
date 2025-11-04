import { 
  UINavigator as IUINavigator, 
  DashboardComponent, 
  UserInput 
} from '../interfaces';

/**
 * Automated browser controller for interacting with dashboard components
 * Uses Playwright for browser automation and UI testing
 */
export class UINavigator implements IUINavigator {
  private page: any = null; // Playwright page instance
  private browser: any = null; // Playwright browser instance

  async navigateToComponent(component: DashboardComponent): Promise<void> {
    if (!this.page) {
      throw new Error('Browser page not initialized');
    }

    try {
      // Navigate to the specific component
      await this.page.goto(component.selector);
      
      // Wait for component to be visible
      await this.waitForElement(component.selector);
      
      // Validate expected elements are present
      for (const element of component.expectedElements) {
        const isPresent = await this.validateElementPresence(element);
        if (!isPresent) {
          throw new Error(`Expected element not found: ${element}`);
        }
      }
    } catch (error) {
      throw new Error(`Failed to navigate to component ${component.name}: ${error}`);
    }
  }

  async clickButton(buttonSelector: string): Promise<void> {
    if (!this.page) {
      throw new Error('Browser page not initialized');
    }

    try {
      // Wait for button to be clickable
      await this.waitForElement(buttonSelector);
      
      // Click the button
      await this.page.click(buttonSelector);
      
      // Wait for any loading states to complete
      await this.page.waitForLoadState('networkidle');
    } catch (error) {
      throw new Error(`Failed to click button ${buttonSelector}: ${error}`);
    }
  }

  async validateElementPresence(selector: string): Promise<boolean> {
    if (!this.page) {
      throw new Error('Browser page not initialized');
    }

    try {
      const element = await this.page.$(selector);
      return element !== null;
    } catch (error) {
      console.error(`Error validating element presence ${selector}:`, error);
      return false;
    }
  }

  async extractDataFromElement(selector: string): Promise<string> {
    if (!this.page) {
      throw new Error('Browser page not initialized');
    }

    try {
      await this.waitForElement(selector);
      
      const element = await this.page.$(selector);
      if (!element) {
        throw new Error(`Element not found: ${selector}`);
      }

      // Extract text content or value depending on element type
      const tagName = await element.evaluate((el: any) => el.tagName.toLowerCase());
      
      if (tagName === 'input' || tagName === 'textarea') {
        return await element.inputValue();
      } else {
        return await element.textContent() || '';
      }
    } catch (error) {
      throw new Error(`Failed to extract data from element ${selector}: ${error}`);
    }
  }

  async simulateUserInput(input: UserInput): Promise<void> {
    if (!this.page) {
      throw new Error('Browser page not initialized');
    }

    try {
      await this.waitForElement(input.selector);

      switch (input.type) {
        case 'click':
          await this.page.click(input.selector);
          break;
        
        case 'type':
          if (!input.value) {
            throw new Error('Value required for type input');
          }
          await this.page.fill(input.selector, input.value);
          break;
        
        case 'select':
          if (!input.value) {
            throw new Error('Value required for select input');
          }
          await this.page.selectOption(input.selector, input.value);
          break;
        
        case 'hover':
          await this.page.hover(input.selector);
          break;
        
        default:
          throw new Error(`Unsupported input type: ${input.type}`);
      }

      // Wait for any resulting changes
      await this.page.waitForLoadState('networkidle');
    } catch (error) {
      throw new Error(`Failed to simulate user input: ${error}`);
    }
  }

  async waitForElement(selector: string, timeout: number = 30000): Promise<void> {
    if (!this.page) {
      throw new Error('Browser page not initialized');
    }

    try {
      await this.page.waitForSelector(selector, { timeout });
    } catch (error) {
      throw new Error(`Element not found within timeout: ${selector}`);
    }
  }

  async takeScreenshot(name: string): Promise<string> {
    if (!this.page) {
      throw new Error('Browser page not initialized');
    }

    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `screenshot-${name}-${timestamp}.png`;
      const path = `./test-results/screenshots/${filename}`;
      
      await this.page.screenshot({ path, fullPage: true });
      return path;
    } catch (error) {
      throw new Error(`Failed to take screenshot: ${error}`);
    }
  }

  // Browser management methods
  async initializeBrowser(): Promise<void> {
    try {
      const { chromium } = await import('@playwright/test');
      
      console.log('🚀 Initializing browser for automated testing...');
      
      this.browser = await chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      
      const context = await this.browser.newContext({
        viewport: { width: 1920, height: 1080 },
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      });
      
      this.page = await context.newPage();
      
      // Navigate to base URL
      await this.page.goto('http://localhost:5173');
      await this.page.waitForLoadState('networkidle');
      
      console.log('✅ Browser initialized successfully');
    } catch (error) {
      throw new Error(`Failed to initialize browser: ${error}`);
    }
  }

  async closeBrowser(): Promise<void> {
    try {
      if (this.page) {
        await this.page.close();
        this.page = null;
      }
      
      if (this.browser) {
        await this.browser.close();
        this.browser = null;
      }
    } catch (error) {
      console.error('Error closing browser:', error);
    }
  }

  // Dashboard-specific navigation methods
  async navigateToWalletPanel(): Promise<void> {
    await this.navigateToComponent({
      name: 'Wallet Panel',
      selector: '[data-testid="wallet-panel"]',
      type: 'panel',
      expectedElements: [
        '[data-testid="wallet-balance"]',
        '[data-testid="wallet-address"]'
      ],
      interactions: []
    });
  }

  async navigateToVaultPerformance(): Promise<void> {
    await this.navigateToComponent({
      name: 'Vault Performance',
      selector: '[data-testid="vault-performance"]',
      type: 'panel',
      expectedElements: [
        '[data-testid="vault-apy"]',
        '[data-testid="performance-chart"]'
      ],
      interactions: []
    });
  }

  async navigateToStrategiesOverview(): Promise<void> {
    await this.navigateToComponent({
      name: 'Strategies Overview',
      selector: '[data-testid="strategies-overview"]',
      type: 'panel',
      expectedElements: [
        '[data-testid="strategy-venus"]',
        '[data-testid="strategy-beefy"]'
      ],
      interactions: []
    });
  }

  // Button interaction methods
  async clickDepositButton(): Promise<void> {
    console.log('💰 Clicking deposit button...');
    await this.clickButton('[data-testid="deposit-button"]');
  }

  async clickWithdrawButton(): Promise<void> {
    console.log('💸 Clicking withdraw button...');
    await this.clickButton('[data-testid="withdraw-button"]');
  }

  async clickExecuteButton(): Promise<void> {
    console.log('⚡ Clicking execute button...');
    await this.clickButton('[data-testid="execute-button"]');
  }

  async clickRefreshButton(): Promise<void> {
    console.log('🔄 Clicking refresh button...');
    await this.clickButton('[data-testid="refresh-button"]');
  }

  async clickSimulateButton(): Promise<void> {
    console.log('🎯 Clicking simulate button...');
    await this.clickButton('[data-testid="simulate-button"]');
  }

  async clickViewAllButton(): Promise<void> {
    console.log('👁️ Clicking view all button...');
    await this.clickButton('[data-testid="view-all-button"]');
  }

  // Element validation utilities
  async validateWalletBalance(): Promise<string> {
    const balance = await this.extractDataFromElement('[data-testid="wallet-balance"]');
    console.log('💰 Wallet balance:', balance);
    return balance;
  }

  async validateVaultAPY(): Promise<string> {
    const apy = await this.extractDataFromElement('[data-testid="vault-apy"]');
    console.log('📈 Vault APY:', apy);
    return apy;
  }

  async validateStrategyPerformance(strategy: string): Promise<string> {
    const performance = await this.extractDataFromElement(`[data-testid="strategy-${strategy}-performance"]`);
    console.log(`📊 ${strategy} performance:`, performance);
    return performance;
  }

  // Advanced interaction methods
  async fillDepositAmount(amount: string): Promise<void> {
    console.log(`💰 Filling deposit amount: ${amount}`);
    await this.simulateUserInput({
      type: 'type',
      selector: '[data-testid="deposit-amount-input"]',
      value: amount
    });
  }

  async fillWithdrawAmount(amount: string): Promise<void> {
    console.log(`💸 Filling withdraw amount: ${amount}`);
    await this.simulateUserInput({
      type: 'type',
      selector: '[data-testid="withdraw-amount-input"]',
      value: amount
    });
  }

  async selectStrategy(strategy: string): Promise<void> {
    console.log(`🎯 Selecting strategy: ${strategy}`);
    await this.simulateUserInput({
      type: 'click',
      selector: `[data-testid="strategy-${strategy}"]`
    });
  }

  // Data extraction methods for all dashboard sections
  async extractAllDashboardData(): Promise<Record<string, any>> {
    console.log('📊 Extracting all dashboard data...');
    
    const data: Record<string, any> = {};

    try {
      // Wallet data
      if (await this.validateElementPresence('[data-testid="wallet-balance"]')) {
        data.walletBalance = await this.extractDataFromElement('[data-testid="wallet-balance"]');
      }
      
      if (await this.validateElementPresence('[data-testid="wallet-address"]')) {
        data.walletAddress = await this.extractDataFromElement('[data-testid="wallet-address"]');
      }

      // Vault data
      if (await this.validateElementPresence('[data-testid="vault-apy"]')) {
        data.vaultAPY = await this.extractDataFromElement('[data-testid="vault-apy"]');
      }
      
      if (await this.validateElementPresence('[data-testid="vault-balance"]')) {
        data.vaultBalance = await this.extractDataFromElement('[data-testid="vault-balance"]');
      }

      // Market data
      if (await this.validateElementPresence('[data-testid="bnb-price"]')) {
        data.bnbPrice = await this.extractDataFromElement('[data-testid="bnb-price"]');
      }
      
      if (await this.validateElementPresence('[data-testid="market-cap"]')) {
        data.marketCap = await this.extractDataFromElement('[data-testid="market-cap"]');
      }

      // Strategy data
      const strategies = ['venus', 'beefy', 'pancake', 'aave'];
      data.strategies = {};
      
      for (const strategy of strategies) {
        if (await this.validateElementPresence(`[data-testid="strategy-${strategy}"]`)) {
          data.strategies[strategy] = await this.extractDataFromElement(`[data-testid="strategy-${strategy}"]`);
        }
      }

      console.log('✅ Dashboard data extracted successfully');
      return data;
      
    } catch (error) {
      console.error('❌ Failed to extract dashboard data:', error);
      return data;
    }
  }

  // Performance monitoring methods
  async measurePageLoadTime(): Promise<number> {
    if (!this.page) return 0;
    
    const metrics = await this.page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      return navigation ? navigation.loadEventEnd - navigation.navigationStart : 0;
    });
    
    console.log('⏱️ Page load time:', metrics, 'ms');
    return metrics;
  }

  async measureComponentRenderTime(selector: string): Promise<number> {
    const startTime = Date.now();
    await this.waitForElement(selector);
    const renderTime = Date.now() - startTime;
    
    console.log(`⏱️ Component render time for ${selector}:`, renderTime, 'ms');
    return renderTime;
  }

  // Error handling and recovery
  async handleNavigationError(error: Error, component: string): Promise<void> {
    console.error(`❌ Navigation error for ${component}:`, error);
    
    // Take screenshot for debugging
    await this.takeScreenshot(`navigation-error-${component}`);
    
    // Try to recover by refreshing the page
    if (this.page) {
      await this.page.reload();
      await this.page.waitForLoadState('networkidle');
    }
  }

  async waitForDashboardLoad(): Promise<void> {
    console.log('⏳ Waiting for dashboard to load...');
    
    if (!this.page) {
      throw new Error('Browser page not initialized');
    }

    // Wait for main dashboard container
    await this.waitForElement('[data-testid="dashboard"]', 30000);
    
    // Wait for key components to be visible
    const keyComponents = [
      '[data-testid="wallet-panel"]',
      '[data-testid="vault-performance"]',
      '[data-testid="strategies-overview"]'
    ];

    for (const component of keyComponents) {
      try {
        await this.waitForElement(component, 10000);
      } catch (error) {
        console.warn(`⚠️ Component not found: ${component}`);
      }
    }

    console.log('✅ Dashboard loaded successfully');
  }

  // Utility methods for testing
  async scrollToBottom(): Promise<void> {
    if (!this.page) return;
    
    await this.page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });
    
    await this.page.waitForTimeout(1000);
  }

  async scrollToTop(): Promise<void> {
    if (!this.page) return;
    
    await this.page.evaluate(() => {
      window.scrollTo(0, 0);
    });
    
    await this.page.waitForTimeout(1000);
  }

  async getPageTitle(): Promise<string> {
    if (!this.page) return '';
    return await this.page.title();
  }

  async getCurrentURL(): Promise<string> {
    if (!this.page) return '';
    return this.page.url();
  }
}