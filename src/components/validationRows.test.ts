import { describe, expect, it } from 'vitest';
import type { ValidationResult } from '../core/types';
import { validationRows } from './validationRows';

describe('validationRows', () => {
  it('excludes delegated and operation-only results without changing validator output', () => {
    const validation: ValidationResult = {
      valid: false, errors: [], warnings: [],
      results: [
        { rule: 'mcpdesc.serialization.conforming', status: 'delegated' },
        { rule: 'mcp.tool.schema-keywords.preserve', status: 'not-evaluated', reason: 'operation' },
        { rule: 'mcpdesc.document.schema', status: 'not-evaluated', reason: 'earlier-stage-failed' },
        { rule: 'future.rule', status: 'not-evaluated', reason: 'not-implemented' },
      ],
    };
    const original = JSON.stringify(validation);
    expect(validationRows(validation, null).map((row) => row.rule)).toEqual(['mcpdesc.document.schema', 'future.rule']);
    expect(JSON.stringify(validation)).toBe(original);
  });

  it('joins explicit diagnostic scopes and preserves multiple severities under a failed rule', () => {
    const rows = validationRows({
      valid: false,
      errors: [{ rule: 'example.rule', path: '/tools/0', message: 'Invalid', protocolVersions: ['2025-11-25'] }],
      warnings: [{ rule: 'example.rule', path: '/tools/1', message: 'Review', protocolVersions: ['2025-11-25', '2026-07-28'] }],
      results: [
        { rule: 'example.rule', protocolVersion: '2025-11-25', status: 'failed' },
        { rule: 'example.rule', protocolVersion: '2026-07-28', status: 'warning' },
      ],
    }, null);
    expect(rows).toHaveLength(2);
    expect(rows[0].diagnostics.map((issue) => issue.severity)).toEqual(['error', 'warning']);
    expect(rows[1].diagnostics.map((issue) => issue.severity)).toEqual(['warning']);
    expect(rows[0].status).toBe('failed');
  });

  it('uses the nearest authored scope when a diagnostic omits protocolVersions', () => {
    const rows = validationRows({
      valid: false, warnings: [],
      errors: [{ rule: 'example.rule', path: '/tools/0/inputSchema/properties/a~1b~0c', message: 'Invalid' }],
      results: [
        { rule: 'example.rule', protocolVersion: '2025-11-25', status: 'failed' },
        { rule: 'example.rule', protocolVersion: '2026-07-28', status: 'passed' },
      ],
    }, {
      protocolVersions: ['2025-11-25', '2026-07-28'],
      tools: [{ protocolVersions: ['2025-11-25'], inputSchema: { properties: { 'a/b~c': {} } } }],
    });
    expect(rows[0].diagnostics).toHaveLength(1);
    expect(rows[1].diagnostics).toHaveLength(0);
  });

  it('keeps independent rules unscoped and does not lose unmatched findings', () => {
    const rows = validationRows({
      valid: false, warnings: [],
      errors: [
        { rule: 'independent.rule', path: '/info', message: 'Invalid', protocolVersions: ['2025-11-25'] },
        { rule: 'missing.rule', path: '/tools', message: 'Unmatched', protocolVersions: ['2026-07-28'] },
        { path: '/', message: 'Invalid YAML', line: 2, column: 3 },
      ],
      results: [{ rule: 'independent.rule', status: 'failed' }],
    }, null);
    expect(rows).toHaveLength(3);
    expect(rows[0]).toMatchObject({ standalone: false, diagnostics: [{ message: 'Invalid' }] });
    expect(rows[0].protocolVersion).toBeUndefined();
    expect(rows[1]).toMatchObject({ standalone: true, rule: 'missing.rule', protocolVersion: '2026-07-28' });
    expect(rows[2]).toMatchObject({ standalone: true, status: 'failed', diagnostics: [{ line: 2, column: 3 }] });
  });
});
