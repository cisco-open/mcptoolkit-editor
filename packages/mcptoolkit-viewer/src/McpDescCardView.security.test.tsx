import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import type { McpDescDocument } from '@core/types';
import { McpDescCardView } from './McpDescCardView';

afterEach(cleanup);

describe('McpDescCardView description security', () => {
  it('sanitizes active HTML while preserving safe Markdown', () => {
    const doc = {
      mcpdesc: '0.8.0',
      info: {
        name: 'untrusted-description',
        version: '1.0.0',
        websiteUrl: 'javascript:alert(4)',
        description: '**Safe text** <img src="x" onerror="alert(1)">'
          + '<script>alert(2)</script><a href="javascript:alert(3)">unsafe link</a>',
      },
      protocolVersions: ['2025-11-25'],
      transports: [],
    } as McpDescDocument;

    const { container } = render(<McpDescCardView doc={doc} />);

    expect(container.querySelector('strong')?.textContent).toBe('Safe text');
    expect(container.querySelector('script')).toBeNull();
    expect(container.querySelector('img')?.hasAttribute('onerror')).toBe(false);
    expect(container.querySelector('a')?.hasAttribute('href')).toBe(false);
    expect(container.textContent).toContain('javascript:alert(4)');
  });
});