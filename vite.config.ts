// Copyright 2026 Cisco Systems, Inc. and its affiliates
//
// SPDX-License-Identifier: Apache-2.0

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { resolve } from 'path';

export default defineConfig({
  // Relative asset paths so the prebuilt dist/ (shipped as
  // @cisco_open/mcptoolkit-editor-dist) can be served from any origin or subpath.
  base: './',
  plugins: [react(), tailwindcss()],
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
});
