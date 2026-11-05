import { describe, expect, it } from 'vitest';
import { nativeExportFilename, projectNativeExport } from './nativeExport';
import type { McpDescDocument } from './core/types';

const doc: McpDescDocument = {
  mcpdesc: '0.9.0',
  info: { name: 'chess-coach', version: '1' },
  protocolVersions: ['2025-11-25'],
  tools: [{ name: 'analyze_game', inputSchema: { type: 'object' }, 'x-tier': 'gold' }],
};

describe('native exports', () => {
  it('distinguishes collection and individual filenames', () => {
    expect(nativeExportFilename(doc.info.name, { kind: 'tool' }, '2025-11-25'))
      .toBe('chess-coach.mcp.tools.2025-11-25.json');
    expect(nativeExportFilename(doc.info.name, { kind: 'tool', identifier: 'analyze_game' }, '2025-11-25'))
      .toBe('chess-coach.mcp.tool.analyze_game.2025-11-25.json');
    expect(nativeExportFilename('../server/', { kind: 'resource', identifier: 'docs://games/{id}?v=1' }, '2025-11-25'))
      .toBe('server.mcp.resource.docs-games-id-v-1.2025-11-25.json');
  });

  it('projects an array for a collection and an object for an entry', () => {
    const collection = projectNativeExport(doc, { kind: 'tool' }, '2025-11-25');
    const entry = projectNativeExport(doc, { kind: 'tool', identifier: 'analyze_game' }, '2025-11-25');
    expect(collection.ok && collection.value).toEqual([{ name: 'analyze_game', inputSchema: { type: 'object' } }]);
    expect(entry.ok && entry.value).toEqual({ name: 'analyze_game', inputSchema: { type: 'object' } });
  });

  it('does not substitute source values when projection fails', () => {
    const result = projectNativeExport({ ...doc, tools: [{
      name: 'analyze_game', inputSchema: { type: 'object', properties: { flag: true } },
    }] }, { kind: 'tool' }, '2025-11-25');
    expect(result.ok).toBe(false);
    expect(result).not.toHaveProperty('value');
  });
});