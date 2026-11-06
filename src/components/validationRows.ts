// Copyright 2026 Cisco Systems, Inc. and its affiliates
//
// SPDX-License-Identifier: Apache-2.0

import type { McpDescriptionRuleResult } from '@mcpdesc/validator/browser';
import type { ValidationIssue, ValidationResult } from '../core/types';
import type { EditorIssue } from './editorDiagnostics';

export interface ValidationRow {
  id: string;
  rule?: string;
  protocolVersion?: string;
  status: McpDescriptionRuleResult['status'];
  reason?: McpDescriptionRuleResult['reason'];
  diagnostics: EditorIssue[];
  standalone: boolean;
}

function diagnosticScope(issue: ValidationIssue, document: unknown): readonly string[] | undefined {
  if (issue.protocolVersions) return issue.protocolVersions;
  let scope: string[] | undefined;
  let node: unknown = document;
  const segments = issue.path === '/' ? [] : issue.path.slice(1).split('/').map((part) => part.replace(/~1/g, '/').replace(/~0/g, '~'));
  for (const segment of [...segments, undefined]) {
    if (typeof node !== 'object' || node === null) break;
    if ('protocolVersions' in node && Array.isArray(node.protocolVersions)) {
      scope = node.protocolVersions.filter((version): version is string => typeof version === 'string');
    }
    if (segment !== undefined) node = Object.getOwnPropertyDescriptor(node, segment)?.value;
  }
  return scope;
}

export function validationRows(validation: ValidationResult, document: unknown): ValidationRow[] {
  const rows: ValidationRow[] = (validation.results ?? [])
    .filter((result) => result.status !== 'delegated' && result.reason !== 'operation')
    .map((result) => ({
      ...result, id: `rule:${result.rule}:${result.protocolVersion ?? ''}`, diagnostics: [], standalone: false,
    }));
  const diagnostics: EditorIssue[] = [
    ...validation.errors.map((issue) => ({ ...issue, severity: 'error' as const })),
    ...validation.warnings.map((issue) => ({ ...issue, severity: 'warning' as const })),
  ];
  diagnostics.forEach((issue, index) => {
    const scope = diagnosticScope(issue, document);
    const matches = rows.filter((row) => !row.standalone && issue.rule === row.rule
      && (!row.protocolVersion || !scope || scope.includes(row.protocolVersion)));
    for (const row of matches) row.diagnostics.push(issue);
    if (matches.length) return;
    for (const protocolVersion of scope?.length ? scope : [undefined]) {
      rows.push({
        id: `diagnostic:${index}:${protocolVersion ?? ''}`,
        rule: issue.rule,
        protocolVersion,
        status: issue.severity === 'error' ? 'failed' : 'warning',
        diagnostics: [issue],
        standalone: true,
      });
    }
  });
  return rows;
}
