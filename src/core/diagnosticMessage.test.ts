import { describe, expect, it } from 'vitest';
import { diagnosticMessage } from './diagnosticMessage';
import type { ValidationIssue } from './types';

const raw = 'does not validate against 0.9.0: /transports/0 must NOT have additional properties';
const message = (detail: ValidationIssue['detail']) => diagnosticMessage({ message: raw, detail });

describe('diagnosticMessage', () => {
  it('keeps the producer message without structured detail', () => {
    expect(diagnosticMessage({ message: raw })).toBe(raw);
    expect(message({ kind: 'future-kind' } as unknown as ValidationIssue['detail'])).toBe(raw);
  });

  it('names an unexpected member, its selected branch, and the allowed members', () => {
    expect(message({
      kind: 'unexpected-member', member: 'arg',
      allowedMembers: ['args', 'command', 'env'], allowedMemberPatterns: ['^x-'],
      selector: { member: 'type', value: 'stdio' },
    })).toBe('Unexpected member "arg" for type "stdio". Allowed members: args, command, env; names matching ^x-.');
  });

  it('names a missing member and its allowed values', () => {
    expect(message({ kind: 'missing-member', member: 'type', allowedValues: ['streamable-http', 'stdio', 'sse'] }))
      .toBe('Missing required member "type". Allowed values: "streamable-http", "stdio", "sse".');
    expect(message({ kind: 'missing-member', member: 'url', selector: { member: 'type', value: 'sse' } }))
      .toBe('Missing required member "url" for type "sse".');
  });

  it('describes values, types, and alternatives', () => {
    expect(message({ kind: 'invalid-value', allowedValues: ['0.9.0'] })).toBe('Invalid value. Expected "0.9.0".');
    expect(message({ kind: 'invalid-type', expectedTypes: ['object', 'array'] })).toBe('Invalid type. Expected object or array.');
    expect(message({ kind: 'missing-alternative', members: ['implicit', 'password'] }))
      .toBe('Provide at least one of "implicit", "password".');
  });

  it('separates selected-branch conflicts from mutually exclusive members', () => {
    expect(message({ kind: 'conflicting-members', members: ['mode', 'url'], selector: { member: 'mode', value: 'form' } }))
      .toBe('Member "url" is not allowed when mode is "form".');
    expect(message({ kind: 'conflicting-members', members: ['blob', 'text'] }))
      .toBe('Members "blob" and "text" cannot be used together.');
  });

  it('describes known constraints and falls back for unknown keywords', () => {
    expect(message({ kind: 'constraint', keyword: 'minLength', limit: 1 })).toBe('Must be at least 1 character long.');
    expect(message({ kind: 'constraint', keyword: 'maxItems', limit: 1 })).toBe('Must contain at most 1 item.');
    expect(message({ kind: 'constraint', keyword: 'uniqueItems' })).toBe('Items must be unique.');
    expect(message({ kind: 'constraint', keyword: 'contains', limit: 1 })).toBe(raw);
  });

  it('truncates long value lists', () => {
    const allowedValues = Array.from({ length: 12 }, (_, index) => `v${index}`);
    expect(message({ kind: 'invalid-value', allowedValues })).toMatch(/"v9", …\.$/);
  });
});
