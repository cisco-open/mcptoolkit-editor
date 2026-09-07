// Copyright 2026 Cisco Systems, Inc. and its affiliates
//
// SPDX-License-Identifier: Apache-2.0

import type { McpDescDocument } from '../../core/types';
import { isNode, LineCounter, parseDocument } from 'yaml';

export function sourcePathToLine(text: string, path: string): number {
  const lineCounter = new LineCounter();
  const document = parseDocument(text, { lineCounter });
  if (document.errors.length > 0) return 0;

  const segments = path.split('/').filter(Boolean).map(segment => (
    /^\d+$/.test(segment) ? Number(segment) : segment
  ));
  const node = document.getIn(segments, true);
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