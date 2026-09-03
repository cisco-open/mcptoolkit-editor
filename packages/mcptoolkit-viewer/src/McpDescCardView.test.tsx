// Copyright 2026 Cisco Systems, Inc. and its affiliates
//
// SPDX-License-Identifier: Apache-2.0

/**
 * A referenced document must look the same as its inline equivalent, and every
 * indicator must lead somewhere real.
 */

import { describe, expect, it, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { parseMcpDescriptionSource } from '@mcpdesc/core/documents';
import { resolveMcpDescriptionComponentReferences } from '@mcpdesc/core/components';
import { McpDescCardView } from './McpDescCardView';
import type { McpDescDocument } from '@core/types';

import inlineSource from '../../../src/core/__fixtures__/components/valid/equivalent-inline.yaml?raw';
import referencedSource from '../../../src/core/__fixtures__/components/valid/equivalent-referenced.yaml?raw';

function resolved(source: string) {
  const parsed = parseMcpDescriptionSource(source);
  if (!parsed.ok) throw new Error('fixture does not parse');
  const result = resolveMcpDescriptionComponentReferences(parsed.value, { specification: '0.8.0-rc.1' });
  if (!result.ok) throw new Error('fixture does not resolve');
  return { doc: result.value as McpDescDocument, provenance: result.provenance };
}

describe('McpDescCardView component references', () => {
  it('renders referenced declarations like inline ones', () => {
    const inline = resolved(inlineSource);
    const { container: inlineHtml } = render(
      <McpDescCardView doc={inline.doc} exampleDisplay="names" />,
    );
    const inlineMarkup = inlineHtml.innerHTML;
    cleanup();

    const referenced = resolved(referencedSource);
    const { container: referencedHtml } = render(
      <McpDescCardView doc={referenced.doc} exampleDisplay="names" />,
    );

    expect(referencedHtml.innerHTML).toBe(inlineMarkup);
  });

  it('marks resolved content and reports the component pointer on selection', async () => {
    const { doc, provenance } = resolved(referencedSource);
    const onComponentSelect = vi.fn();
    render(
      <McpDescCardView
        doc={doc}
        exampleDisplay="names"
        componentReferences={provenance}
        onComponentSelect={onComponentSelect}
      />,
    );

    const indicator = screen.getByRole('button', { name: 'component SearchInput' });
    indicator.click();

    expect(onComponentSelect).toHaveBeenCalledWith('/components/schemas/SearchInput');
    expect(screen.getByRole('button', { name: 'component basic-search' })).toBeTruthy();
  });

  it('shows no indicators when the document has no references', () => {
    const { doc } = resolved(inlineSource);
    render(<McpDescCardView doc={doc} exampleDisplay="names" componentReferences={[]} />);

    expect(screen.queryByText(/^component /)).toBeNull();
  });
});
