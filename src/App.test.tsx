import { render, screen } from '@testing-library/react';
import { Component, type ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { PreviewErrorBoundary } from './App';

class BrokenPreview extends Component<{ broken: boolean }> {
  render(): ReactNode {
    if (this.props.broken) throw new Error('Preview failed');
    return <p>Recovered preview</p>;
  }
}

describe('preview error recovery', () => {
  it('retries rendering when the editor content changes', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const preventExpectedError = (event: ErrorEvent) => {
      if (event.error?.message === 'Preview failed') event.preventDefault();
    };
    window.addEventListener('error', preventExpectedError);
    const { rerender } = render(
      <PreviewErrorBoundary resetKey="invalid">
        <BrokenPreview broken />
      </PreviewErrorBoundary>,
    );

    expect(screen.getByText('Render Error')).toBeTruthy();

    rerender(
      <PreviewErrorBoundary resetKey="valid">
        <BrokenPreview broken={false} />
      </PreviewErrorBoundary>,
    );

    expect(screen.queryByText('Render Error')).toBeNull();
    expect(screen.getByText('Recovered preview')).toBeTruthy();
    window.removeEventListener('error', preventExpectedError);
    consoleError.mockRestore();
  });
});