import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import miroExample from '../../examples/vendors/miro.mcpdesc.yaml?raw';
import { MCPDESC_SCHEMA_URI, MCPDESC_SPECIFICATION, McpDescValidator } from './validator';

describe('RC.3 validation', () => {
  it('preserves pre-standard server extensions as a warning', () => {
    const result = new McpDescValidator().validateDocument(parse(miroExample));

    expect(MCPDESC_SPECIFICATION).toBe('0.8.0-rc.3');
    expect(MCPDESC_SCHEMA_URI).toBe(
      'https://mcpdesc.org/schema/mcp-description/0.8.0-rc.3.json',
    );
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.warnings).toContainEqual(expect.objectContaining({
      keyword: 'extensions-not-supported-by-version',
      path: '/capabilities/0/extensions',
    }));
  });
});