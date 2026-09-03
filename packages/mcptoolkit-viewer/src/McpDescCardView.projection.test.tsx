// Copyright 2026 Cisco Systems, Inc. and its affiliates
//
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { McpDescCardView } from './McpDescCardView';
import type { McpDescDocument } from '@core/types';

const baseDoc = {
  mcpdesc: '0.8.0',
  info: { name: 'chess', version: '2.0.0' },
  protocolVersions: ['2026-07-28'],
  capabilities: [{
    tools: { listChanged: true },
    extensions: { 'io.modelcontextprotocol/tasks': {} },
  }],
  tools: [{
    name: 'analyze_game',
    inputSchema: {},
    execution: { taskSupport: 'required' },
    clientRequirements: {
      extensions: { 'io.modelcontextprotocol/tasks': {} },
    },
  }],
} satisfies McpDescDocument;

const sourceDoc = {
  ...baseDoc,
  tools: [{
    ...baseDoc.tools[0],
    protocolVersions: ['2026-07-28'],
  }],
} satisfies McpDescDocument;

describe('McpDescCardView protocol projections', () => {
  it('shows effective server capabilities and operation client requirements', () => {
    const markup = renderToStaticMarkup(
      <McpDescCardView doc={baseDoc} sourceDoc={sourceDoc} selectedProtocolVersion="2026-07-28" />,
    );

    expect(markup).toContain('Capabilities');
    expect(markup).toContain('2026-07-28');
    expect(markup).toContain('Tools');
    expect(markup).toContain('(listChanged)');
    expect(markup).toContain('Extensions');
    expect(markup).toContain('bg-amber-100 text-amber-800');
    expect(markup).toContain('io.modelcontextprotocol/tasks');
    expect(markup).toContain('Client requirements');
    expect(markup).toContain('MCP Version');
    expect(markup).toContain('Execution');
    expect(markup).toContain('task support: required');
  });
});