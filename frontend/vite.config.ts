import tailwindcss from "@tailwindcss/vite";
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url'; // Added import
import { defineConfig } from 'vite';

// Derive __dirname in ES Module context
const __filename = fileURLToPath(import.meta.url); // Added line
const __dirname = path.dirname(__filename); // Added line

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [tailwindcss(), react()],
  resolve: {
    extensions: ['.js', '.ts', '.jsx', '.tsx', '.json'],
    alias: {
      // Use the derived __dirname
      '@': path.resolve(__dirname, './src'),
      '@shared': path.resolve(__dirname, '../shared')
    }
  },
  server: {
    host: '0.0.0.0',  // Make server accessible from outside
    port: 5173,
    // https: {
    //   key: fs.readFileSync(path.resolve(__dirname, '../certs/key.pem')), // Ensure __dirname is used here too if uncommented
    //   cert: fs.readFileSync(path.resolve(__dirname, '../certs/cert.pem')), // Ensure __dirname is used here too if uncommented
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
      allow: ['..', '../shared'], // This line was present before
    },
  }
});