import { describe, expect, it } from 'vitest';
import { convertTo09, conversionFixes } from './conversion';
import { McpDescValidator, MCPDESC_SCHEMA_URI, MCPDESC_SPECIFICATION } from './validator';
import { projectMcpNativeValue } from '@mcpdesc/core';

const source = {
  mcpdesc: '0.8.0',
  info: { name: 'test', version: '1.0' },
  protocolVersions: ['2025-11-25'],
};

describe('0.8.0 to 0.9.0 conversion', () => {
  it.each([undefined, 'https://mcpdesc.org/schema/mcp-description/0.8.0.json'])(
    'always declares the RC.3 schema (source schema: %s)', ($schema) => {
      const document = { ...source, ...($schema ? { $schema } : {}) };
      const before = structuredClone(document);
      const result = convertTo09(document);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value).toMatchObject({ mcpdesc: '0.9.0', $schema: MCPDESC_SCHEMA_URI });
      expect(result.patch).toContainEqual({
        op: $schema ? 'replace' : 'add', path: '/$schema', value: MCPDESC_SCHEMA_URI,
      });
      expect(new McpDescValidator().validateDocument(result.value).valid).toBe(true);
      expect(document).toEqual(before);
    },
  );

  it('blocks ambiguous values and applies only explicitly requested fixes', () => {
    const document = {
      ...source,
      tools: [{ name: 'inspect', inputSchema: { type: 'object' }, annotations: { 'x-tier': 'gold' } }],
    };
    const blocked = convertTo09(document);
    expect(blocked.ok).toBe(false);
    const diagnostic = blocked.diagnostics.find(({ rule }) => rule?.endsWith('tool-annotations-closed'))!;
    expect(conversionFixes(diagnostic)).toEqual(['remove-property']);
    const result = convertTo09(document, [{ fix: 'remove-property', path: diagnostic.path }]);
    expect(result.ok).toBe(true);
    expect(document.tools[0].annotations).toEqual({ 'x-tier': 'gold' });
  });

  it('moves a custom requirement only with explicit author consent', () => {
    const document = { ...source, tools: [{
      name: 'inspect', inputSchema: { type: 'object' }, clientRequirements: { replay: {} },
    }] };
    const blocked = convertTo09(document);
    expect(blocked.ok).toBe(false);
    const diagnostic = blocked.diagnostics.find(({ rule }) => rule?.endsWith('client-requirements-closed'))!;
    expect(conversionFixes(diagnostic)).toEqual(['remove-property', 'move-to-experimental']);
    const converted = convertTo09(document, [{ fix: 'move-to-experimental', path: diagnostic.path }]);
    expect(converted.ok).toBe(true);
    if (!converted.ok) return;
    expect(converted.value.tools).toMatchObject([{ clientRequirements: { experimental: { replay: {} } } }]);
    expect(document.tools[0].clientRequirements).toEqual({ replay: {} });
  });

  it.each([
    { resource: { size: 1.5, uri: 'docs://readme' }, rule: 'integer-numbers' },
    { resource: { uri: 'docs/readme' }, rule: 'resource-uri-checked' },
  ])('does not guess a fix for $rule', ({ resource, rule }) => {
    const result = convertTo09({ ...source, resources: [{ name: 'readme', ...resource }] });
    expect(result.ok).toBe(false);
    const diagnostic = result.diagnostics.find((item) => item.rule?.endsWith(rule))!;
    expect(diagnostic).toBeDefined();
    expect(conversionFixes(diagnostic)).toEqual([]);
  });

  it.each([
    { kind: 'tool', expected: { name: 'inspect', inputSchema: { type: 'object' } } },
    { kind: 'resource', expected: { name: 'readme', uri: 'docs://readme' } },
    { kind: 'resourceTemplate', expected: { name: 'docs', uriTemplate: 'docs://{name}' } },
    { kind: 'prompt', expected: { name: 'help' } },
  ] as const)('projects native $kind values after conversion', ({ kind, expected }) => {
    const converted = convertTo09({
      ...source,
      components: { schemas: { Input: { type: 'object' } } },
      tools: [{ name: 'inspect', inputSchema: { $componentRef: '#/components/schemas/Input' }, 'x-tier': 'gold' }],
      resources: [{ name: 'readme', uri: 'docs://readme', 'x-tier': 'gold' }],
      resourceTemplates: [{ name: 'docs', uriTemplate: 'docs://{name}', 'x-tier': 'gold' }],
      prompts: [{ name: 'help', 'x-tier': 'gold' }],
    });
    expect(converted.ok).toBe(true);
    if (!converted.ok) return;
    const result = projectMcpNativeValue(converted.value, { selector: MCPDESC_SPECIFICATION, protocolVersion: '2025-11-25', kind });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toEqual([expected]);
  });

  it('can validate with a warning while native MCP projection fails its postcondition', () => {
    const document = {
      ...source, mcpdesc: '0.9.0', $schema: MCPDESC_SCHEMA_URI,
      tools: [{ name: 'inspect', inputSchema: { type: 'object', properties: { flag: true } } }],
    };
    const validation = new McpDescValidator().validateDocument(document);
    expect(validation.valid).toBe(true);
    expect(validation.warnings).toContainEqual(expect.objectContaining({
      keyword: 'tool-schema-mcp-type-mismatch', protocolVersions: ['2025-11-25'],
    }));
    const result = projectMcpNativeValue(document, { selector: MCPDESC_SPECIFICATION, protocolVersion: '2025-11-25', kind: 'tool' });
    expect(result.ok).toBe(false);
    expect(result.diagnostics).toContainEqual(expect.objectContaining({ code: 'projection-postcondition-failed' }));
  });
});