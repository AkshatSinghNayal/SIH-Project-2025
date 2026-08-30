import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig, loadEnv } from 'vite';

// Ensure __dirname equivalent works in ESM context
const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      server: {
        proxy: {
          '/api': {
            target: env.VITE_API_BASE_URL || 'http://localhost:8787',
            changeOrigin: true,
          },
          '/ws': {
            target: env.VITE_API_BASE_URL || 'http://localhost:8787',
            changeOrigin: true,
            rewriteWsOrigin: true,
            ws: true,
          },
        },
      }
    };
});
