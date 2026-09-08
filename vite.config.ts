// Copyright 2026 Cisco Systems, Inc. and its affiliates
//
// SPDX-License-Identifier: Apache-2.0

import { defineConfig, type Plugin } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { resolve } from 'path';

const appUrlImportPlugin = {
  name: 'app-url-import-query',
  configureServer(server) {
    server.middlewares.use((request, _response, next) => {
      if (request.url && request.headers.accept?.includes('text/html')) {
        const requestUrl = new URL(request.url, 'http://localhost');
        if (requestUrl.searchParams.has('url')) request.url = requestUrl.pathname;
      }
      next();
    });
  },
  configurePreviewServer(server) {
    server.middlewares.use((request, _response, next) => {
      if (request.url && request.headers.accept?.includes('text/html')) {
        const requestUrl = new URL(request.url, 'http://localhost');
        if (requestUrl.searchParams.has('url')) request.url = requestUrl.pathname;
      }
      next();
    });
  },
} satisfies Plugin;

export default defineConfig({
  // Relative asset paths so the prebuilt dist/ (shipped as
  // @cisco_open/mcptoolkit-editor-dist) can be served from any origin or subpath.
  base: './',
  plugins: [appUrlImportPlugin, react(), tailwindcss()],
  resolve: {
    alias: {
      '@': '/src',
      '@core': resolve(__dirname, 'src/core'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          monaco: ['monaco-editor', '@monaco-editor/react'],
          vendor: ['react', 'react-dom', 'ajv', 'handlebars', 'yaml'],
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.test.{ts,tsx}', 'packages/*/src/**/*.test.{ts,tsx}'],
  },
});
