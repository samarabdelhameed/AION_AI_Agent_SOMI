import { FullConfig } from '@playwright/test';

/**
 * Global teardown for Playwright tests
 * Cleans up after automated testing is complete
 */
async function globalTeardown(config: FullConfig) {
  console.log('🧹 Starting global teardown for automated dashboard testing...');

  try {
    // Perform cleanup tasks
    // - Clear test data
    // - Reset configurations
    // - Generate final reports

    console.log('✅ Global teardown completed successfully');
  } catch (error) {
    console.error('❌ Global teardown failed:', error);
    // Don't throw error in teardown to avoid masking test failures
  }
}

export default globalTeardown;