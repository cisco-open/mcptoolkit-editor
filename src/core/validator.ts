// Copyright 2026 Cisco Systems, Inc. and its affiliates
//
// SPDX-License-Identifier: Apache-2.0

import {
  validateMcpDescription,
  type McpDescriptionDiagnostic,
} from '@mcpdesc/validator/browser';
import { RC_2_SCHEMA_URI, RC_2_SPECIFICATION } from '@mcpdesc/core';
import validateMcpDesc07 from './validator.generated.js';
import type { ValidationIssue, ValidationResult } from './types';
import mcpdescSchema from './mcpdesc-schema.json';

export const MCPDESC_SPECIFICATION = RC_2_SPECIFICATION;
export const MCPDESC_SCHEMA_URI = RC_2_SCHEMA_URI;

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

function dereference(schema: SchemaNode): SchemaNode {
  const ref = schema.$ref;
  if (typeof ref !== 'string' || !ref.startsWith('#/')) return schema;
  let value: unknown = mcpdescSchema;
  for (const segment of ref.slice(2).split('/')) {
    if (typeof value !== 'object' || value === null) return schema;
    value = (value as Record<string, unknown>)[segment.replace(/~1/g, '/').replace(/~0/g, '~')];
  }
  return typeof value === 'object' && value !== null ? value as SchemaNode : schema;
}

function enumValuesAtPath(path: readonly (string | number)[]): unknown[] | undefined {
  let schema: SchemaNode = mcpdescSchema as SchemaNode;
  for (const segment of path) {
    schema = dereference(schema);
    const next = typeof segment === 'number' || /^\d+$/.test(String(segment))
      ? schema.items
      : (schema.properties as Record<string, unknown> | undefined)?.[segment];
    if (typeof next !== 'object' || next === null) return undefined;
    schema = next as SchemaNode;
  }
  const values = dereference(schema).enum;
  return Array.isArray(values) ? values : undefined;
}

function formatAllowedValues(values: unknown[]): string {
  const displayed = values.slice(0, 10).map((value) => JSON.stringify(value)).join(', ');
  return ` Allowed values: ${displayed}${values.length > 10 ? ', ...' : ''}.`;
}

function toIssue(diagnostic: McpDescriptionDiagnostic): ValidationIssue {
  const values = enumValuesAtPath(diagnostic.path);
  return {
    path: toPointer(diagnostic.path),
    message: `${diagnostic.message}${values ? formatAllowedValues(values) : ''}`,
    keyword: diagnostic.code,
  };
}

/** Browser-safe adapter for the immutable MCP Description 0.8.0 RC.2 snapshot. */
export class McpDescValidator {
  loadSchema(_schema?: Record<string, unknown>): void {
    void _schema;
    // The immutable RC.2 snapshot is supplied by @mcpdesc/validator.
  }

  validateDocument(data: unknown): ValidationResult {
    const result = validateMcpDescription(data, {
      specification: MCPDESC_SPECIFICATION,
    });
    const errors: ValidationIssue[] = [];
    const warnings: ValidationIssue[] = [];

    for (const diagnostic of result.diagnostics) {
      (diagnostic.severity === 'error' ? errors : warnings).push(toIssue(diagnostic));
    }

    return { valid: result.valid, errors, warnings };
  }
}
