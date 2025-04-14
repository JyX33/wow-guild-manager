import tailwindcss from "@tailwindcss/vite";
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url'; // Added import
import { defineConfig, loadEnv } from 'vite';

// Derive __dirname in ES Module context
const __filename = fileURLToPath(import.meta.url); // Added line
const __dirname = path.dirname(__filename); // Added line

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, process.cwd(), '');

  const serverConfig: {
    host: string;
    port: number;
    https?: { key: Buffer; cert: Buffer };
    proxy: any;
    fs: any;
  } = {
    host: '0.0.0.0',  // Make server accessible from outside
    port: 5173,
    proxy: {
      '/api': {
        // Use the VITE_DEV_PROXY_TARGET from .env files, fallback to localhost:5000
        target: env.VITE_DEV_PROXY_TARGET || 'http://localhost:5000',
        changeOrigin: true,
        secure: false,  // Allow self-signed certificates (for proxy target)
        rewrite: (path) => path
      }
    },
    fs: {
      allow: ['..', '../shared'], // Allow serving files from shared directory
    },
  };

  // Enable HTTPS only in development mode and if cert files exist
  if (mode === 'development') {
    const keyPath = path.resolve(__dirname, '../certs/key.pem');
    const certPath = path.resolve(__dirname, '../certs/cert.pem');
    try {
      if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
        serverConfig.https = {
          key: fs.readFileSync(keyPath),
          cert: fs.readFileSync(certPath)
        };
        console.log('HTTPS enabled for Vite dev server.');
      } else {
        console.log('HTTPS certificate files not found, running HTTP only.');
      }
    } catch (error) {
      console.error('Error reading HTTPS certificate files:', error);
      console.log('Running HTTP only due to certificate error.');
    }
  }

  return {
    plugins: [tailwindcss(), react()],
    resolve: {
      extensions: ['.js', '.ts', '.jsx', '.tsx', '.json'],
      alias: {
        // Use the derived __dirname
        '@': path.resolve(__dirname, './src'),
        '@shared': path.resolve(__dirname, '../shared')
      }
    },
    server: serverConfig
  };
});