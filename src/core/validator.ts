// Copyright 2026 Cisco Systems, Inc. and its affiliates
//
// SPDX-License-Identifier: Apache-2.0

import {
  validateMcpDescription,
  type McpDescriptionDiagnostic,
} from '@mcpdesc/validator/browser';
import { V0_9_SCHEMA_URI, V0_9_SPECIFICATION } from '@mcpdesc/core';
import type { ValidationIssue, ValidationResult } from './types';

/** The only MCP Description format version this editor validates and edits. */
export const MCPDESC_FORMAT_VERSION = '0.9.0';
/** Stable selector the validator applies to `mcpdesc: 0.9.0`. */
export const MCPDESC_SPECIFICATION = V0_9_SPECIFICATION;
export const MCPDESC_SCHEMA_URI = V0_9_SCHEMA_URI;
/** Last published editor release that edits and validates MCP Description 0.8. */
export const LAST_0_8_EDITOR_RELEASE = {
  version: '2.2.2',
  url: 'https://github.com/cisco-open/mcptoolkit-editor/releases/tag/v2.2.2',
} as const;

export function toPointer(path: readonly (string | number)[]): string {
  if (path.length === 0) return '/';
  return `/${path
    .map((segment) => String(segment).replace(/~/g, '~0').replace(/\//g, '~1'))
    .join('/')}`;
}

function toIssue(diagnostic: McpDescriptionDiagnostic): ValidationIssue {
  return {
    path: toPointer(diagnostic.path),
    message: diagnostic.message ?? diagnostic.rule ?? diagnostic.code ?? 'Validation finding',
    keyword: diagnostic.code,
    rule: diagnostic.rule,
    protocolVersions: diagnostic.protocolVersions,
    detail: diagnostic.detail,
    relatedLocations: diagnostic.relatedLocations?.map(({ path, relation }) => ({
      path: toPointer(path),
      relation,
    })),
  };
}

/** Message for an `mcpdesc` value this editor does not validate, or null for 0.9.0. */
export function unsupportedFormatMessage(version: unknown): string | null {
  if (version === MCPDESC_FORMAT_VERSION) return null;
  if (version === '0.8.0') {
    return 'MCP Description 0.8.0 is no longer supported. Migrate the document to 0.9.0.';
  }
  if (typeof version === 'string' && /^0\.[0-7](?:\.|$)/.test(version)) {
    return `MCP Description ${version} is no longer supported. Use mcptoolkit-editor ${LAST_0_8_EDITOR_RELEASE.version} (${LAST_0_8_EDITOR_RELEASE.url}) to migrate it to 0.8.0, then migrate it to 0.9.0 in this editor.`;
  }
  return `Unsupported mcpdesc value ${JSON.stringify(version)}. This editor supports MCP Description ${MCPDESC_FORMAT_VERSION}.`;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Findings that block migrating a 0.8.0 document, reported against the
 * validator's maintained 0.8 snapshot so authors can repair the source first.
 */
export function legacySourceFindings(data: unknown): ValidationIssue[] {
  return validateMcpDescription(data).diagnostics
    .filter(({ severity }) => severity === 'error')
    .map(toIssue);
}

/** Browser-safe adapter that validates MCP Description 0.9.0 documents only. */
export class McpDescValidator {
  validateDocument(data: unknown): ValidationResult {
    // The validator also accepts 0.8 documents; never let it select a retired format.
    if (isObject(data) && 'mcpdesc' in data) {
      const message = unsupportedFormatMessage(data.mcpdesc);
      if (message) {
        return {
          valid: false,
          errors: [{ path: '/mcpdesc', message, keyword: 'unsupported-format-version' }],
          warnings: [],
          selector: null,
        };
      }
    }

    const result = validateMcpDescription(data, isObject(data)
      ? { schemaPolicyIfPresent: true, fallbackIfSelectorIsUnknown: true }
      : {});
    if (result.selector && result.selector.split('-')[0] !== MCPDESC_FORMAT_VERSION) {
      const version = result.selector.replace(/-.*$/, '');
      return {
        valid: false,
        errors: [{
          path: '/',
          message: unsupportedFormatMessage(version) ?? `Unsupported selector ${result.selector}. This editor supports MCP Description ${MCPDESC_FORMAT_VERSION}.`,
          keyword: 'unsupported-format-version',
        }],
        warnings: [],
        selector: null,
      };
    }
    const errors: ValidationIssue[] = [];
    const warnings: ValidationIssue[] = [];
    for (const diagnostic of result.diagnostics) {
      (diagnostic.severity === 'error' ? errors : warnings).push(toIssue(diagnostic));
    }
    return { valid: result.valid, errors, warnings, selector: result.selector, results: result.results };
  }
}
