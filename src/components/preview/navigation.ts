// Copyright 2026 Cisco Systems, Inc. and its affiliates
//
// SPDX-License-Identifier: Apache-2.0

import type { McpDescDocument } from '../../core/types';
import { isMap, isNode, isScalar, isSeq, LineCounter, parseDocument } from 'yaml';

export interface SourcePathOptions {
  /** Resolve a path that is absent from the source to its closest existing ancestor. */
  nearestAncestor?: boolean;
}

/**
 * Locate a JSON pointer in parsed YAML or JSON source. Returns a 1-based line,
 * or 0 when the source does not parse or the path is absent (unless
 * `nearestAncestor` is set). Never matches text outside the path's own scope.
 */
export function sourcePathToLine(text: string, path: string, options: SourcePathOptions = {}): number {
  const lineCounter = new LineCounter();
  const document = parseDocument(text, { lineCounter });
  if (document.errors.length > 0) return 0;

  const lineOf = (node: unknown) => (isNode(node) && node.range ? lineCounter.linePos(node.range[0]).line : 0);
  const segments = path.split('/').filter(Boolean)
    .map(segment => segment.replace(/~1/g, '/').replace(/~0/g, '~'));
  let node: unknown = document.contents;
  // Property paths identify the authored key, not the start of its block value.
  let anchor: unknown = node;
  for (const segment of segments) {
    let next: unknown;
    let nextAnchor: unknown;
    if (isMap(node)) {
      const pair = node.items.find(item => isScalar(item.key) && String(item.key.value) === segment);
      next = pair?.value;
      nextAnchor = pair?.key;
    } else if (isSeq(node) && /^\d+$/.test(segment)) {
      next = node.get(Number(segment), true);
      nextAnchor = next;
    }
    if (!isNode(nextAnchor)) return options.nearestAncestor ? lineOf(anchor) : 0;
    node = next;
    anchor = nextAnchor;
  }
  return lineOf(anchor);
}

export function sourceItemPath(
  doc: McpDescDocument | null,
  section: string,
  value: string,
  displayedIndex: number | undefined,
  selectedProtocolVersion: string | null,
): string | null {
  if (!doc || displayedIndex === undefined) return null;
  const items = doc[section];
  if (!Array.isArray(items)) return null;

  const identityKey = section === 'tools' || section === 'prompts'
    ? 'name'
    : section === 'resources'
      ? 'uri'
      : section === 'resourceTemplates'
        ? 'uriTemplate'
        : section === 'transports'
          ? 'type'
          : null;
  if (!identityKey) return null;

  let sourceIndex = displayedIndex;
  if (selectedProtocolVersion) {
    sourceIndex = items.findIndex(item => {
      if (!item || typeof item !== 'object') return false;
      const candidate = item as Record<string, unknown>;
      const versions = candidate.protocolVersions;
      return candidate[identityKey] === value
        && (!Array.isArray(versions) || versions.includes(selectedProtocolVersion));
    });
  }

  return sourceIndex >= 0 ? `/${section}/${sourceIndex}/${identityKey}` : null;
}