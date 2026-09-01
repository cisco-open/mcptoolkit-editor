// Copyright 2026 Cisco Systems, Inc. and its affiliates
//
// SPDX-License-Identifier: Apache-2.0

import {
  validateMcpDescription,
  type McpDescriptionDiagnostic,
} from '@mcpdesc/validator/standalone';
import validateMcpDesc07 from './validator.generated.js';
import type { ValidationIssue, ValidationResult } from './types';

export const MCPDESC_SPECIFICATION = '0.8.0-rc.1' as const;
export const MCPDESC_SCHEMA_URI =
  'https://mcpdesc.org/schema/mcp-description/0.8.0-rc.1.json' as const;

export function isValidMcpDesc07(data: unknown): boolean {
  return validateMcpDesc07(data) as boolean;
}

function toPointer(path: readonly (string | number)[]): string {
  if (path.length === 0) return '/';
  return `/${path
    .map((segment) => String(segment).replace(/~/g, '~0').replace(/\//g, '~1'))
    .join('/')}`;
}

function toIssue(diagnostic: McpDescriptionDiagnostic): ValidationIssue {
  return {
    path: toPointer(diagnostic.path),
    message: diagnostic.message,
    keyword: diagnostic.code,
  };
}

/** Browser-safe adapter for the immutable MCP Description 0.8.0 RC.1 snapshot. */
export class McpDescValidator {
  loadSchema(_schema?: Record<string, unknown>): void {
    void _schema;
    // The immutable RC.1 snapshot is supplied by @mcpdesc/validator.
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
