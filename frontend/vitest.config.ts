import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    globals: true,
    testTimeout: 10000, // 10 seconds timeout for all tests
    hookTimeout: 10000, // 10 seconds timeout for hooks
  },
});