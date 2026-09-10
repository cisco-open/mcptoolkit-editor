import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Toolbar from '../components/Toolbar';
import ValidationPanel from '../components/ValidationPanel';
import PreviewPanel from '../components/preview/PreviewPanel';
import { defaultExample, examples } from '../examples';
import { DocProvider, useDoc } from './useDoc';

function CurrentText() {
  const { state } = useDoc();
  return <output data-testid="current-text">{state.text}</output>;
}

function EditDocument() {
  const { setText } = useDoc();
  return <button onClick={() => setText('edited content')}>Edit document</button>;
}

function DocumentControls() {
  const { importText, loadExample, setText, state } = useDoc();
  const basicExample = examples.find(({ id }) => id === 'basic')!;
  return (
    <>
      <button onClick={() => setText(' \n\t ')}>Clear document</button>
      <button onClick={() => setText('{')}>Break document</button>
      <button onClick={() => setText(defaultExample)}>Fix document</button>
      <button onClick={() => loadExample(basicExample)}>Load Basic</button>
      <button onClick={() => importText(defaultExample, 'https://example.com/imported.yaml')}>Import document</button>
      <output data-testid="has-document">{String(Boolean(state.doc))}</output>
      <output data-testid="parse-error">{state.parseError ?? ''}</output>
      <output data-testid="document-load-revision">{state.documentLoadRevision}</output>
    </>
  );
}

describe('document startup', () => {
  beforeEach(() => {
    localStorage.clear();
    history.replaceState({}, '', '/');
  });

  afterEach(() => {
    cleanup();
  });

  it('loads and selects a URL example instead of saved content', () => {
    const example = examples.find(({ id }) => id === 'full-featured');
    localStorage.setItem('mcptoolkit-editor-content', 'saved content');
    history.replaceState({}, '', '/?example=full-featured');

    render(
      <DocProvider>
        <Toolbar onImport={() => {}} />
        <CurrentText />
      </DocProvider>,
    );

    expect(screen.getByRole('combobox')).toHaveProperty('value', 'full-featured');
    expect(screen.getByTestId('current-text').textContent).toBe(example?.content);
  });

  it('ignores an unknown example ID and retains saved content', () => {
    localStorage.setItem('mcptoolkit-editor-content', 'saved content');
    history.replaceState({}, '', '/?example=unknown');

    render(
      <DocProvider>
        <Toolbar onImport={() => {}} />
        <CurrentText />
      </DocProvider>,
    );

    expect(screen.getByRole('combobox')).toHaveProperty('value', '');
    expect(screen.getByTestId('current-text').textContent).toBe('saved content');
  });

  it('updates the URL for selected examples and clears document source parameters after edits', () => {
    history.replaceState({}, '', '/editor?url=https%3A%2F%2Fexample.com%2Fdoc.yaml&theme=dark#preview');

    render(
      <DocProvider>
        <Toolbar onImport={() => {}} />
        <CurrentText />
        <EditDocument />
      </DocProvider>,
    );

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'full-featured' } });
    expect(window.location.href).toContain('/editor?theme=dark&example=full-featured#preview');

    fireEvent.click(screen.getByRole('button', { name: 'Edit document' }));
    expect(window.location.href).toContain('/editor?theme=dark#preview');
  });

  it('signals example and URL document loads without signaling editor changes', () => {
    render(
      <DocProvider>
        <DocumentControls />
      </DocProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Break document' }));
    expect(screen.getByTestId('document-load-revision').textContent).toBe('0');

    fireEvent.click(screen.getByRole('button', { name: 'Load Basic' }));
    expect(screen.getByTestId('document-load-revision').textContent).toBe('1');

    fireEvent.click(screen.getByRole('button', { name: 'Import document' }));
    expect(screen.getByTestId('document-load-revision').textContent).toBe('2');
  });

  it('renders the default or customized editor title', () => {
    const { rerender } = render(
      <DocProvider>
        <Toolbar onImport={() => {}} />
      </DocProvider>,
    );

    expect(screen.getByText('MCP Description Editor')).toBeTruthy();

    rerender(
      <DocProvider>
        <Toolbar title="{mcpdesc} Editor" onImport={() => {}} />
      </DocProvider>,
    );

    expect(screen.getByText('{mcpdesc} Editor')).toBeTruthy();
  });

  it('renders a plain title link in a new tab', () => {
    render(
      <DocProvider>
        <Toolbar
          title="{mcpdesc} Editor"
          titleUrl="https://mcpdesc.org"
          titleUrlTarget="_blank"
          onImport={() => {}}
        />
      </DocProvider>,
    );

    const link = screen.getByRole('link', { name: '{mcpdesc} Editor' });
    expect(link.getAttribute('href')).toBe('https://mcpdesc.org');
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toBe('noopener noreferrer');
    expect(link.className).toContain('no-underline');
  });

  it('does not render unsafe title URLs as links', () => {
    render(
      <DocProvider>
        <Toolbar title="Editor" titleUrl="javascript:alert(1)" onImport={() => {}} />
      </DocProvider>,
    );

    expect(screen.queryByRole('link', { name: 'Editor' })).toBeNull();
    expect(screen.getByText('Editor')).toBeTruthy();
  });

  it('renders a standard title link in the same tab by default', () => {
    render(
      <DocProvider>
        <Toolbar
          title="MCP Description"
          titleUrl=" https://mcpdesc.org "
          titleLinkAppearance="standard"
          onImport={() => {}}
        />
      </DocProvider>,
    );

    const link = screen.getByRole('link', { name: 'MCP Description' });
    expect(link.getAttribute('href')).toBe('https://mcpdesc.org');
    expect(link.getAttribute('target')).toBe('_self');
    expect(link.getAttribute('rel')).toBeNull();
    expect(link.className).toContain('underline');
  });

  it('shows a neutral no-content state after clearing the editor', () => {
    render(
      <DocProvider>
        <DocumentControls />
        <PreviewPanel />
        <ValidationPanel />
      </DocProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Clear document' }));

    expect(screen.getByText('No contents')).toBeTruthy();
    expect(screen.getByTestId('validation-status').textContent).toContain('No contents');
    expect(screen.getByTestId('has-document').textContent).toBe('false');
    expect(screen.queryByText('Valid')).toBeNull();
  });

  it('recovers the preview after invalid text becomes valid', async () => {
    vi.useFakeTimers();
    render(
      <DocProvider>
        <DocumentControls />
        <PreviewPanel />
      </DocProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Break document' }));
    await act(async () => vi.advanceTimersByTime(300));
    expect(screen.getByText('Parse Error')).toBeTruthy();
    expect(screen.getByTestId('has-document').textContent).toBe('false');

    fireEvent.click(screen.getByRole('button', { name: 'Fix document' }));
    await act(async () => vi.advanceTimersByTime(300));
    expect(screen.queryByText('Parse Error')).toBeNull();
    expect(screen.getByTestId('has-document').textContent).toBe('true');
    vi.useRealTimers();
  });

  it('clears stale error state immediately when loading Basic', async () => {
    vi.useFakeTimers();
    render(
      <DocProvider>
        <DocumentControls />
      </DocProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Break document' }));
    await act(async () => vi.advanceTimersByTime(300));
    expect(screen.getByTestId('parse-error').textContent).not.toBe('');

    fireEvent.click(screen.getByRole('button', { name: 'Load Basic' }));
    expect(screen.getByTestId('parse-error').textContent).toBe('');
    expect(screen.getByTestId('has-document').textContent).toBe('false');

    await act(async () => vi.advanceTimersByTime(300));
    expect(screen.getByTestId('has-document').textContent).toBe('true');
    vi.useRealTimers();
  });
});