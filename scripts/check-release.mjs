#!/usr/bin/env node
// Copyright 2026 Cisco Systems, Inc. and its affiliates
//
// SPDX-License-Identifier: Apache-2.0

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function run(label, command, args) {
  console.log(`\n== ${label} ==`);
  execFileSync(command, args, { stdio: 'inherit' });
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function verifyLockfileEntry(manifestPath, lockEntryPath, lock) {
  const manifest = readJson(manifestPath);
  const lockEntry = lock.packages?.[lockEntryPath];
  if (!lockEntry) throw new Error(`package-lock.json is missing ${lockEntryPath || 'the root package'}.`);

  for (const field of ['name', 'version']) {
    if (manifest[field] !== lockEntry[field]) {
      throw new Error(`${manifestPath} ${field} does not match package-lock.json.`);
    }
  }

  for (const field of ['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies']) {
    const manifestValue = manifest[field] ?? {};
    const lockValue = lockEntry[field] ?? {};
    if (JSON.stringify(manifestValue) !== JSON.stringify(lockValue)) {
      throw new Error(`${manifestPath} ${field} does not match package-lock.json.`);
    }
  }
}

function verifyReleaseMetadata() {
  const root = readJson('package.json');
  const dist = readJson('packages/mcptoolkit-editor-dist/package.json');
  const lock = readJson('package-lock.json');

  const versions = [root.version, dist.version, lock.version];
  if (versions.some((version) => version !== root.version)) {
    throw new Error(`Root, editor-dist, and top-level lockfile versions must all match (${versions.join(', ')}).`);
  }

  verifyLockfileEntry('package.json', '', lock);
  verifyLockfileEntry(
    'packages/mcptoolkit-editor-dist/package.json',
    'packages/mcptoolkit-editor-dist',
    lock,
  );
  verifyLockfileEntry(
    'packages/mcptoolkit-viewer/package.json',
    'packages/mcptoolkit-viewer',
    lock,
  );

  const badgeVersion = root.version.replaceAll('-', '--');
  if (!readFileSync('README.md', 'utf8').includes(`/status-${badgeVersion}-`)) {
    throw new Error(`README status badge does not match ${root.version}. Run npm run release:prepare -- ${root.version}.`);
  }

  for (const path of ['CHANGELOG.md', 'packages/mcptoolkit-editor-dist/CHANGELOG.md']) {
    if (!readFileSync(path, 'utf8').includes(`## [${root.version}]`)) {
      throw new Error(`${path} is missing ## [${root.version}].`);
    }
  }

  console.log(`Release metadata verified (${root.version}).`);
}

function changedFiles() {
  const commands = [
    ['diff', '--name-only', 'main...HEAD'],
    ['diff', '--name-only'],
    ['diff', '--name-only', '--cached'],
    ['ls-files', '--others', '--exclude-standard'],
  ];
  const files = new Set();
  for (const args of commands) {
    try {
      const output = execFileSync('git', args, { encoding: 'utf8' });
      output.split('\n').filter(Boolean).forEach((file) => files.add(file));
    } catch {
      return null;
    }
  }
  return files;
}

function viewerNeedsBuild(files) {
  if (!files) return true;
  return [...files].some((file) =>
    file.startsWith('packages/mcptoolkit-viewer/') ||
    file.startsWith('src/core/') ||
    file === 'tsconfig.json' ||
    file === 'vite.config.ts');
}

function smokeTestEditorDist() {
  const distRoot = resolve('packages/mcptoolkit-editor-dist/dist');
  const htmlPath = resolve(distRoot, 'index.html');
  if (!existsSync(htmlPath)) throw new Error('editor-dist build did not produce dist/index.html.');

  const html = readFileSync(htmlPath, 'utf8');
  if (!html.includes('id="root"')) throw new Error('Built editor entry point has no #root mount element.');

  const assetPaths = [...html.matchAll(/(?:src|href)="(\.\/assets\/[^"]+)"/g)].map((match) => match[1]);
  if (assetPaths.length === 0) throw new Error('Built editor entry point has no relative assets.');
  for (const assetPath of assetPaths) {
    if (!existsSync(resolve(distRoot, assetPath))) throw new Error(`Built asset is missing: ${assetPath}`);
  }
  console.log(`Built editor smoke test passed (${assetPaths.length} entry-point assets).`);
}

const statusBefore = execFileSync('git', ['status', '--porcelain'], { encoding: 'utf8' });

try {
  console.log('== Release metadata ==');
  verifyReleaseMetadata();
  run('Lint', 'npm', ['run', 'lint']);
  run('Tests', 'npm', ['run', 'test']);
  run('Build editor-dist', 'npm', ['run', 'build', '--workspace=packages/mcptoolkit-editor-dist']);

  console.log('\n== Built artifact smoke test ==');
  smokeTestEditorDist();
  run('Package dry run', 'npm', ['pack', '--dry-run', '--workspace=packages/mcptoolkit-editor-dist']);

  const files = changedFiles();
  if (viewerNeedsBuild(files)) {
    run('Build viewer (affected)', 'npm', ['run', 'build:viewer']);
  } else {
    console.log('\n== Build viewer ==\nSkipped: no viewer or shared core changes detected.');
  }

  const statusAfter = execFileSync('git', ['status', '--porcelain'], { encoding: 'utf8' });
  if (statusAfter !== statusBefore) {
    throw new Error('Release checks changed tracked or untracked source files. Review git status.');
  }

  console.log('\nRelease checks passed.');
} catch (error) {
  console.error(`\nRelease check failed: ${error.message}`);
  process.exit(1);
}
