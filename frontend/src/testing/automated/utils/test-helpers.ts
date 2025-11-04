import { Page } from '@playwright/test';

/**
 * Utility functions for automated testing
 * Helper functions to support test execution and validation
 */

export class TestHelpers {
  /**
   * Wait for element to be visible and stable
   */
  static async waitForStableElement(page: Page, selector: string, timeout: number = 10000): Promise<void> {
    await page.waitForSelector(selector, { state: 'visible', timeout });
    
    // Wait for element to be stable (not moving/changing)
    await page.waitForFunction(
      (sel) => {
        const element = document.querySelector(sel);
        if (!element) return false;
        
        const rect = element.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      },
      selector,
      { timeout }
    );
  }

  /**
   * Take screenshot with timestamp
   */
  static async takeTimestampedScreenshot(page: Page, name: string): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${name}-${timestamp}.png`;
    const path = `test-results/screenshots/${filename}`;
    
    await page.screenshot({ path, fullPage: true });
    return path;
  }

  /**
   * Wait for network to be idle
   */
  static async waitForNetworkIdle(page: Page, timeout: number = 30000): Promise<void> {
    await page.waitForLoadState('networkidle', { timeout });
  }

  /**
   * Extract numeric value from text
   */
  static extractNumericValue(text: string): number | null {
    const match = text.match(/[\d,]+\.?\d*/);
    if (match) {
      return parseFloat(match[0].replace(/,/g, ''));
    }
    return null;
  }

  /**
   * Validate percentage format
   */
  static isValidPercentage(text: string): boolean {
    const percentageRegex = /^\d+(\.\d+)?%$/;
    return percentageRegex.test(text.trim());
  }

  /**
   * Validate currency format
   */
  static isValidCurrency(text: string): boolean {
    const currencyRegex = /^\$?[\d,]+(\.\d{2})?$/;
    return currencyRegex.test(text.trim().replace(/[$,]/g, ''));
  }

  /**
   * Wait for element text to change
   */
  static async waitForTextChange(
    page: Page, 
    selector: string, 
    initialText: string, 
    timeout: number = 10000
  ): Promise<string> {
    return await page.waitForFunction(
      ({ sel, initial }) => {
        const element = document.querySelector(sel);
        return element && element.textContent !== initial ? element.textContent : false;
      },
      { selector, initialText },
      { timeout }
    );
  }

  /**
   * Check if element is clickable
   */
  static async isElementClickable(page: Page, selector: string): Promise<boolean> {
    try {
      const element = await page.locator(selector);
      const isVisible = await element.isVisible();
      const isEnabled = await element.isEnabled();
      
      return isVisible && isEnabled;
    } catch {
      return false;
    }
  }

  /**
   * Get element attribute safely
   */
  static async getElementAttribute(
    page: Page, 
    selector: string, 
    attribute: string
  ): Promise<string | null> {
    try {
      return await page.getAttribute(selector, attribute);
    } catch {
      return null;
    }
  }

  /**
   * Get element text content safely
   */
  static async getElementText(page: Page, selector: string): Promise<string> {
    try {
      const element = await page.locator(selector);
      return await element.textContent() || '';
    } catch {
      return '';
    }
  }

  /**
   * Check if element exists in DOM
   */
  static async elementExists(page: Page, selector: string): Promise<boolean> {
    try {
      const element = await page.locator(selector);
      return await element.count() > 0;
    } catch {
      return false;
    }
  }

  /**
   * Scroll element into view
   */
  static async scrollIntoView(page: Page, selector: string): Promise<void> {
    await page.locator(selector).scrollIntoViewIfNeeded();
  }

  /**
   * Wait for multiple elements to be visible
   */
  static async waitForMultipleElements(
    page: Page, 
    selectors: string[], 
    timeout: number = 10000
  ): Promise<boolean> {
    try {
      await Promise.all(
        selectors.map(selector => 
          page.waitForSelector(selector, { state: 'visible', timeout })
        )
      );
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get performance metrics
   */
  static async getPerformanceMetrics(page: Page): Promise<any> {
    return await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      const paint = performance.getEntriesByType('paint');
      
      return {
        loadTime: navigation ? navigation.loadEventEnd - navigation.navigationStart : 0,
        domContentLoaded: navigation ? navigation.domContentLoadedEventEnd - navigation.navigationStart : 0,
        firstPaint: paint.find(p => p.name === 'first-paint')?.startTime || 0,
        firstContentfulPaint: paint.find(p => p.name === 'first-contentful-paint')?.startTime || 0
      };
    });
  }

  /**
   * Clear browser storage
   */
  static async clearBrowserStorage(page: Page): Promise<void> {
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  }

  /**
   * Set local storage item
   */
  static async setLocalStorageItem(page: Page, key: string, value: string): Promise<void> {
    await page.evaluate(
      ({ k, v }) => localStorage.setItem(k, v),
      { k: key, v: value }
    );
  }

  /**
   * Get local storage item
   */
  static async getLocalStorageItem(page: Page, key: string): Promise<string | null> {
    return await page.evaluate(
      (k) => localStorage.getItem(k),
      key
    );
  }
}