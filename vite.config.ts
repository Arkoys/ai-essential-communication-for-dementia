import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  const apiProxyTarget = env.API_PROXY_TARGET || 'http://localhost:3001';
  return {
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.LLM_PROVIDER': JSON.stringify(env.LLM_PROVIDER),
      'process.env.MINIMAX_API_KEY': JSON.stringify(env.MINIMAX_API_KEY),
      'process.env.MINIMAX_MODEL': JSON.stringify(env.MINIMAX_MODEL),
      'process.env.MINIMAX_API_BASE_URL': JSON.stringify(env.MINIMAX_API_BASE_URL),
      'process.env.MINIMAX_API_PATH': JSON.stringify(env.MINIMAX_API_PATH),
      // Harvard HUIT OpenAI Direct v2 configuration
      'process.env.HARVARD_OPENAI_KEY': JSON.stringify(env.HARVARD_OPENAI_KEY),
      'process.env.HARVARD_OPENAI_BASE_URL': JSON.stringify(env.HARVARD_OPENAI_BASE_URL),
      'process.env.HARVARD_MODEL': JSON.stringify(env.HARVARD_MODEL),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâ€"file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Proxy /api requests to backend service
      // In Docker Compose: http://backend:3001
      // For local development without Docker: http://localhost:3001
      proxy: {
        '/api': {
          target: apiProxyTarget,
          changeOrigin: true,
        },
      },
    },
  };
});
