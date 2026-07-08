import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': '/src',
      '@bits': '/src/components/bits'
    }
  },
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:9688',
        changeOrigin: true
      },
      '/actuator': {
        target: 'http://localhost:9689',
        changeOrigin: true
      },
      '/v3/api-docs': {
        target: 'http://localhost:9688',
        changeOrigin: true
      },
      '/swagger-ui': {
        target: 'http://localhost:9688',
        changeOrigin: true
      }
    }
  }
});
