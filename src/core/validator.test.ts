import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import miroExample from '../../examples/vendors/miro.mcpdesc.yaml?raw';
import { MCPDESC_SCHEMA_URI, MCPDESC_SPECIFICATION, MCPDESC_RC_SCHEMA_URI, McpDescValidator } from './validator';

describe('0.8.0 validation', () => {
  it('preserves pre-standard server extensions as a warning', () => {
    const result = new McpDescValidator().validateDocument(parse(miroExample));

    expect(MCPDESC_SPECIFICATION).toBe('0.8.0');
    expect(MCPDESC_SCHEMA_URI).toBe(
      'https://mcpdesc.org/schema/mcp-description/0.8.0.json',
    );
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.warnings).toContainEqual(expect.objectContaining({
      keyword: 'extensions-not-supported-by-version',
      path: '/capabilities/0/extensions',
    }));
  });
});

describe('0.9.0 RC.2 validation', () => {
  const document = {
    mcpdesc: '0.9.0',
    info: { name: 'chess-rating-server', version: '1.0.0' },
    protocolVersions: ['2025-11-25'],
  };

  it('uses RC.2 and preserves rule results and version-scoped diagnostics', () => {
    const doc = parse(miroExample);
    doc.mcpdesc = '0.9.0';
    doc.$schema = MCPDESC_RC_SCHEMA_URI;
    doc.tools = [{ name: 'inspect', inputSchema: { type: 'object' }, annotations: { audience: ['user'] } }];
    const result = new McpDescValidator().validateDocument(doc);

    expect(result.selector).toBe('0.9.0-rc.2');
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(expect.objectContaining({
      path: '/tools/0/annotations/audience',
      rule: 'mcp.tool-annotations.members',
    }));
    expect(result.results).toEqual(expect.arrayContaining([
      expect.objectContaining({ rule: 'mcp.tool-annotations.members', status: 'failed' }),
    ]));
  });

  it.each([
    undefined,
    MCPDESC_RC_SCHEMA_URI,
    'https://mcpdesc.org/schema/mcp-description/0.9.0-rc.1.json',
  ])('uses the RC.2 default with schema %s and reports only the typo', ($schema) => {
    const result = new McpDescValidator().validateDocument({
      ...document, ...($schema ? { $schema } : {}),
      transports: [{ type: 'stdio', command: 'chess-rating', arg: ['serve'] }],
    });
    expect(result.selector).toBe('0.9.0-rc.2');
    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toMatchObject({
      path: '/transports/0/arg', rule: 'mcpdesc.transport.members',
      keyword: 'schema-validation',
    });
    expect(result.results).toContainEqual(expect.objectContaining({
      rule: 'mcpdesc.transport.members', status: 'failed',
    }));
  });

  it.each([
    [{ type: 'stdio', command: 42, arg: ['serve'] }, ['/transports/0/arg', '/transports/0/command']],
    [{ type: 'stdio', arg: ['serve'] }, ['/transports/0/command', '/transports/0/arg']],
    [{ type: 'stdi', command: 'chess-rating', arg: ['serve'] }, ['/transports/0/type']],
    [{ command: 'chess-rating', arg: ['serve'] }, ['/transports/0/type']],
  ])('keeps actionable findings for %j', (transport, paths) => {
    const result = new McpDescValidator().validateDocument({ ...document, transports: [transport] });
    expect(result.valid).toBe(false);
    expect(result.errors.map(({ path }) => path)).toEqual(paths);
    expect(result.errors.every(({ rule }) => rule === 'mcpdesc.transport.members')).toBe(true);
  });

  it('accepts args and does not silently select a format for unknown versions', () => {
    const validator = new McpDescValidator();
    expect(validator.validateDocument({
      ...document, transports: [{ type: 'stdio', command: 'chess-rating', args: ['serve'] }],
    }).valid).toBe(true);
    const unknown = validator.validateDocument({ ...document, mcpdesc: '1.0.0' });
    expect(unknown.valid).toBe(false);
    expect(unknown.errors).toContainEqual(expect.objectContaining({ keyword: 'unsupported-format-version' }));
  });

  it('keeps the existing 0.8 transport diagnostics', () => {
    const result = new McpDescValidator().validateDocument({
      ...document, mcpdesc: '0.8.0',
      transports: [{ type: 'stdio', command: 'chess-rating', arg: ['serve'] }],
    });
    expect(result.selector).toBe('0.8.0-rev.20261021');
    expect(result.errors).toHaveLength(10);
  });
});