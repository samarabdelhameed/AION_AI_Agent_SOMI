import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react', '@reown/appkit-siwx'],
    force: true, // Force re-optimization
  },
  server: {
    port: 5173,
    strictPort: true,
    hmr: {
      overlay: false, // Disable error overlay
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: undefined, // Disable manual chunks to prevent 404 errors
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
  },
  base: '/',
  clearScreen: false,
});
