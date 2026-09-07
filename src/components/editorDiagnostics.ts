import type { ValidationIssue } from '../core';

export type EditorIssue = ValidationIssue & { severity: 'error' | 'warning' };

export interface LineIssues {
  errors: string[];
  warnings: string[];
}

export function groupEditorIssues(
  issues: EditorIssue[],
  resolveLine: (issue: EditorIssue) => number,
): { byLine: Map<number, LineIssues>; unmapped: string[] } {
  const byLine = new Map<number, LineIssues>();
  const unmapped: string[] = [];

  for (const issue of issues) {
    const line = resolveLine(issue);
    const label = `${issue.severity === 'error' ? '✕' : '⚠'} ${issue.path}: ${issue.message}`;
    if (line === 0) {
      unmapped.push(label);
      continue;
    }

    const lineIssues = byLine.get(line) ?? { errors: [], warnings: [] };
    lineIssues[issue.severity === 'error' ? 'errors' : 'warnings'].push(label);
    byLine.set(line, lineIssues);
  }

  return { byLine, unmapped };
}