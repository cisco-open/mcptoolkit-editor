// Copyright 2026 Cisco Systems, Inc. and its affiliates
//
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { McpDescCardView } from './McpDescCardView';
import type { McpDescDocument, McpProtocolVersion } from '@core/types';

const baseDoc = {
  mcpdesc: '0.9.0',
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
        protocolVersions: ['2026-07-28'],
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
  it('renders compact custom protocol version controls', () => {
    const onProtocolVersionSelect = vi.fn();
    const protocolVersionOptions: McpProtocolVersion[] = ['2025-11-25', '2026-07-28'];
    const { getByRole } = render(
      <McpDescCardView
        doc={{ ...baseDoc, protocolVersions: protocolVersionOptions }}
        protocolVersionProjectionMode="enabled"
        protocolVersionOptions={protocolVersionOptions}
        selectedProtocolVersion="2026-07-28"
        onProtocolVersionSelect={onProtocolVersionSelect}
      />,
    );

    const versionRadio = getByRole('radio', { name: '2025-11-25' });
    expect(versionRadio.className).toContain('appearance-none');
    expect(versionRadio.className).toContain('size-3');
    expect(versionRadio.parentElement?.className).toContain('text-[11px]');
    expect(versionRadio.parentElement?.className).toContain('bg-gray-50');

    fireEvent.click(versionRadio);
    expect(onProtocolVersionSelect).toHaveBeenCalledWith('2025-11-25');
  });

  it('matches the compact protocol styling when only one version is available', () => {
    const { getAllByText, queryByRole } = render(<McpDescCardView doc={baseDoc} />);
    const versionBadge = getAllByText('2026-07-28')
      .find(element => element.className.includes('border-gray-300'));

    expect(versionBadge?.className).toContain('border-gray-300');
    expect(versionBadge?.className).toContain('bg-gray-50');
    expect(versionBadge?.className).toContain('text-[11px]');
    expect(versionBadge?.className).toContain('font-medium');
    expect(queryByRole('radio')).toBeNull();
  });

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
    expect(markup).not.toContain('>Protocol Version<');
    expect(markup.match(/border border-gray-300 bg-gray-50 text-\[11px\] font-medium text-gray-900/g)).toHaveLength(2);
    expect(markup).not.toContain('border border-black bg-white text-black');
    expect(markup).toContain('Execution');
    expect(markup).toContain('task support: required');
  });

  it('shows a scoped tool version in All versions but hides it in a single-version view', () => {
    const doc = { ...sourceDoc, protocolVersions: ['2025-11-25', '2026-07-28'] } satisfies McpDescDocument;
    const { getByText, queryByText, rerender } = render(<McpDescCardView doc={doc} />);

    expect(getByText('Protocol Version', { exact: true }).parentElement?.textContent).toContain('2026-07-28');

    rerender(<McpDescCardView doc={doc} selectedProtocolVersion="2026-07-28" />);

    expect(queryByText('Protocol Version', { exact: true })).toBeNull();
  });

  it('hides empty document security but still reports missing transports', () => {
    const { getByText, queryByText, rerender } = render(<McpDescCardView doc={baseDoc} />);

    expect(queryByText('Security', { exact: true })).toBeNull();
    expect(getByText('No transport defined')).toBeTruthy();

    rerender(<McpDescCardView doc={{ ...baseDoc, security: [], securitySchemes: {} }} />);
    expect(queryByText('Security', { exact: true })).toBeNull();

    rerender(<McpDescCardView doc={{ ...baseDoc, security: [{}] }} />);
    expect(getByText('Security', { exact: true })).toBeTruthy();
    expect(getByText('anonymous')).toBeTruthy();

    rerender(<McpDescCardView doc={{ ...baseDoc, securitySchemes: { bearer: { type: 'http', scheme: 'bearer' } } }} />);
    expect(getByText('Security', { exact: true })).toBeTruthy();
  });

  it('groups transport security and client requirements below the transport summary', () => {
    const doc = {
      ...baseDoc,
      transports: [
        {
          type: 'streamable-http',
          url: 'https://example.com/mcp',
          security: [{ bearer: [] }],
          clientRequirements: { extensions: { 'io.modelcontextprotocol/tasks': {} } },
        },
        { type: 'stdio', command: 'chess', args: ['serve'], security: [] },
      ],
    } satisfies McpDescDocument;
    const { getByText, getAllByText } = render(<McpDescCardView doc={doc} />);

    const summary = getByText('https://example.com/mcp').parentElement;
    const details = summary?.nextElementSibling;
    expect(details?.textContent).toContain('Default Securitybearer');
    expect(details?.textContent).toContain('Client requirementsextensions/io.modelcontextprotocol/tasks');
    expect(details?.querySelector('.border-t')).toBeNull();
    expect(getByText('chess serve').parentElement?.nextElementSibling?.textContent).toBe('Default Securitynone');
    expect(getAllByText('Default Security')).toHaveLength(2);
  });

  it('lists only enabled capability flags in a wrapping row', () => {
    const doc = {
      mcpdesc: '0.9.0',
      info: baseDoc.info,
      protocolVersions: ['2025-11-25'],
      capabilities: [{
        logging: {},
        resources: { subscribe: false, listChanged: true },
        prompts: { listChanged: false },
        extensions: { 'io.modelcontextprotocol/ui': {} },
      }],
    } satisfies McpDescDocument;
    const { getByText } = render(<McpDescCardView doc={doc} />);
    const row = getByText('Resources').closest('div');

    expect(row?.className).toContain('flex-wrap');
    expect(row?.textContent).toContain('Logging');
    expect(row?.textContent).toContain('Resources (listChanged)');
    expect(row?.textContent).not.toContain('subscribe');
    expect(row?.textContent).toContain('Prompts');
    expect(row?.textContent).not.toContain('Prompts (');
    expect(row?.textContent).not.toContain('2025-11-25');
    expect(getByText('io.modelcontextprotocol/ui').className).toContain('bg-amber-100');
  });

  it('labels capability entries with their protocol versions when several are shown', () => {
    const doc = {
      mcpdesc: '0.9.0',
      info: baseDoc.info,
      protocolVersions: ['2025-11-25', '2026-07-28'],
      capabilities: [
        { protocolVersions: ['2025-11-25'], tools: { listChanged: true } },
        { protocolVersions: ['2026-07-28'], tools: { listChanged: true } },
      ],
    } satisfies McpDescDocument;
    const { getAllByText } = render(<McpDescCardView doc={doc} />);
    const rows = getAllByText('Tools').map(label => label.closest('div'));

    expect(rows[0]?.textContent).toContain('2025-11-25');
    expect(rows[1]?.textContent).toContain('2026-07-28');
  });
});