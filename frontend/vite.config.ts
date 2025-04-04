import tailwindcss from "@tailwindcss/vite";
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import { defineConfig } from 'vite';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [tailwindcss(), react()],
  resolve: {
    extensions: ['.js', '.ts', '.jsx', '.tsx', '.json'],
    alias: {
      '@': '/src',
      '@shared': '../shared'
    }
  },
  server: {
    host: '0.0.0.0',  // Make server accessible from outside
    port: 5173,
    // https: {
    //   key: fs.readFileSync(path.resolve(__dirname, '../certs/key.pem')),
    //   cert: fs.readFileSync(path.resolve(__dirname, '../certs/cert.pem')),
    // },
    proxy: {
      '/api': {
        target: 'https://is80s4w8kkccgko8808ookww.82.29.170.182.sslip.io',
        changeOrigin: true,
        secure: false,  // Allow self-signed certificates
        rewrite: (path) => path
      }
    },
    fs: {
      allow: ['..', '../shared'], // <-- Add this line
    },
  }
});