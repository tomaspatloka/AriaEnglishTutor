import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  const apiKey = env.VITE_GEMINI_API_KEY || env.GEMINI_API_KEY;

  if (!apiKey) {
    console.warn('\x1b[33m%s\x1b[0m', '⚠️ WARNING: GEMINI_API_KEY or VITE_GEMINI_API_KEY is not set! Build will produce an app without AI functionality.');
  }

  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [react()],
    define: {
      'process.env.API_KEY': JSON.stringify(apiKey),
      'process.env.GEMINI_API_KEY': JSON.stringify(apiKey)
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});
