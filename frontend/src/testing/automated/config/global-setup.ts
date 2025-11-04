import { chromium, FullConfig } from '@playwright/test';

/**
 * Global setup for Playwright tests
 * Initializes the test environment and prepares for automated testing
 */
async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting global setup for automated dashboard testing...');

  try {
    // Launch browser for setup
    const browser = await chromium.launch();
    const context = await browser.newContext();
    const page = await context.newPage();

    // Navigate to the application
    const baseURL = config.projects[0].use.baseURL || 'http://localhost:5173';
    await page.goto(baseURL);

    // Wait for the application to load
    await page.waitForLoadState('networkidle');

    // Perform any necessary setup tasks
    // - Clear local storage
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });

    // - Set up test data if needed
    // - Initialize any required configurations

    console.log('✅ Global setup completed successfully');

    await browser.close();
  } catch (error) {
    console.error('❌ Global setup failed:', error);
    throw error;
  }
}

export default globalSetup;