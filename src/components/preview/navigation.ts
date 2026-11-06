// Copyright 2026 Cisco Systems, Inc. and its affiliates
//
// SPDX-License-Identifier: Apache-2.0

import type { McpDescDocument } from '../../core/types';
import { isMap, isNode, isScalar, isSeq, LineCounter, parseDocument } from 'yaml';

export function sourcePathToLine(text: string, path: string): number {
  const lineCounter = new LineCounter();
  const document = parseDocument(text, { lineCounter });
  if (document.errors.length > 0) return 0;

  const segments = path.split('/').filter(Boolean)
    .map(segment => segment.replace(/~1/g, '/').replace(/~0/g, '~'));
  let node: unknown = document.contents;
  for (const [index, segment] of segments.entries()) {
    if (isMap(node)) {
      const pair = node.items.find(item => isScalar(item.key) && String(item.key.value) === segment);
      // Property paths identify the authored key, not the start of its block value.
      node = index === segments.length - 1 ? pair?.key : pair?.value;
    } else if (isSeq(node)) {
      node = node.get(segment, true);
    } else {
      return 0;
    }
  }
  if (!isNode(node) || !node.range) return 0;
  return lineCounter.linePos(node.range[0]).line;
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