import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',  // Make server accessible from outside
    port: 5173,
    https: {
      key: fs.readFileSync(path.resolve(__dirname, '../certs/key.pem')),
      cert: fs.readFileSync(path.resolve(__dirname, '../certs/cert.pem')),
    },
    proxy: {
      '/api': {
        target: 'https://localhost:5000',
        changeOrigin: true,
        secure: false,  // Allow self-signed certificates
        rewrite: (path) => path
      }
    }
  }
});