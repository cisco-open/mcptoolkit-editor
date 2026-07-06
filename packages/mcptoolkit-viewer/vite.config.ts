// Copyright 2026 Cisco Systems, Inc. and its affiliates
//
// SPDX-License-Identifier: Apache-2.0

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import dts from 'vite-plugin-dts';
import { resolve } from 'path';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    dts({
      include: ['src'],
      rollupTypes: false,
      tsconfigPath: resolve(__dirname, 'tsconfig.json'),
      outDir: resolve(__dirname, 'dist'),
      root: resolve(__dirname),
    }),
  ],
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
  },
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.tsx'),
      name: 'McpToolkitViewer',
      formats: ['umd', 'es'],
      fileName: (format) => format === 'umd' ? 'mcptoolkit-viewer.js' : 'mcptoolkit-viewer.mjs',
    },
    rollupOptions: {
      output: {
        // Expose the McpToolkitViewer function as a global for UMD consumers
        exports: 'named',
      },
    },
    cssCodeSplit: false,
    sourcemap: true,
  },
  resolve: {
    alias: {
      '@core': resolve(__dirname, '../../src/core'),
    },
  },
});
