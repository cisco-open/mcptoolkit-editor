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
    expect(sourcePathToLine(miroExample, '/capabilities/0/extensions')).toBe(23);
  });

  it('locates YAML property keys rather than their block values', () => {
    expect(sourcePathToLine(source, '/tools')).toBe(1);
    expect(sourcePathToLine(source, '/tools/1/protocolVersions')).toBe(5);
    expect(sourcePathToLine('info:\n  name: chess\n', '/info')).toBe(1);
    expect(sourcePathToLine('description: |\n  Details\n', '/description')).toBe(1);
  });

  it('keeps array entries at their value locations', () => {
    expect(sourcePathToLine(source, '/tools/1')).toBe(4);
    expect(sourcePathToLine(source, '/tools/1/protocolVersions/0')).toBe(6);
  });

  it('locates JSON keys when their values start on another line', () => {
    const json = '{\n  "transport":\n    [\n      { "type": "stdio" }\n    ]\n}';
    expect(sourcePathToLine(json, '/transport')).toBe(2);
    expect(sourcePathToLine(json, '/transport/0/type')).toBe(4);
  });

  it('decodes escaped pointer segments and preserves numeric property names', () => {
    const yaml = 'extensions:\n  a/b~c:\n    123:\n      enabled: true\n';
    expect(sourcePathToLine(yaml, '/extensions/a~1b~0c')).toBe(2);
    expect(sourcePathToLine(yaml, '/extensions/a~1b~0c/123')).toBe(3);
  });

  it('returns no location for missing paths or invalid source', () => {
    expect(sourcePathToLine(source, '/transport')).toBe(0);
    expect(sourcePathToLine(source, '/tools/9')).toBe(0);
    expect(sourcePathToLine('tools: [', '/tools')).toBe(0);
  });
});