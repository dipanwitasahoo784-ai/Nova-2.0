import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  define: {
    // Specifically stringify the API_KEY for the application's runtime
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY),
    // Provide a safe fallback for process.env
    'process.env': {}
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
  },
  server: {
    port: 3000,
    host: true
  }
});