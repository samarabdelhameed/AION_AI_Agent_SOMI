import { runComprehensiveSystemTest } from './comprehensive-system-test';

// Run comprehensive test without browser dependency
runComprehensiveSystemTest()
  .then(result => {
    if (result.success) {
      console.log('\n✅ ALL SYSTEMS OPERATIONAL - READY FOR HACKATHON! 🚀');
      console.log(`Final Score: ${result.systemScore}/100`);
      process.exit(0);
    } else {
      console.log('\n❌ System test failed - Review issues');
      console.error('Error:', result.error);
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('💥 Critical system failure:', error);
    process.exit(1);
  });