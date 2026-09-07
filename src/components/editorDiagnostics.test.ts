import { describe, expect, it } from 'vitest';
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
});