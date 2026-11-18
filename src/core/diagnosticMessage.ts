// Copyright 2026 Cisco Systems, Inc. and its affiliates
//
// SPDX-License-Identifier: Apache-2.0

import type { McpDescriptionDiagnosticDetail, ValidationIssue } from './types';

const MAX_VALUES = 10;

function quote(value: unknown): string {
  return JSON.stringify(value) ?? String(value);
}

function list(values: readonly unknown[], format: (value: unknown) => string = quote): string {
  const shown = values.slice(0, MAX_VALUES).map(format).join(', ');
  return values.length > MAX_VALUES ? `${shown}, …` : shown;
}

function plural(limit: number | string | undefined, noun: string): string {
  return `${limit} ${noun}${limit === 1 ? '' : 's'}`;
}

function conjunction(values: readonly unknown[]): string {
  const quoted = values.map(quote);
  return quoted.length <= 2 ? quoted.join(' and ') : `${quoted.slice(0, -1).join(', ')}, and ${quoted[quoted.length - 1]}`;
}

function allowedValues(detail: McpDescriptionDiagnosticDetail): string {
  const values = detail.allowedValues;
  if (!values?.length) return '';
  return values.length === 1 ? ` Expected ${quote(values[0])}.` : ` Allowed values: ${list(values)}.`;
}

function allowedMembers(detail: McpDescriptionDiagnosticDetail): string {
  const names = detail.allowedMembers ?? [];
  const patterns = detail.allowedMemberPatterns ?? [];
  if (names.length === 0 && patterns.length === 0) return '';
  const parts = [
    ...(names.length > 0 ? [names.join(', ')] : []),
    ...(patterns.length > 0 ? [`names matching ${patterns.join(' or ')}`] : []),
  ];
  return ` Allowed members: ${parts.join('; ')}.`;
}

function selectorScope(detail: McpDescriptionDiagnosticDetail): string {
  return detail.selector ? ` for ${detail.selector.member} ${quote(detail.selector.value)}` : '';
}

function constraintMessage(keyword: string | undefined, limit: number | string | undefined): string | null {
  const has = limit !== undefined;
  switch (keyword) {
    case 'minLength': return has ? `Must be at least ${plural(limit, 'character')} long` : null;
    case 'maxLength': return has ? `Must be at most ${plural(limit, 'character')} long` : null;
    case 'minItems': return has ? `Must contain at least ${plural(limit, 'item')}` : null;
    case 'maxItems': return has ? `Must contain at most ${plural(limit, 'item')}` : null;
    case 'minProperties': return has ? `Must contain at least ${plural(limit, 'member')}` : null;
    case 'maxProperties': return has ? `Must contain at most ${plural(limit, 'member')}` : null;
    case 'minimum': return has ? `Must be greater than or equal to ${limit}` : null;
    case 'maximum': return has ? `Must be less than or equal to ${limit}` : null;
    case 'exclusiveMinimum': return has ? `Must be greater than ${limit}` : null;
    case 'exclusiveMaximum': return has ? `Must be less than ${limit}` : null;
    case 'multipleOf': return has ? `Must be a multiple of ${limit}` : null;
    case 'pattern': return has ? `Must match the pattern ${limit}` : null;
    case 'format': return has ? `Must be a valid ${limit}` : null;
    case 'uniqueItems': return 'Items must be unique';
    default: return null;
  }
}

/**
 * Reader-facing text for a validation finding, built from its structured
 * `detail` (validation result format 1.4.0). States facts only, never a fix.
 * Unknown kinds, and findings without `detail`, keep the producer message.
 */
export function diagnosticMessage(issue: Pick<ValidationIssue, 'message' | 'detail'>): string {
  const detail = issue.detail;
  if (!detail) return issue.message;
  const scope = selectorScope(detail);

  switch (detail.kind) {
    case 'missing-member':
      if (!detail.member) break;
      return `Missing required member ${quote(detail.member)}${scope}.${allowedValues(detail)}`;
    case 'unexpected-member':
      if (!detail.member) break;
      return `Unexpected member ${quote(detail.member)}${scope}.${allowedMembers(detail)}`;
    case 'invalid-member-name': {
      if (!detail.member) break;
      const rule = constraintMessage(detail.keyword, detail.limit);
      return `Invalid member name ${quote(detail.member)}${scope}.${rule ? ` ${rule}.` : ''}`;
    }
    case 'invalid-value':
      return `Invalid value${scope}.${allowedValues(detail)}`;
    case 'invalid-type':
      if (!detail.expectedTypes?.length) break;
      return `Invalid type${scope}. Expected ${detail.expectedTypes.join(' or ')}.`;
    case 'conflicting-members': {
      const members = detail.members ?? [];
      if (members.length < 2) break;
      if (detail.selector) {
        const forbidden = members.filter((member) => member !== detail.selector?.member);
        if (forbidden.length > 0) {
          const subject = forbidden.length === 1 ? 'Member' : 'Members';
          const verb = forbidden.length === 1 ? 'is' : 'are';
          return `${subject} ${conjunction(forbidden)} ${verb} not allowed when ${detail.selector.member} is ${quote(detail.selector.value)}.`;
        }
      }
      return `Members ${conjunction(members)} cannot be used together.`;
    }
    case 'missing-alternative':
      if (!detail.members?.length) break;
      return `Provide at least one of ${list(detail.members)}.`;
    case 'constraint': {
      const rule = constraintMessage(detail.keyword, detail.limit);
      if (rule) return `${rule}${scope}.`;
      break;
    }
    default:
      break;
  }
  return issue.message;
}
