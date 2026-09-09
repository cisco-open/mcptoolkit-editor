import { describe, expect, it } from 'vitest';
import { migrateMcpDescription07To08, V0_8_SCHEMA_URI } from '@mcpdesc/core';
import { isValidMcpDesc07, McpDescValidator } from './validator';

describe('0.7 migration', () => {
  it('targets and validates against MCP Description 0.8.0', () => {
    const source = {
      mcpdesc: '0.7.0',
      info: { name: 'example', version: '1.0.0' },
      transports: [{ type: 'stdio', command: 'example-server' }],
      tools: [{
        name: 'echo',
        description: 'Echo a message',
        inputSchema: {
          type: 'object',
          properties: { message: { type: 'string' } },
          required: ['message'],
        },
      }],
    };
    expect(isValidMcpDesc07(source)).toBe(true);

    const result = migrateMcpDescription07To08(source, {
      specification: '0.8.0',
      sourceValidated: true,
      defaultProtocolVersion: '2025-11-25',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.report.targetSpecification).toBe('0.8.0');
    expect(result.value.$schema).toBe(V0_8_SCHEMA_URI);
    expect(new McpDescValidator().validateDocument(result.value).errors).toEqual([]);
  });
});