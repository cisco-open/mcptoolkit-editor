// Copyright 2026 Cisco Systems, Inc. and its affiliates
//
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';
import type { McpDescDocument } from '../../core/types';
import miroExample from '../../../examples/vendors/miro.mcpdesc.yaml?raw';
import { sourceItemPath, sourcePathToLine } from './navigation';

const doc = {
  mcpdesc: '0.8.0',
  info: { name: 'chess', version: '2.0.0' },
  protocolVersions: ['2025-11-25', '2026-07-28'],
  tools: [
    { name: 'common', inputSchema: {} },
    { name: 'analyze_game', protocolVersions: ['2025-11-25'], inputSchema: {} },
    { name: 'analyze_game', protocolVersions: ['2026-07-28'], inputSchema: {} },
  ],
} satisfies McpDescDocument;

describe('sourceItemPath', () => {
  it('preserves the source index when all protocol versions are displayed', () => {
    expect(sourceItemPath(doc, 'tools', 'analyze_game', 2, null)).toBe('/tools/2/name');
  });

  it('resolves a projected duplicate by its selected protocol version', () => {
    expect(sourceItemPath(doc, 'tools', 'analyze_game', 1, '2026-07-28')).toBe('/tools/2/name');
  });
});

describe('sourcePathToLine', () => {
  const source = `tools:
- name: common
  inputSchema: {}
- name: analyze_game
  protocolVersions:
  - '2025-11-25'
  inputSchema: {}
- name: analyze_game
  protocolVersions:
  - '2026-07-28'
  inputSchema: {}
`;

  it('locates each duplicate declaration without an off-by-one error', () => {
    expect(sourcePathToLine(source, '/tools/1/name')).toBe(4);
    expect(sourcePathToLine(source, '/tools/2/name')).toBe(8);
  });

  it('locates the Miro pre-standard extensions warning', () => {
    expect(sourcePathToLine(miroExample, '/capabilities/0/extensions')).toBe(24);
  });
});