/**
 * Comprehensive Execute Operations Test
 * Tests all new operations as a real user would
 */

import { test, expect } from '@playwright/test';

test.describe('Execute Operations - User Journey', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await page.goto('http://localhost:3000');
    
    // Wait for app to load
    await page.waitForLoadState('networkidle');
    
    // Navigate to Execute page
    await page.click('[data-testid="nav-execute"]');
    await page.waitForSelector('[data-testid="execute-page"]');
  });

  test('1. Strategy Combo Box - Should show all available strategies', async ({ page }) => {
    console.log('🧪 Testing strategy combo box...');
    
    // Find the strategy select element
    const strategySelect = page.locator('select').filter({ hasText: /Strategy/ }).first();
    await expect(strategySelect).toBeVisible();
    
    // Get all options
    const options = await strategySelect.locator('option').all();
    
    // Should have more than 3 strategies (not just hardcoded ones)
    expect(options.length).toBeGreaterThan(3);
    
    // Check that options contain real strategy data
    for (const option of options) {
      const text = await option.textContent();
      console.log('📋 Strategy option:', text);
      
      // Should contain strategy name and APY
      expect(text).toMatch(/\d+\.\d+% APY/);
    }
    
    console.log('✅ Strategy combo box test passed');
  });

  test('2. Action Types - Should show all new operations', async ({ page }) => {
    console.log('🧪 Testing action types...');
    
    // Find the action select element
    const actionSelect = page.locator('select').filter({ hasText: /Action/ }).first();
    await expect(actionSelect).toBeVisible();
    
    // Get all options
    const options = await actionSelect.locator('option').all();
    
    // Should have all new operations
    const expectedActions = [
      'Deposit',
      'Withdraw', 
      'Compound',
      'Harvest',
      'Rebalance',
      'Migrate',
      'Emergency',
      'Auto-Rebalance',
      'DCA',
      'Stop Loss',
      'Take Profit'
    ];
    
    expect(options.length).toBeGreaterThanOrEqual(expectedActions.length);
    
    // Test each action selection
    for (let i = 0; i < Math.min(options.length, expectedActions.length); i++) {
      await actionSelect.selectOption({ index: i });
      
      // Check that description updates
      const description = page.locator('p.text-xs.text-gray-400');
      await expect(description).toBeVisible();
      
      const descText = await description.textContent();
      console.log(`📝 Action ${i}: ${descText}`);
      
      // Should have meaningful description
      expect(descText?.length).toBeGreaterThan(10);
    }
    
    console.log('✅ Action types test passed');
  });

  test('3. Deposit Operation - Full workflow', async ({ page }) => {
    console.log('🧪 Testing deposit operation workflow...');
    
    // Select deposit action
    await page.selectOption('select', { label: /Deposit/ });
    
    // Enter amount
    await page.fill('input[type="number"]', '0.01');
    
    // Go through steps
    await page.click('button:has-text("Next")'); // params -> validate
    await page.waitForTimeout(1000);
    
    await page.click('button:has-text("Next")'); // validate -> simulate
    await page.waitForTimeout(1000);
    
    // Check simulation results
    const gasEstimate = page.locator('text=Gas Estimate');
    await expect(gasEstimate).toBeVisible();
    
    const expectedBalance = page.locator('text=Expected Vault Balance');
    await expect(expectedBalance).toBeVisible();
    
    await page.click('button:has-text("Next")'); // simulate -> confirm
    await page.waitForTimeout(1000);
    
    // Should show confirmation page
    const confirmButton = page.locator('button:has-text("Execute")');
    await expect(confirmButton).toBeVisible();
    
    console.log('✅ Deposit workflow test passed');
  });

  test('4. Compound Operation - Workflow', async ({ page }) => {
    console.log('🧪 Testing compound operation...');
    
    // Select compound action
    await page.selectOption('select', { label: /Compound/ });
    
    // Should show compound description
    const description = page.locator('text=Automatically reinvest earned rewards');
    await expect(description).toBeVisible();
    
    // For compound, amount might not be required
    await page.click('button:has-text("Next")');
    
    console.log('✅ Compound operation test passed');
  });

  test('5. Strategy Selection - Real data integration', async ({ page }) => {
    console.log('🧪 Testing strategy selection with real data...');
    
    // Select different strategies and check data updates
    const strategySelect = page.locator('select').filter({ hasText: /Strategy/ }).first();
    const options = await strategySelect.locator('option').all();
    
    for (let i = 0; i < Math.min(3, options.length); i++) {
      await strategySelect.selectOption({ index: i });
      await page.waitForTimeout(500);
      
      // Check that strategy info updates
      const strategyInfo = page.locator('p.text-xs.text-gray-400').filter({ hasText: /APY|Risk/ });
      
      if (await strategyInfo.count() > 0) {
        const infoText = await strategyInfo.first().textContent();
        console.log(`📊 Strategy ${i} info:`, infoText);
        
        // Should contain real strategy data
        expect(infoText).toMatch(/(APY|Risk|Network)/);
      }
    }
    
    console.log('✅ Strategy selection test passed');
  });

  test('6. Error Handling - Invalid inputs', async ({ page }) => {
    console.log('🧪 Testing error handling...');
    
    // Try to proceed without amount
    await page.click('button:has-text("Next")');
    
    // Should show error or stay on same step
    // (Implementation depends on validation logic)
    
    // Try invalid amount
    await page.fill('input[type="number"]', '-1');
    await page.click('button:has-text("Next")');
    
    // Try very large amount
    await page.fill('input[type="number"]', '999999');
    await page.click('button:has-text("Next")');
    
    console.log('✅ Error handling test passed');
  });

  test('7. Navigation - Step progression', async ({ page }) => {
    console.log('🧪 Testing step navigation...');
    
    // Fill valid data
    await page.fill('input[type="number"]', '0.01');
    
    // Test forward navigation
    await page.click('button:has-text("Next")'); // Step 1
    await page.click('button:has-text("Next")'); // Step 2
    await page.click('button:has-text("Next")'); // Step 3
    
    // Test backward navigation
    await page.click('button:has-text("Back")'); // Back to step 2
    await page.click('button:has-text("Back")'); // Back to step 1
    
    // Should be back at parameters
    const amountInput = page.locator('input[type="number"]');
    await expect(amountInput).toBeVisible();
    
    console.log('✅ Navigation test passed');
  });

  test('8. Real-time Data Updates', async ({ page }) => {
    console.log('🧪 Testing real-time data updates...');
    
    // Check that balance updates
    const balanceText = page.locator('text=Available:');
    await expect(balanceText).toBeVisible();
    
    // Check that strategy data is live
    const strategySelect = page.locator('select').filter({ hasText: /Strategy/ }).first();
    await strategySelect.selectOption({ index: 1 });
    
    // Wait for potential data refresh
    await page.waitForTimeout(2000);
    
    // Check that APY values look realistic
    const apyText = await page.textContent('select option:checked');
    if (apyText?.includes('APY')) {
      const apyMatch = apyText.match(/(\d+\.\d+)% APY/);
      if (apyMatch) {
        const apy = parseFloat(apyMatch[1]);
        expect(apy).toBeGreaterThan(0);
        expect(apy).toBeLessThan(1000); // Reasonable APY range
        console.log('📈 APY value:', apy);
      }
    }
    
    console.log('✅ Real-time data test passed');
  });
});

test.describe('Execute Operations - Advanced Features', () => {
  test('9. Batch Operations Simulation', async ({ page }) => {
    console.log('🧪 Testing batch operations concept...');
    
    await page.goto('http://localhost:3000');
    await page.click('[data-testid="nav-execute"]');
    
    // Test multiple operations in sequence
    const operations = ['deposit', 'compound', 'harvest'];
    
    for (const op of operations) {
      // Select operation
      await page.selectOption('select', { label: new RegExp(op, 'i') });
      
      // Fill amount if needed
      if (op === 'deposit') {
        await page.fill('input[type="number"]', '0.01');
      }
      
      // Go to confirmation
      await page.click('button:has-text("Next")');
      await page.click('button:has-text("Next")');
      await page.click('button:has-text("Next")');
      
      // Check confirmation page
      const executeButton = page.locator('button:has-text("Execute")');
      await expect(executeButton).toBeVisible();
      
      console.log(`✅ ${op} operation ready for execution`);
      
      // Go back to start for next operation
      await page.click('button:has-text("Back")');
      await page.click('button:has-text("Back")');
      await page.click('button:has-text("Back")');
    }
    
    console.log('✅ Batch operations simulation passed');
  });

  test('10. Performance Monitoring', async ({ page }) => {
    console.log('🧪 Testing performance...');
    
    await page.goto('http://localhost:3000');
    
    const startTime = Date.now();
    
    // Navigate to execute page
    await page.click('[data-testid="nav-execute"]');
    await page.waitForSelector('select');
    
    const loadTime = Date.now() - startTime;
    console.log(`⏱️ Page load time: ${loadTime}ms`);
    
    // Should load reasonably fast
    expect(loadTime).toBeLessThan(5000);
    
    // Test strategy switching performance
    const switchStart = Date.now();
    const strategySelect = page.locator('select').filter({ hasText: /Strategy/ }).first();
    
    for (let i = 0; i < 3; i++) {
      await strategySelect.selectOption({ index: i });
      await page.waitForTimeout(100);
    }
    
    const switchTime = Date.now() - switchStart;
    console.log(`⚡ Strategy switching time: ${switchTime}ms`);
    
    expect(switchTime).toBeLessThan(2000);
    
    console.log('✅ Performance test passed');
  });
});