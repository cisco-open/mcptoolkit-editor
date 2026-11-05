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

describe('0.9.0 RC.1 validation', () => {
  it('pins RC.1 and preserves rule results and version-scoped diagnostics', () => {
    const doc = parse(miroExample);
    doc.mcpdesc = '0.9.0';
    doc.$schema = MCPDESC_RC_SCHEMA_URI;
    doc.tools = [{ name: 'inspect', inputSchema: { type: 'object' }, annotations: { audience: ['user'] } }];
    const result = new McpDescValidator().validateDocument(doc);

    expect(result.selector).toBe('0.9.0-rc.1');
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(expect.objectContaining({
      path: '/tools/0/annotations/audience',
      rule: 'mcp.tool-annotations.members',
    }));
    expect(result.results).toEqual(expect.arrayContaining([
      expect.objectContaining({ rule: 'mcp.tool-annotations.members', status: 'failed' }),
    ]));
  });
});