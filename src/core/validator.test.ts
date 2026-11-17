import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import legacyV08Example from '../../examples/migration/minimal.mcpdesc-v0.8.yaml?raw';
import reusableComponents from '../../examples/features/reusable-components.yaml?raw';
import stdioServerExample from '../../examples/features/stdio-server.yaml?raw';
import type { McpDescDocument } from './types';
import {
  LAST_0_8_EDITOR_RELEASE,
  MCPDESC_SCHEMA_URI,
  MCPDESC_SPECIFICATION,
  McpDescValidator,
  legacySourceFindings,
  unsupportedFormatMessage,
} from './validator';

const document = {
  mcpdesc: '0.9.0',
  info: { name: 'chess-rating-server', version: '1.0.0' },
  protocolVersions: ['2025-11-25'],
};

describe('0.9.0 validation', () => {
  it('documents the result returned by the stdio chess rating tool', () => {
    const doc: McpDescDocument = parse(stdioServerExample);
    const ratingTool = doc.tools?.find(({ name }) => name === 'get_player_rating');

    expect(ratingTool?.outputSchema).toEqual({
      type: 'object',
      properties: {
        rating: { type: 'integer', description: 'Current FIDE standard rating' },
      },
      required: ['rating'],
      additionalProperties: false,
    });
    expect(new McpDescValidator().validateDocument(doc).valid).toBe(true);
  });

  it('uses the RC.3 default selector and its explicit schema identity', () => {
    expect(MCPDESC_SPECIFICATION).toBe('0.9.0-rc.3');
    expect(MCPDESC_SCHEMA_URI).toBe('https://mcpdesc.org/schema/mcp-description/0.9.0-rc.3.json');
    const result = new McpDescValidator().validateDocument({
      ...document, $schema: MCPDESC_SCHEMA_URI,
      transports: [{ type: 'stdio', command: 'chess-rating', args: ['serve'] }],
    });
    expect(result).toMatchObject({ valid: true, errors: [], selector: '0.9.0-rc.3' });
    expect(result.results).toContainEqual(expect.objectContaining({ rule: 'mcpdesc.transport.members', status: 'passed' }));
  });

  it.each(['0.9.0-rc.1', '0.9.0-draft.4'])(
    'falls back to the configured default for unavailable selector %s',
    (selector) => {
      const result = new McpDescValidator().validateDocument({
        ...document,
        $schema: `https://mcpdesc.org/schema/mcp-description/${selector}.json`,
      });
      expect(result.selector).toBe('0.9.0-rc.3');
    },
  );

  it('continues to reject retired-format schema identities without mcpdesc', () => {
    const result = new McpDescValidator().validateDocument({
      info: document.info,
      $schema: 'https://mcpdesc.org/schema/mcp-description/0.8.0.json',
    });
    expect(result.errors).toEqual([expect.objectContaining({ keyword: 'unsupported-format-version' })]);
  });

  it('reports one focused finding for a misspelled stdio member with structured detail', () => {
    const result = new McpDescValidator().validateDocument({
      ...document, transports: [{ type: 'stdio', command: 'chess-rating', arg: ['serve'] }],
    });
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toMatchObject({
      path: '/transports/0/arg',
      rule: 'mcpdesc.transport.members',
      keyword: 'schema-validation',
      detail: {
        kind: 'unexpected-member', member: 'arg',
        selector: { member: 'type', value: 'stdio' },
        allowedMembers: expect.arrayContaining(['args', 'command']),
      },
    });
  });

  it('locates a missing discriminator at the enclosing object', () => {
    const result = new McpDescValidator().validateDocument({
      ...document, transports: [{ typ: 'streamable-http', url: 'https://example.com/mcp' }],
    });
    expect(result.errors.map(({ path, detail }) => [path, detail?.kind, detail?.member])).toEqual([
      ['/transports/0', 'missing-member', 'type'],
      ['/transports/0/typ', 'unexpected-member', 'typ'],
    ]);
  });

  it('carries component definitions as related locations', () => {
    const doc = parse(reusableComponents);
    doc.components.schemas.SearchRequest.type = 'array';
    const result = new McpDescValidator().validateDocument(doc);
    expect(result.errors).toContainEqual(expect.objectContaining({
      path: '/tools/0/inputSchema',
      relatedLocations: [{ path: '/components/schemas/SearchRequest/type', relation: 'component-definition' }],
    }));
  });
});

describe('unsupported format versions', () => {
  it('reports a 0.8.0 document once at /mcpdesc instead of validating it', () => {
    const result = new McpDescValidator().validateDocument(parse(legacyV08Example));
    expect(result).toMatchObject({ valid: false, warnings: [], selector: null });
    expect(result.errors).toEqual([expect.objectContaining({
      path: '/mcpdesc', keyword: 'unsupported-format-version',
      message: expect.stringContaining('Migrate the document to 0.9.0'),
    })]);
    expect(result.results).toBeUndefined();
  });

  it('rejects a 0.8 schema identity when mcpdesc is absent', () => {
    const result = new McpDescValidator().validateDocument({
      info: document.info, $schema: 'https://mcpdesc.org/schema/mcp-description/0.8.0.json',
    });
    expect(result.errors).toEqual([expect.objectContaining({ path: '/', keyword: 'unsupported-format-version' })]);
  });

  it('points 0.7 and earlier documents to the last 0.8 editor release', () => {
    expect(LAST_0_8_EDITOR_RELEASE.version).toBe('2.2.2');
    for (const version of ['0.7.0', '0.6.1']) {
      expect(unsupportedFormatMessage(version)).toContain(LAST_0_8_EDITOR_RELEASE.url);
    }
    expect(unsupportedFormatMessage('1.0.0')).toContain('Unsupported mcpdesc value "1.0.0"');
    expect(unsupportedFormatMessage('0.9.0')).toBeNull();
  });

  it('lists 0.8 source problems that block migration', () => {
    const doc = parse(legacyV08Example);
    expect(legacySourceFindings(doc)).toEqual([]);
    doc.transports = [{ type: 'stdio', arg: ['serve'] }];
    expect(legacySourceFindings(doc).length).toBeGreaterThan(0);
    expect(legacySourceFindings(doc).every(({ path }) => path.startsWith('/transports/0'))).toBe(true);
  });
});
