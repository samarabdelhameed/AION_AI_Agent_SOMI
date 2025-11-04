// Simple Node.js script to test the system
const { execSync } = require('child_process');

console.log('🚀 Testing automated dashboard testing system...');

try {
  // Test TypeScript compilation
  console.log('Checking TypeScript compilation...');
  execSync('npx tsc --noEmit --project frontend/tsconfig.json', { stdio: 'inherit' });
  console.log('✅ TypeScript compilation successful');

  // Test if Playwright is properly configured
  console.log('Checking Playwright configuration...');
  execSync('cd frontend && npx playwright --version', { stdio: 'inherit' });
  console.log('✅ Playwright is properly installed');

  console.log('🎉 System verification completed successfully!');
  console.log('📋 Next: Run the actual tests with npm run test:automated');

} catch (error) {
  console.error('❌ System verification failed:', error.message);
  process.exit(1);
}