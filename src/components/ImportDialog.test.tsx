import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DocProvider, useDoc } from '../hooks/useDoc';
import ImportDialog from './ImportDialog';

function CurrentText() {
  const { state } = useDoc();
  return <output data-testid="current-text">{state.text}</output>;
}

describe('ImportDialog', () => {
  beforeEach(() => {
    localStorage.clear();
    history.replaceState({}, '', '/');
    Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
      configurable: true,
      value(this: HTMLDialogElement) { this.open = true; },
    });
    Object.defineProperty(HTMLDialogElement.prototype, 'close', {
      configurable: true,
      value(this: HTMLDialogElement) { this.open = false; },
    });
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('exposes an accessible dark file-import control', () => {
    render(
      <DocProvider>
        <ImportDialog open initialUrl="" onClose={() => {}} />
      </DocProvider>,
    );

    const sourceGroup = screen.getByRole('group', { name: 'Import source' });
    const fileButton = screen.getByRole('button', { name: 'File' });
    const fileInput = screen.getByLabelText('Choose file');

    expect(sourceGroup).toBeTruthy();
    expect(fileButton.getAttribute('aria-pressed')).toBe('true');
    expect(fileInput.getAttribute('aria-describedby')).toBe('import-file-help');
    expect(screen.getByText('JSON or YAML, up to 1 MiB.')).toBeTruthy();
  });

  it('automatically imports an initial URL through the dialog loader', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response('mcpdesc: 0.8.0', { status: 200 }),
    );
    const onClose = vi.fn();
    vi.stubGlobal('fetch', fetcher);

    history.replaceState({}, '', '/editor?example=minimal&url=https%3A%2F%2Fexample.com%2Fserver.yaml&theme=dark');

    render(
      <DocProvider>
        <ImportDialog open initialUrl="https://example.com/server.yaml" onClose={onClose} />
        <CurrentText />
      </DocProvider>,
    );

    await waitFor(() => expect(onClose).toHaveBeenCalledOnce());
    expect(screen.getByTestId('current-text').textContent).toBe('mcpdesc: 0.8.0');
    expect(new URLSearchParams(window.location.search).get('url')).toBe('https://example.com/server.yaml');
    expect(new URLSearchParams(window.location.search).get('theme')).toBe('dark');
    expect(new URLSearchParams(window.location.search).has('example')).toBe(false);
  });

  it('does not retain a manually entered URL after importing it', async () => {
    vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockResolvedValue(
      new Response('mcpdesc: 0.8.0', { status: 200 }),
    ));
    history.replaceState({}, '', '/editor?example=minimal&theme=dark');

    render(
      <DocProvider>
        <ImportDialog open initialUrl="" onClose={() => {}} />
      </DocProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'URL' }));
    fireEvent.change(screen.getByLabelText('Public HTTPS URL'), {
      target: { value: 'https://example.com/private.yaml?token=secret' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Import' }));

    await waitFor(() => expect(window.location.search).toBe('?theme=dark'));
  });

  it('keeps automatic import failures visible', async () => {
    vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockRejectedValue(new TypeError('Failed to fetch')));

    render(
      <DocProvider>
        <ImportDialog open initialUrl="https://example.com/server.yaml" onClose={() => {}} />
      </DocProvider>,
    );

    expect((await screen.findByRole('alert')).textContent).toContain('allows browser CORS requests');
  });
});