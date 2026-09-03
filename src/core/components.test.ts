// Copyright 2026 Cisco Systems, Inc. and its affiliates
//
// SPDX-License-Identifier: Apache-2.0

/**
 * Local `$componentRef` resolution: which layer rejects which failure, and what
 * the resolver substitutes when the document is conformant.
 */

import { describe, expect, it } from 'vitest';
import { parseMcpDescriptionSource } from '@mcpdesc/core/documents';
import { resolveMcpDescriptionComponentReferences } from '@mcpdesc/core/components';
import { validateMcpDescription } from '@mcpdesc/validator/browser';
import { projectEffectiveProtocolView } from '@mcpdesc/core';
import type { McpDescDocument } from './types';

import allRegistries from './__fixtures__/components/valid/all-registries.yaml?raw';
import chainedSchema from './__fixtures__/components/valid/chained-schema.yaml?raw';
import equivalentInline from './__fixtures__/components/valid/equivalent-inline.yaml?raw';
import equivalentReferenced from './__fixtures__/components/valid/equivalent-referenced.yaml?raw';
import noComponents from './__fixtures__/components/valid/no-components.yaml?raw';
import protocolScopedRef from './__fixtures__/components/valid/protocol-scoped-ref.yaml?raw';
import sharedTarget from './__fixtures__/components/valid/shared-target.yaml?raw';
import directCycle from './__fixtures__/components/invalid/direct-cycle.yaml?raw';
import emptyComponents from './__fixtures__/components/invalid/empty-components.yaml?raw';
import indirectCycle from './__fixtures__/components/invalid/indirect-cycle.yaml?raw';
import invalidResolvedValue from './__fixtures__/components/invalid/invalid-resolved-value.yaml?raw';
import malformedPointer from './__fixtures__/components/invalid/malformed-pointer.yaml?raw';
import missingTarget from './__fixtures__/components/invalid/missing-target.yaml?raw';
import refInInteractionExample from './__fixtures__/components/invalid/ref-in-interaction-example.yaml?raw';
import siblingOverride from './__fixtures__/components/invalid/sibling-override.yaml?raw';
import unknownNamespace from './__fixtures__/components/invalid/unknown-namespace.yaml?raw';
import wrongNamespace from './__fixtures__/components/invalid/wrong-namespace.yaml?raw';

const SPECIFICATION = '0.8.0-rc.1' as const;

function parse(source: string) {
  const parsed = parseMcpDescriptionSource(source);
  if (!parsed.ok) throw new Error(`fixture does not parse: ${parsed.diagnostics[0]?.message}`);
  return parsed.value as McpDescDocument;
}

function resolve(source: string) {
  return resolveMcpDescriptionComponentReferences(parse(source), { specification: SPECIFICATION });
}

function asDoc(value: unknown) {
  return value as McpDescDocument;
}

/** Set of `code@path` pairs, which is how a diagnostic is identified in these tests. */
function anchors(diagnostics: readonly { code: string; path?: readonly (number | string)[] }[]) {
  return new Set(diagnostics.map((d) => `${d.code}@${(d.path ?? []).join('/')}`));
}

describe('valid documents', () => {
  it.each([
    ['all registries', allRegistries],
    ['chained schema', chainedSchema],
    ['shared target', sharedTarget],
    ['inline equivalent', equivalentInline],
    ['referenced equivalent', equivalentReferenced],
    ['protocol scoped', protocolScopedRef],
    ['no components', noComponents],
  ])('%s validates and resolves', (_label, source) => {
    expect(validateMcpDescription(parse(source), { specification: SPECIFICATION }).valid).toBe(true);
    expect(resolve(source).ok).toBe(true);
  });

  it('substitutes every registry and reports provenance for each reference', () => {
    const result = resolve(allRegistries);
    if (!result.ok) throw new Error('expected resolution to succeed');

    expect(result.provenance).toEqual([
      { referencePath: ['tools', 0, 'inputSchema'], targetPath: ['components', 'schemas', 'SearchInput'] },
      { referencePath: ['tools', 0, 'examples', 'basic'], targetPath: ['components', 'toolExamples', 'basic-search'] },
      { referencePath: ['resources', 0, 'examples', 'default'], targetPath: ['components', 'resourceExamples', 'readme'] },
      { referencePath: ['resourceTemplates', 0, 'examples', 'default'], targetPath: ['components', 'resourceTemplateExamples', 'user-file'] },
      { referencePath: ['prompts', 0, 'examples', 'default'], targetPath: ['components', 'promptExamples', 'default-greeting'] },
    ]);
  });

  it('leaves the source document untouched and keeps the component registries', () => {
    const source = parse(allRegistries);
    const before = structuredClone(source);
    const result = resolveMcpDescriptionComponentReferences(source, { specification: SPECIFICATION });
    if (!result.ok) throw new Error('expected resolution to succeed');

    expect(source).toEqual(before);
    expect(result.value.components).toEqual(before.components);
  });

  it('is deterministic across repeated runs', () => {
    expect(JSON.stringify(resolve(allRegistries))).toBe(JSON.stringify(resolve(allRegistries)));
  });

  it('follows a chain to its terminal target', () => {
    const result = resolve(chainedSchema);
    if (!result.ok) throw new Error('expected resolution to succeed');

    expect(asDoc(result.value).tools?.[0]?.inputSchema).toEqual({
      type: 'object',
      properties: { query: { type: 'string' } },
      required: ['query'],
      additionalProperties: false,
    });
    expect(result.provenance).toContainEqual({
      referencePath: ['tools', 0, 'inputSchema'],
      targetPath: ['components', 'schemas', 'SearchInput'],
    });
  });

  it('substitutes a shared target independently at each reference', () => {
    const result = resolve(sharedTarget);
    if (!result.ok) throw new Error('expected resolution to succeed');

    const [search, lookup] = asDoc(result.value).tools ?? [];
    expect(search.inputSchema).toEqual(lookup.inputSchema);
    expect(search.inputSchema).not.toBe(lookup.inputSchema);
  });

  it('renders referenced and inline documents identically', () => {
    const referenced = resolve(equivalentReferenced);
    const inline = resolve(equivalentInline);
    if (!referenced.ok || !inline.ok) throw new Error('expected resolution to succeed');

    expect(referenced.value.tools).toEqual(inline.value.tools);
  });

  it('is a no-op for a document without components', () => {
    const result = resolve(noComponents);
    if (!result.ok) throw new Error('expected resolution to succeed');

    expect(result.substitutions).toBe(0);
    expect(result.provenance).toEqual([]);
    expect(result.value).toEqual(parse(noComponents));
  });

  it('resolves references that survive an effective protocol view projection', () => {
    const projection = projectEffectiveProtocolView(parse(protocolScopedRef), {
      specification: SPECIFICATION,
      protocolVersion: '2026-07-28',
    });
    if (!projection.ok) throw new Error('expected projection to succeed');

    const result = resolveMcpDescriptionComponentReferences(projection.value, { specification: SPECIFICATION });
    if (!result.ok) throw new Error('expected resolution to succeed');

    expect(asDoc(result.value).tools?.map((tool) => tool.name)).toEqual(['current_tool']);
    expect(result.provenance).toEqual([
      { referencePath: ['tools', 0, 'inputSchema'], targetPath: ['components', 'schemas', 'CurrentInput'] },
    ]);
  });
});

describe('invalid documents', () => {
  // Semantic failures are reported by the reference resolver itself.
  it.each([
    ['missing target', missingTarget, ['missing-component-reference-target@tools/0/inputSchema']],
    ['wrong namespace', wrongNamespace, ['wrong-component-reference-namespace@tools/0/inputSchema']],
    ['direct cycle', directCycle, [
      'component-reference-cycle@components/schemas/SelfReference',
      'component-reference-cycle@tools/0/inputSchema',
    ]],
    ['indirect cycle', indirectCycle, [
      'component-reference-cycle@components/schemas/A',
      'component-reference-cycle@components/schemas/B',
      'component-reference-cycle@tools/0/inputSchema',
    ]],
  ])('%s is reported semantically at the authored path', (_label, source, expected) => {
    const result = resolve(source);
    expect(result.ok).toBe(false);
    expect(anchors(result.diagnostics)).toEqual(new Set(expected));
  });

  // Structural failures never reach the resolver; they are rejected by the schema.
  it.each([
    ['unknown namespace', unknownNamespace, 'tools/0/inputSchema/$componentRef'],
    ['malformed pointer', malformedPointer, 'tools/0/inputSchema/$componentRef'],
    ['sibling override', siblingOverride, 'tools/0/inputSchema/description'],
    ['empty components', emptyComponents, 'components'],
    ['reference in interaction example', refInInteractionExample, 'tools/0/interactionExamples/flow/$componentRef'],
    ['invalid resolved value', invalidResolvedValue, 'tools/0/inputSchema/type'],
  ])('%s is reported structurally', (_label, source, anchor) => {
    const result = resolve(source);
    expect(result.ok).toBe(false);
    expect(result.diagnostics.every((d) => d.code === 'schema-validation')).toBe(true);
    expect(anchors(result.diagnostics)).toContain(`schema-validation@${anchor}`);
  });

  it.each([
    ['missing target', missingTarget],
    ['wrong namespace', wrongNamespace],
    ['direct cycle', directCycle],
    ['indirect cycle', indirectCycle],
    ['unknown namespace', unknownNamespace],
    ['malformed pointer', malformedPointer],
    ['sibling override', siblingOverride],
    ['empty components', emptyComponents],
    ['reference in interaction example', refInInteractionExample],
    ['invalid resolved value', invalidResolvedValue],
  ])('%s also fails validation, so the panel stays in sync', (_label, source) => {
    expect(validateMcpDescription(parse(source), { specification: SPECIFICATION }).valid).toBe(false);
  });
});
