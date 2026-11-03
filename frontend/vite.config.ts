import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import reactLegacy from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
    plugins: [process.env.VITEST ? reactLegacy() : react()],
    define: process.env.VITEST
        ? {
              __vite_ssr_exportName__:
                  '(function(m,n){return m&&(m[n]!==undefined?m[n]:m.default&&m.default[n])})',
          }
        : undefined,
    test: {
        globals: true,
        environment: 'jsdom',
        setupFiles: './src/test/setup.ts',
        pool: 'forks',
        server: {
            deps: {
                inline: ['react', 'react-dom', 'react-router-dom'],
            },
        },
    },
    server: {
        host: '0.0.0.0',
        watch: {
            usePolling: true, // required for hot reload on Windows with Docker bind mounts
        },
        // Requests to localhost:8000/api/* are proxied to the backend on 8001 — backend must be running (e.g. ./gradlew bootRun)
        // Match Docker host mapping compose.yaml `8000:8000` so dev URLs/logs show localhost:8000
        port: 8000,
        // /api/* proxied to backend service in Docker Compose (backend-dev:8080)
        proxy: {
            '/api': {
                target: 'http://backend-dev:8080',
                changeOrigin: true,
                secure: false,
            },
        },
    },
});
