#!/usr/bin/env node
// Copyright 2026 Cisco Systems, Inc. and its affiliates
//
// SPDX-License-Identifier: Apache-2.0

import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

const version = process.argv[2];
const VERSION_RE = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z]+(?:\.[0-9A-Za-z]+)*)?$/;

function run(command, args, options = {}) {
  console.log(`\n> ${command} ${args.join(' ')}`);
  execFileSync(command, args, { stdio: 'inherit', ...options });
}

function updateManifest(path) {
  const raw = readFileSync(path, 'utf8');
  const current = JSON.parse(raw).version;
  const updated = raw.replace(/("version":\s*")[^"]*(")/, `$1${version}$2`);
  writeFileSync(path, updated, 'utf8');
  console.log(`${path}: ${current} -> ${version}`);
}

if (!version || !VERSION_RE.test(version)) {
  console.error('Usage: npm run release:prepare -- <semver>');
  process.exit(1);
}

const branch = execFileSync('git', ['branch', '--show-current'], { encoding: 'utf8' }).trim();
if (branch !== `release/${version}`) {
  console.error(`Expected branch release/${version}; current branch is ${branch || '(detached HEAD)'}.`);
  process.exit(1);
}

for (const path of ['CHANGELOG.md', 'packages/mcptoolkit-editor-dist/CHANGELOG.md']) {
  const changelog = readFileSync(path, 'utf8');
  if (!changelog.includes(`## [${version}]`)) {
    console.error(`${path} must contain a ## [${version}] release section before preparation.`);
    process.exit(1);
  }
}

updateManifest('package.json');
updateManifest('packages/mcptoolkit-editor-dist/package.json');
run('npm', ['install', '--package-lock-only', '--ignore-scripts']);
run('npm', ['run', 'sync:badge']);
run('npm', ['run', 'verify:versions']);

console.log('\nRelease preparation complete. Review and commit these changes:');
run('git', ['diff', '--stat']);
