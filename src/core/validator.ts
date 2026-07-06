// Copyright 2026 Cisco Systems, Inc. and its affiliates
//
// SPDX-License-Identifier: Apache-2.0

/**
 * Browser-compatible MCP Description validator.
 *
 * Adapted from mcptoolkit-contract's Validator class — stripped of Node.js fs/path
 * dependencies. Accepts the JSON Schema object directly at construction time.
 */

import Ajv from 'ajv';
import type { ValidateFunction, ErrorObject } from 'ajv';
import addFormats from 'ajv-formats';
import type { ValidationResult, ValidationIssue } from './types';

export class McpDescValidator {
  private ajv: Ajv;
  private validate: ValidateFunction | null = null;

  constructor() {
    this.ajv = new Ajv({
      allErrors: true,
      verbose: true,
      strict: false,
      validateFormats: false,
    });
    addFormats(this.ajv);
  }

  /** Compile a JSON schema. Call once at startup or when schema changes. */
  loadSchema(schema: Record<string, unknown>): void {
    this.validate = this.ajv.compile(schema);
  }

  /** Validate a parsed MCP Description document. */
  validateDocument(data: unknown): ValidationResult {
    if (!this.validate) {
      return {
        valid: false,
        errors: [{ path: '/', message: 'No schema loaded — call loadSchema() first' }],
        warnings: [],
      };
    }

    const valid = this.validate(data) as boolean;

    const errors: ValidationIssue[] = [];
    if (!valid && this.validate.errors) {
      for (const err of this.validate.errors) {
        errors.push(formatAjvError(err));
      }
    }

    // Detect likely misspellings: pair "missing required" with "additional property" at the same path
    addMisspellHints(errors);

    const warnings = semanticWarnings(data);

    return { valid, errors, warnings };
  }
}

// ---------------------------------------------------------------------------
// Helpers (private to module)
// ---------------------------------------------------------------------------

function formatAjvError(error: ErrorObject): ValidationIssue {
  const path = error.instancePath || '/';
  let message: string;

  switch (error.keyword) {
    case 'required':
      message = `Missing required property: ${error.params.missingProperty}`;
      break;
    case 'type':
      message = `Invalid type: expected ${error.params.type}`;
      break;
    case 'enum':
      message = `Invalid value: must be one of ${JSON.stringify(error.params.allowedValues)}`;
      break;
    case 'pattern':
      message = `Does not match pattern: ${error.params.pattern}`;
      break;
    case 'format':
      message = `Invalid format: expected ${error.params.format}`;
      break;
    case 'additionalProperties':
      message = `Additional property not allowed: ${error.params.additionalProperty}`;
      break;
    case 'minLength':
      message = `Too short: minimum length is ${error.params.limit}`;
      break;
    case 'maxLength':
      message = `Too long: maximum length is ${error.params.limit}`;
      break;
    case 'minimum':
      message = `Value too small: minimum is ${error.params.limit}`;
      break;
    case 'maximum':
      message = `Value too large: maximum is ${error.params.limit}`;
      break;
    case 'minItems':
      message = `Array too short: minimum ${error.params.limit} items`;
      break;
    case 'anyOf':
      message = 'Must match at least one of the allowed schemas';
      break;
    case 'oneOf':
      message = 'Must match exactly one of the allowed schemas';
      break;
    default:
      message = error.message || 'Validation error';
  }

  return { path, message, keyword: error.keyword, params: error.params };
}

/** Levenshtein distance between two strings. */
function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0) as number[]);
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

/**
 * When a "required" error and an "additionalProperties" error appear at the
 * same path, compare the names. If they're close (Levenshtein ≤ 3 and < 40%
 * of the longer name), append a misspell hint to the additionalProperties error.
 */
function addMisspellHints(errors: ValidationIssue[]): void {
  const missingByPath = new Map<string, string[]>();
  const additionalByPath = new Map<string, ValidationIssue[]>();

  for (const err of errors) {
    if (err.keyword === 'required' && err.params?.missingProperty) {
      const list = missingByPath.get(err.path) ?? [];
      list.push(String(err.params.missingProperty));
      missingByPath.set(err.path, list);
    }
    if (err.keyword === 'additionalProperties' && err.params?.additionalProperty) {
      const list = additionalByPath.get(err.path) ?? [];
      list.push(err);
      additionalByPath.set(err.path, list);
    }
  }

  for (const [path, additionalIssues] of additionalByPath) {
    const missing = missingByPath.get(path);
    if (!missing) continue;
    for (const issue of additionalIssues) {
      const extra = String(issue.params!.additionalProperty);
      for (const req of missing) {
        const dist = levenshtein(extra.toLowerCase(), req.toLowerCase());
        const maxLen = Math.max(extra.length, req.length);
        if (dist <= 3 && dist / maxLen < 0.4) {
          issue.message += ` — did you misspell "${req}" as "${extra}"?`;
          break;
        }
      }
    }
  }
}

/** Semantic warnings that go beyond what JSON Schema can express. */
function semanticWarnings(data: unknown): ValidationIssue[] {
  if (typeof data !== 'object' || data === null) return [];
  const doc = data as Record<string, unknown>;
  const warnings: ValidationIssue[] = [];

  // Version check
  const info = doc.info as Record<string, unknown> | undefined;
  if (info?.version && typeof info.version === 'string') {
    if (!/^\d+\.\d+\.\d+/.test(info.version)) {
      warnings.push({
        path: '/info/version',
        message: 'Version should follow semantic versioning (e.g., 1.0.0)',
      });
    }
  }

  // At least one capability array should be non-empty
  const tools = doc.tools as unknown[] | undefined;
  const resources = doc.resources as unknown[] | undefined;
  const resourceTemplates = doc.resourceTemplates as unknown[] | undefined;
  const prompts = doc.prompts as unknown[] | undefined;

  const hasTools = Array.isArray(tools) && tools.length > 0;
  const hasResources = Array.isArray(resources) && resources.length > 0;
  const hasTemplates = Array.isArray(resourceTemplates) && resourceTemplates.length > 0;
  const hasPrompts = Array.isArray(prompts) && prompts.length > 0;

  if (!hasTools && !hasResources && !hasTemplates && !hasPrompts) {
    warnings.push({
      path: '/',
      message: 'Document has no tools, resources, resourceTemplates, or prompts — at least one is expected',
    });
  }

  // Duplicate name detection within sections
  const sections: { key: string; items: unknown[] | undefined; field: string }[] = [
    { key: 'tools', items: tools, field: 'name' },
    { key: 'resources', items: resources, field: 'uri' },
    { key: 'resourceTemplates', items: resourceTemplates as unknown[] | undefined, field: 'uriTemplate' },
    { key: 'prompts', items: prompts, field: 'name' },
  ];
  for (const { key, items, field } of sections) {
    if (!Array.isArray(items)) continue;
    const seen = new Map<string, number>();
    for (let i = 0; i < items.length; i++) {
      const item = items[i] as Record<string, unknown>;
      const val = item?.[field];
      if (typeof val !== 'string') continue;
      if (seen.has(val)) {
        warnings.push({
          path: `/${key}/${i}/${field}`,
          message: `Duplicate ${field} "${val}" in ${key} — first at index ${seen.get(val)}`,
        });
      } else {
        seen.set(val, i);
      }
    }
  }

  // Unassigned tag detection
  const tags = doc.tags as unknown[] | undefined;
  if (Array.isArray(tags) && tags.length > 0) {
    // Collect all tag names used by capabilities
    const usedTags = new Set<string>();
    const capSections = [tools, resources, resourceTemplates, prompts];
    for (const section of capSections) {
      if (!Array.isArray(section)) continue;
      for (const item of section) {
        const t = (item as Record<string, unknown>).tags;
        if (Array.isArray(t)) {
          for (const tag of t) {
            if (typeof tag === 'string') usedTags.add(tag);
          }
        }
      }
    }

    // Check each declared tag is used by at least one capability
    for (let i = 0; i < tags.length; i++) {
      const tag = tags[i] as Record<string, unknown>;
      const name = tag?.name;
      if (typeof name !== 'string') continue;
      if (!usedTags.has(name)) {
        warnings.push({
          path: `/tags/${i}/name`,
          message: `Tag "${name}" is not assigned to any tool, resource, resourceTemplate, or prompt`,
        });
      }
    }
  }

  return warnings;
}
