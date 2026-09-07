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
      elicitation: { form: {} },
      tasks: { requests: { tools: { call: {} } } },
      extensions: { 'io.modelcontextprotocol/tasks': {} },
      experimental: { chessClock: {} },
      customCapability: {},
    },
    elicitations: [
      {
        name: 'choose_section',
        mode: 'form',
        message: 'Choose a section',
        when: 'After eligibility is calculated',
        onDecline: 'Registration is not created',
        onCancel: 'Registration is abandoned',
        requestedSchema: {
          type: 'object',
          properties: {
            section: { type: 'string', oneOf: [{ const: 'u2000', title: 'Under 2000' }] },
          },
        },
      },
      { name: 'authorize_registration', mode: 'url', message: 'Authorize registration', url: 'https://example.com/authorize' },
    ],
  }],
  resources: [{
    uri: 'chess://tournaments/current',
    name: 'current_tournament',
    elicitations: [
      { name: 'confirm_access', mode: 'form', message: 'Confirm access', requestedSchema: { type: 'object', properties: {} } },
    ],
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
    expect(markup).toContain('elicitation/form');
    expect(markup).toContain('tasks/requests/tools/call');
    expect(markup).toContain('extensions/io.modelcontextprotocol/tasks');
    expect(markup).toContain('experimental/chessClock');
    expect(markup).toContain('customCapability');
    expect(markup).not.toContain('&quot;elicitation&quot;');
    expect(markup).toContain('Elicitations');
    expect(markup).toContain('Elicitations <span class="text-gray-400">(2)</span>');
    expect(markup).toContain('choose_section');
    expect(markup).toContain('authorize_registration');
    expect(markup).toContain('Choose a section');
    expect(markup).toContain('https://example.com/authorize');
    expect(markup).toContain('Requested input');
    expect(markup).toContain('Under 2000');
    expect(markup.indexOf('When')).toBeLessThan(markup.indexOf('On decline'));
    expect(markup.indexOf('On decline')).toBeLessThan(markup.indexOf('On cancel'));
    expect(markup.indexOf('On cancel')).toBeLessThan(markup.indexOf('Requested input'));
    expect(markup).toContain('confirm_access');
    expect(markup).toContain('form');
    expect(markup).toContain('url');
    expect(markup).toContain('MCP Version');
    expect(markup).toContain('border border-black bg-white text-black');
    expect(markup).toContain('Execution');
    expect(markup).toContain('task support: required');
  });
});