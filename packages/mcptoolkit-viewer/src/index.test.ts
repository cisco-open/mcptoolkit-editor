// Copyright 2026 Cisco Systems, Inc. and its affiliates
//
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it, vi } from 'vitest';
import { fireEvent, waitFor } from '@testing-library/react';
import { parseMcpDescriptionSource } from '@mcpdesc/core/documents';
import { McpToolkitViewer, parseYaml } from './index';
import type { McpDescDocument, ValidationResult } from '@core/types';

import inlineSource from '../../../src/core/__fixtures__/components/valid/equivalent-inline.yaml?raw';

describe('parseYaml', () => {
  it('parses the examples menu configuration shape', () => {
    const config = parseYaml(`
default: basic
sections:
  - label: Features Demonstration
    entries:
      - label: Basic
        id: basic
        file: features/minimal.yaml
`) as {
      default: string;
      sections: Array<{ entries: Array<{ id: string }> }>;
    };

    expect(config.default).toBe('basic');
    expect(config.sections.flatMap((section) => section.entries).map((entry) => entry.id))
      .toContain(config.default);
  });
});

describe('McpToolkitViewer', () => {
  it('downloads the public source response without parsing it', async () => {
    const parsed = parseMcpDescriptionSource(inlineSource);
    if (!parsed.ok) throw new Error('fixture does not parse');
    const publicUrl = 'https://example.com/public/mcpdesc.yaml?version=1';
    const sourceBlob = new Blob(['mcpdesc: 0.9.0\n']);
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, blob: async () => sourceBlob });
    const createObjectURL = vi.fn().mockReturnValue('blob:viewer-download');
    const revokeObjectURL = vi.fn();
    const previousCreateObjectURL = URL.createObjectURL;
    const previousRevokeObjectURL = URL.revokeObjectURL;
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: createObjectURL });
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: revokeObjectURL });
    vi.stubGlobal('fetch', fetchMock);
    let downloadName = '';
    let downloadHref = '';
    const anchorClick = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      downloadName = this.download;
      downloadHref = this.href;
    });
    const container = document.createElement('div');
    container.id = 'viewer-download-test';
    document.body.appendChild(container);
    const viewer = McpToolkitViewer({
      dom_id: '#viewer-download-test',
      spec: parsed.value as McpDescDocument,
      publicUrl,
    });

    try {
      await waitFor(() => expect(container.textContent).toContain('equivalence'));
      fireEvent.click(container.querySelector('button')!);
      await waitFor(() => expect(anchorClick).toHaveBeenCalledTimes(1));
      expect(fetchMock).toHaveBeenCalledWith(publicUrl, {
        credentials: 'omit',
        referrerPolicy: 'no-referrer',
      });
      expect(createObjectURL).toHaveBeenCalledWith(sourceBlob);
      expect(downloadName).toBe('mcpdesc.yaml');
      expect(downloadHref).toBe('blob:viewer-download');
      await waitFor(
        () => expect(revokeObjectURL).toHaveBeenCalledWith('blob:viewer-download'),
        { timeout: 2000 },
      );
    } finally {
      viewer.destroy();
      container.remove();
      anchorClick.mockRestore();
      vi.unstubAllGlobals();
      if (previousCreateObjectURL) {
        Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: previousCreateObjectURL });
      } else {
        delete (URL as URL & { createObjectURL?: typeof URL.createObjectURL }).createObjectURL;
      }
      if (previousRevokeObjectURL) {
        Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: previousRevokeObjectURL });
      } else {
        delete (URL as URL & { revokeObjectURL?: typeof URL.revokeObjectURL }).revokeObjectURL;
      }
    }
  });

  it('shows Download and Edit actions only when a public URL is provided', async () => {
    const parsed = parseMcpDescriptionSource(inlineSource);
    if (!parsed.ok) throw new Error('fixture does not parse');
    const publicUrl = 'https://example.com/public/mcpdesc.yaml?version=1';
    const container = document.createElement('div');
    container.id = 'viewer-actions-test';
    document.body.appendChild(container);
    const viewer = McpToolkitViewer({
      dom_id: '#viewer-actions-test',
      spec: parsed.value as McpDescDocument,
      publicUrl,
    });

    try {
      await waitFor(() => expect(container.textContent).toContain('equivalence'));
      const editLink = container.querySelector('a');
      expect(container.textContent).toContain('Download');
      expect(editLink?.textContent).toBe('Edit');
      expect(new URL(editLink!.href).searchParams.get('url')).toBe(publicUrl);
      expect(editLink?.target).toBe('_blank');
      expect(editLink?.rel).toBe('noopener noreferrer');
    } finally {
      viewer.destroy();
      container.remove();
    }
  });

  it('omits Download and Edit actions without a public URL', async () => {
    const parsed = parseMcpDescriptionSource(inlineSource);
    if (!parsed.ok) throw new Error('fixture does not parse');
    const container = document.createElement('div');
    container.id = 'viewer-no-actions-test';
    document.body.appendChild(container);
    const viewer = McpToolkitViewer({ dom_id: '#viewer-no-actions-test', spec: parsed.value as McpDescDocument });

    try {
      await waitFor(() => expect(container.textContent).toContain('equivalence'));
      expect(container.textContent).not.toContain('Download');
      expect(container.textContent).not.toContain('Edit');
    } finally {
      viewer.destroy();
      container.remove();
    }
  });

  it('warns about validation issues while continuing to render', async () => {
    const parsed = parseMcpDescriptionSource(inlineSource);
    if (!parsed.ok) throw new Error('fixture does not parse');
    const doc = parsed.value as McpDescDocument;
    Object.assign(doc, { protocolVersions: [] });

    const container = document.createElement('div');
    container.id = 'viewer-test';
    document.body.appendChild(container);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const viewer = McpToolkitViewer({ dom_id: '#viewer-test', spec: doc });

    try {
      await waitFor(() => expect(container.textContent).toContain('equivalence'));
      expect(warn).toHaveBeenCalledTimes(1);
      expect(warn).toHaveBeenCalledWith(
        'mcptoolkit-viewer: MCP Description 0.9.0 has validation issues; rendering continues.',
        expect.objectContaining({ valid: false, errors: expect.any(Array) }),
      );
      expect((warn.mock.calls[0][1] as ValidationResult).errors.length).toBeGreaterThan(0);
    } finally {
      viewer.destroy();
      container.remove();
      warn.mockRestore();
    }
  });
});