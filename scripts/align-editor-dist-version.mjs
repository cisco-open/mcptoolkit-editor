#!/usr/bin/env node
// Copyright 2026 Cisco Systems, Inc. and its affiliates
//
// SPDX-License-Identifier: Apache-2.0

/**
 * Keeps @cisco_open/mcptoolkit-editor-dist's version aligned with the root
 * editor app version (the source of truth). The -dist package is literally the
 * built root app, so the two must always match. The viewer
 * (@cisco_open/mcptoolkit-viewer) versions independently and is NOT touched.
 *
 *   node scripts/align-editor-dist-version.mjs           # align (write dist version)
 *   node scripts/align-editor-dist-version.mjs --check   # verify only (exit 1 on drift)
 */
import { readFileSync, writeFileSync } from 'node:fs';

const check = process.argv.includes('--check');
const ROOT = 'package.json';
const DIST = 'packages/mcptoolkit-editor-dist/package.json';

const rootVersion = JSON.parse(readFileSync(ROOT, 'utf8')).version;
const distRaw = readFileSync(DIST, 'utf8');
const distVersion = JSON.parse(distRaw).version;

if (distVersion === rootVersion) {
  console.log(`editor-dist version aligned with root app (${rootVersion}) ✓`);
  process.exit(0);
}

if (check) {
  console.error(
    `::error::Version drift: root app is ${rootVersion} but ` +
      `packages/mcptoolkit-editor-dist is ${distVersion}. ` +
      'Run `npm run sync:version` then `npm install`, and commit.',
  );
  process.exit(1);
}

// Replace only the top-level "version" string, preserving file formatting.
const updated = distRaw.replace(/("version":\s*")[^"]*(")/, `$1${rootVersion}$2`);
writeFileSync(DIST, updated, 'utf8');
console.log(`editor-dist version ${distVersion} → ${rootVersion} (aligned to root app)`);
