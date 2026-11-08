import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { McpDescValidator } from '../core/validator';
import { sourcePathToLine } from './preview/navigation';
import { groupEditorIssues, type EditorIssue } from './editorDiagnostics';

describe('editor diagnostics', () => {
  it('keeps errors and warnings on the same line in separate groups', () => {
    const issues: EditorIssue[] = [
      { severity: 'error', path: '/tools/0', message: 'Invalid tool' },
      { severity: 'warning', path: '/tools/0', message: 'Deprecated field' },
    ];

    const result = groupEditorIssues(issues, () => 4);

    expect(result.byLine.get(4)).toEqual({
      errors: ['✕ /tools/0: Invalid tool'],
      warnings: ['⚠ /tools/0: Deprecated field'],
    });
  });

  it('reports issues that cannot be mapped to a source line', () => {
    const issues: EditorIssue[] = [
      { severity: 'warning', path: '/security', message: 'Unused scheme' },
    ];

    const result = groupEditorIssues(issues, () => 0);

    expect(result.byLine.size).toBe(0);
    expect(result.unmapped).toEqual(['⚠ /security: Unused scheme']);
  });

  it('includes interoperable rule identity and protocol context', () => {
    const result = groupEditorIssues([{
      severity: 'warning', path: '/tools/0', message: 'Native projection mismatch',
      rule: 'mcp.tool.input-schema', protocolVersions: ['2025-11-25'],
    }], () => 4);
    expect(result.byLine.get(4)?.warnings[0]).toContain('[mcp.tool.input-schema | 2025-11-25]');
  });

  it('maps a misspelled top-level key to its own line', () => {
    const source = `$schema: https://mcpdesc.org/schema/mcp-description/0.9.0-rc.3.json
mcpdesc: 0.9.0
info:
  name: chess-rating-server
  title: Chess Rating MCP Server
  version: 1.0.0
protocolVersions:
  - 2025-11-25
transport:
  - args:
      - serve
    command: chess-rating
    type: stdio
`;
    const validation = new McpDescValidator().validateDocument(parse(source));
    const transportIssues = validation.errors.filter(issue => issue.path === '/transport');
    expect(transportIssues.length).toBeGreaterThan(0);
    const result = groupEditorIssues(
      transportIssues.map(issue => ({ ...issue, severity: 'error' })),
      issue => sourcePathToLine(source, issue.path),
    );
    expect([...result.byLine.keys()]).toEqual([9]);
    expect(result.byLine.get(9)?.errors[0]).toContain('/transport: Unexpected member "transport".');
    expect(result.unmapped).toEqual([]);
  });

  it('anchors the focused transport typo on the misspelled field with a readable message', () => {
    const source = `mcpdesc: 0.9.0
info:
  name: chess-rating-server
  version: 1.0.0
protocolVersions: [2025-11-25]
transports:
  - type: stdio
    command: chess-rating
    arg:
      - serve
`;
    const validation = new McpDescValidator().validateDocument(parse(source));
    expect(validation.errors).toHaveLength(1);
    const issue = { ...validation.errors[0], severity: 'error' as const };
    const grouped = groupEditorIssues([issue], item => sourcePathToLine(source, item.path));
    expect([...grouped.byLine.keys()]).toEqual([9]);
    expect(grouped.byLine.get(9)?.errors[0]).toContain('/transports/0/arg: Unexpected member "arg" for type "stdio".');
    expect(grouped.byLine.get(9)?.errors[0]).toContain('[mcpdesc.transport.members]');
    expect(grouped.unmapped).toEqual([]);
  });

  it('keeps a missing discriminator on the transport it belongs to', () => {
    const source = `mcpdesc: 0.9.0
info:
  name: chess-coach
  version: 2.1.0
protocolVersions:
  - 2025-11-25
transports:
  - typ: streamable-http
    url: https://chess-coach.example.com/mcp
security:
  - bearer: []
`;
    const validation = new McpDescValidator().validateDocument(parse(source));
    const transportIssues = validation.errors.filter(issue => issue.path.startsWith('/transports'));
    const grouped = groupEditorIssues(
      transportIssues.map(issue => ({ ...issue, severity: 'error' as const })),
      item => sourcePathToLine(source, item.path, { nearestAncestor: true }),
    );
    expect([...grouped.byLine.keys()]).toEqual([8]);
    expect(grouped.byLine.get(8)?.errors).toEqual([
      expect.stringContaining('/transports/0: Missing required member "type". Allowed values: "streamable-http", "stdio", "sse".'),
      expect.stringContaining('/transports/0/typ: Unexpected member "typ".'),
    ]);
  });
});
