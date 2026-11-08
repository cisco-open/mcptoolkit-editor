import { describe, expect, it, vi } from 'vitest';
import * as core from '@mcpdesc/core';
import { nativeExportFilename, projectNativeExport } from './nativeExport';
import type { McpDescDocument } from './core/types';

vi.mock('@mcpdesc/core', { spy: true });

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

  it.each([undefined, 'analyze_game'])('reports the extensions warning once for selection %s', (identifier) => {
    const result = projectNativeExport({
      ...doc,
      capabilities: [{ tools: { listChanged: true }, extensions: { 'io.modelcontextprotocol/ui': {} } }],
    }, { kind: 'tool', identifier }, '2025-11-25');
    expect(result.ok).toBe(true);
    expect(result.diagnostics).toHaveLength(1);
    expect(result.diagnostics[0]).toMatchObject({
      severity: 'warning',
      rule: 'mcp.capabilities.extensions.protocol-version',
      path: ['capabilities', 0, 'extensions'],
    });
    expect(result.ok && result.value).toEqual(identifier
      ? { name: 'analyze_game', inputSchema: { type: 'object' } }
      : [{ name: 'analyze_game', inputSchema: { type: 'object' } }]);
  });

  it('preserves distinct findings and failed results when deduplicating protocol context', () => {
    const diagnostic: core.CoreDiagnostic = {
      code: 'finding', severity: 'warning', message: 'Finding', path: ['tools', 0],
      rule: 'rule', phase: 'source', protocolVersions: ['2025-11-25'],
    };
    const distinct: core.CoreDiagnostic[] = [
      diagnostic,
      { ...diagnostic, code: 'another-code' },
      { ...diagnostic, severity: 'error' },
      { ...diagnostic, message: 'Another finding' },
      { ...diagnostic, path: ['tools', 1] },
      { ...diagnostic, rule: 'another-rule' },
      { ...diagnostic, protocolVersion: '2026-07-28' },
      { ...diagnostic, protocolVersions: ['2026-07-28'] },
      { ...diagnostic, relatedLocations: [{ path: ['components'], relation: 'component-definition' }] },
    ];
    vi.mocked(core.projectMcpNativeValue).mockReturnValueOnce({
      ok: false,
      diagnostics: [...distinct, { ...diagnostic, protocolVersion: '2025-11-25', phase: 'result' }],
    });
    const result = projectNativeExport(doc, { kind: 'tool' }, '2025-11-25');
    expect(result.ok).toBe(false);
    expect(result).not.toHaveProperty('value');
    expect(result.diagnostics).toEqual(distinct);
  });

  it.each([
    ['tool', 'tools', { _meta: { z: 1, a: 2 }, inputSchema: { properties: { z: { type: 'string' }, a: { type: 'string' } }, type: 'object' }, description: 'Tool', name: 'item' }, ['name', 'description', 'inputSchema', '_meta']],
    ['resource', 'resources', { description: 'Resource', name: 'item', uri: 'file:///item' }, ['uri', 'name', 'description']],
    ['resourceTemplate', 'resourceTemplates', { description: 'Template', name: 'item', uriTemplate: 'file:///{item}' }, ['uriTemplate', 'name', 'description']],
    ['prompt', 'prompts', { arguments: [{ description: 'Argument', name: 'arg' }], description: 'Prompt', name: 'item' }, ['name', 'description', 'arguments']],
  ] as const)('uses document field order for native %s', (kind, collection, value, keys) => {
    const input = { ...doc, [collection]: [value] };
    const original = JSON.stringify(input);
    const result = projectNativeExport(input, { kind }, '2025-11-25');
    expect(result.ok, JSON.stringify(result.diagnostics)).toBe(true);
    if (!result.ok || !Array.isArray(result.value) || !result.value[0]
      || typeof result.value[0] !== 'object' || Array.isArray(result.value[0])) {
      throw new Error('Expected native collection of objects');
    }
    expect(Object.keys(result.value[0])).toEqual(keys);
    if (kind === 'tool') {
      expect(JSON.stringify(result.value[0])).toContain('"properties":{"z":{"type":"string"},"a":{"type":"string"}}');
      expect(JSON.stringify(result.value[0])).toContain('"_meta":{"z":1,"a":2}');
    }
    expect(JSON.stringify(input)).toBe(original);
  });
});