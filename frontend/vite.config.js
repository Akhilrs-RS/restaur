import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5555',
        changeOrigin: true,
        secure: false,
      },
      '/hubs': {
        target: 'http://localhost:5555',
        ws: true,
        changeOrigin: true,
        secure: false,
      }
    }
  }
});
