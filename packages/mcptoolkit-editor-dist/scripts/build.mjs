// Copyright 2026 Cisco Systems, Inc. and its affiliates
//
// SPDX-License-Identifier: Apache-2.0

// Builds the MCP Description Editor app at the repository root and copies the
// resulting dist/ into this package, so it can be published as a self-contained,
// prebuilt static bundle (the swagger-editor-dist analog).

import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { rmSync, cpSync, existsSync } from 'node:fs';

const scriptsDir = dirname(fileURLToPath(import.meta.url));
const packageRoot = resolve(scriptsDir, '..');
const repoRoot = resolve(packageRoot, '..', '..');

// 1. Build the editor app at the repo root (Vite is configured with base: './',
//    so the output uses relative asset paths and is subpath-safe).
console.log('Building editor app at repo root…');
execSync('npm run build', { cwd: repoRoot, stdio: 'inherit' });

// 2. Copy the freshly built dist/ into this package's dist/.
const srcDist = resolve(repoRoot, 'dist');
const destDist = resolve(packageRoot, 'dist');

if (!existsSync(srcDist)) {
  throw new Error(`Expected build output at ${srcDist} but it does not exist.`);
}

rmSync(destDist, { recursive: true, force: true });
cpSync(srcDist, destDist, { recursive: true });

console.log(`Copied ${srcDist} -> ${destDist}`);
