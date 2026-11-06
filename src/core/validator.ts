// Copyright 2026 Cisco Systems, Inc. and its affiliates
//
// SPDX-License-Identifier: Apache-2.0

import {
  validateMcpDescription,
  type McpDescriptionDiagnostic,
} from '@mcpdesc/validator/browser';
import { V0_8_SCHEMA_URI, V0_8_SPECIFICATION, V0_9_RC_2_SCHEMA_URI, V0_9_RC_2_SPECIFICATION } from '@mcpdesc/core';
import validateMcpDesc07 from './validator.generated.js';
import type { ValidationIssue, ValidationResult } from './types';
import mcpdescSchema from './mcpdesc-schema.json';
import rcSchema from './mcpdesc-schema-0.9.0-rc.2.json';

export const MCPDESC_SPECIFICATION = V0_8_SPECIFICATION;
export const MCPDESC_SCHEMA_URI = V0_8_SCHEMA_URI;
export const MCPDESC_RC_SPECIFICATION = V0_9_RC_2_SPECIFICATION;
export const MCPDESC_RC_SCHEMA_URI = V0_9_RC_2_SCHEMA_URI;

export function isValidMcpDesc07(data: unknown): boolean {
  return validateMcpDesc07(data) as boolean;
}

export function getMcpDesc07ValidationErrors(data: unknown) {
  validateMcpDesc07(data);
  return validateMcpDesc07.errors ?? [];
}

function toPointer(path: readonly (string | number)[]): string {
  if (path.length === 0) return '/';
  return `/${path
    .map((segment) => String(segment).replace(/~/g, '~0').replace(/\//g, '~1'))
    .join('/')}`;
}

type SchemaNode = Record<string, unknown>;

function dereference(schema: SchemaNode, root: SchemaNode): SchemaNode {
  const ref = schema.$ref;
  if (typeof ref !== 'string' || !ref.startsWith('#/')) return schema;
  let value: unknown = root;
  for (const segment of ref.slice(2).split('/')) {
    if (typeof value !== 'object' || value === null) return schema;
    value = (value as Record<string, unknown>)[segment.replace(/~1/g, '/').replace(/~0/g, '~')];
  }
  return typeof value === 'object' && value !== null ? value as SchemaNode : schema;
}

function enumValuesAtPath(path: readonly (string | number)[], root: SchemaNode): unknown[] | undefined {
  let schema: SchemaNode = root;
  for (const segment of path) {
    schema = dereference(schema, root);
    const next = typeof segment === 'number' || /^\d+$/.test(String(segment))
      ? schema.items
      : (schema.properties as Record<string, unknown> | undefined)?.[segment];
    if (typeof next !== 'object' || next === null) return undefined;
    schema = next as SchemaNode;
  }
  const values = dereference(schema, root).enum;
  return Array.isArray(values) ? values : undefined;
}

function formatAllowedValues(values: unknown[]): string {
  const displayed = values.slice(0, 10).map((value) => JSON.stringify(value)).join(', ');
  return ` Allowed values: ${displayed}${values.length > 10 ? ', ...' : ''}.`;
}

function toIssue(diagnostic: McpDescriptionDiagnostic, schema: SchemaNode): ValidationIssue {
  const values = enumValuesAtPath(diagnostic.path, schema);
  return {
    path: toPointer(diagnostic.path),
    message: `${diagnostic.message ?? diagnostic.rule ?? diagnostic.code ?? 'Validation finding'}${values ? formatAllowedValues(values) : ''}`,
    keyword: diagnostic.code,
    rule: diagnostic.rule,
    protocolVersions: diagnostic.protocolVersions,
  };
}

/** Browser-safe adapter using the validator's maintained format defaults. */
export class McpDescValidator {
  loadSchema(_schema?: Record<string, unknown>): void {
    void _schema;
  }

  validateDocument(data: unknown): ValidationResult {
    const result = validateMcpDescription(data);
    const errors: ValidationIssue[] = [];
    const warnings: ValidationIssue[] = [];

    for (const diagnostic of result.diagnostics) {
      (diagnostic.severity === 'error' ? errors : warnings).push(toIssue(
        diagnostic, result.selector === MCPDESC_RC_SPECIFICATION ? rcSchema : mcpdescSchema,
      ));
    }

    return { valid: result.valid, errors, warnings, selector: result.selector, results: result.results };
  }
}
