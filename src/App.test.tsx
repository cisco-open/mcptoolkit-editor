import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { Component, type ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import App, { PreviewErrorBoundary } from './App';
import { useDoc } from './hooks/useDoc';
import minimalExample from '../examples/features/minimal.yaml?raw';

vi.mock('./components/Editor', () => ({
  default: function TestEditor() {
    const { state, setText } = useDoc();
    return <textarea aria-label="Document source" value={state.text} onChange={(event) => setText(event.target.value)} />;
  },
}));

class BrokenPreview extends Component<{ broken: boolean }> {
  render(): ReactNode {
    if (this.props.broken) throw new Error('Preview failed');
    return <p>Recovered preview</p>;
  }
}

describe('preview error recovery', () => {
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.restoreAllMocks();
    localStorage.clear();
    Reflect.deleteProperty(HTMLDialogElement.prototype, 'showModal');
    Reflect.deleteProperty(HTMLDialogElement.prototype, 'close');
  });

  it('recovers after a corrected document finishes debounced parsing', () => {
    vi.useFakeTimers();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    Object.defineProperties(HTMLDialogElement.prototype, {
      showModal: { configurable: true, value: function (this: HTMLDialogElement) { this.open = true; } },
      close: { configurable: true, value: function (this: HTMLDialogElement) { this.open = false; } },
    });
    history.replaceState({}, '', '/');
    localStorage.setItem('mcptoolkit-editor-content', minimalExample);
    const preventExpectedError = (event: ErrorEvent) => {
      if (event.error?.message?.includes("reading 'join'")) event.preventDefault();
    };
    window.addEventListener('error', preventExpectedError);

    try {
      render(<App />);
      act(() => vi.advanceTimersByTime(300));
      expect(screen.getByText('Chess Rating MCP Server')).toBeTruthy();

      fireEvent.change(screen.getByRole('textbox', { name: 'Document source' }), {
        target: { value: minimalExample.replace('protocolVersions:', 'protocolVersion:') },
      });
      act(() => vi.advanceTimersByTime(300));
      expect(screen.getByText('Render Error')).toBeTruthy();

      fireEvent.change(screen.getByRole('textbox', { name: 'Document source' }), {
        target: { value: minimalExample },
      });
      act(() => vi.advanceTimersByTime(300));

      expect(screen.getByTestId('validation-status').textContent).toContain('Valid');
      expect(screen.queryByText('Render Error')).toBeNull();
      expect(screen.getByText('Chess Rating MCP Server')).toBeTruthy();
    } finally {
      window.removeEventListener('error', preventExpectedError);
    }
  });

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