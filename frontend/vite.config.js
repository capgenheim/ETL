import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [react()],
    server: {
        host: '0.0.0.0',
        port: 3000,
        hmr: {
            clientPort: 80, // HMR WebSocket goes through nginx (port 3000 is internal-only)
        },
        watch: {
            usePolling: true, // Required for Docker volume mounts
        },
        proxy: {
            '/api': {
                target: 'http://backend:8000',
                changeOrigin: true,
            },
            '/o': {
                target: 'http://backend:8000',
                changeOrigin: true,
            },
            '/admin': {
                target: 'http://backend:8000',
                changeOrigin: true,
            },
        },
    },
    test: {
        globals: true,
        environment: 'jsdom',
        setupFiles: './src/test/setup.js',
        css: true,
    },
});
