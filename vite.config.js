import { defineConfig } from 'vite';
// base relativa: funciona em qualquer subdiretório do GitHub Pages (/nome-do-repositorio/)
export default defineConfig({ base: './', build: { target: 'es2020', chunkSizeWarningLimit: 1500 }, server: { host: '127.0.0.1', port: 5173 } });
