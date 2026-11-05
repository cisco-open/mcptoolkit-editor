import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Toolbar from '../components/Toolbar';
import ConversionDialog from '../components/ConversionDialog';
import NativeExportDialog from '../components/NativeExportDialog';
import { parse } from 'yaml';
import httpExample from '../../examples/features/http-server.yaml?raw';
import ValidationPanel from '../components/ValidationPanel';
import PreviewPanel from '../components/preview/PreviewPanel';
import { defaultExample, examples } from '../examples';
import { DocProvider, useDoc } from './useDoc';

function CurrentText() {
  const { state } = useDoc();
  return <output data-testid="current-text">{state.text}</output>;
}

function captureDownloads() {
  const blobs: Blob[] = [];
  const filenames: string[] = [];
  vi.stubGlobal('URL', class extends URL {
    static createObjectURL(blob: Blob) { blobs.push(blob); return 'blob:export-test'; }
    static revokeObjectURL = vi.fn();
  });
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
    filenames.push(this.download);
  });
  return { blobs, filenames };
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
    Object.defineProperties(HTMLDialogElement.prototype, {
      showModal: { configurable: true, value: function (this: HTMLDialogElement) { this.open = true; } },
      close: { configurable: true, value: function (this: HTMLDialogElement) { this.open = false; } },
    });
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    Reflect.deleteProperty(HTMLDialogElement.prototype, 'showModal');
    Reflect.deleteProperty(HTMLDialogElement.prototype, 'close');
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

  it('reviews migration without changing the source and retains the RC schema after Apply', async () => {
    vi.useFakeTimers();
    render(<DocProvider><Toolbar onImport={() => {}} /><ConversionDialog /><CurrentText /></DocProvider>);
    fireEvent.click(screen.getByRole('button', { name: 'Migrate to 0.9 RC.1' }));
    expect(screen.getByTestId('current-text').textContent).toBe(defaultExample);
    expect(screen.getByLabelText('Conversion patch').textContent).toContain('/$schema');
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.getByTestId('current-text').textContent).toBe(defaultExample);
    fireEvent.click(screen.getByRole('button', { name: 'Migrate to 0.9 RC.1' }));
    fireEvent.click(screen.getByRole('button', { name: 'Apply migration' }));
    await act(async () => vi.advanceTimersByTime(300));
    const migrated = parse(screen.getByTestId('current-text').textContent!);
    expect(migrated.mcpdesc).toBe('0.9.0');
    expect(migrated.$schema).toBe('https://mcpdesc.org/schema/mcp-description/0.9.0-rc.1.json');
    expect(screen.queryByRole('button', { name: 'Migrate to 0.9 RC.1' })).toBeNull();
  });

  it.each(['yaml', 'json'] as const)('preserves HTTP example field ordering when converting %s', (format) => {
    const original = parse(httpExample);
    const source = format === 'yaml' ? httpExample : JSON.stringify(original, null, 2);
    localStorage.setItem('mcptoolkit-editor-content', source);
    render(<DocProvider><Toolbar onImport={() => {}} /><ConversionDialog /><CurrentText /></DocProvider>);

    fireEvent.click(screen.getByRole('button', { name: 'Migrate to 0.9 RC.1' }));
    fireEvent.click(screen.getByRole('button', { name: 'Apply migration' }));

    const text = screen.getByTestId('current-text').textContent!;
    const converted = format === 'yaml' ? parse(text) : JSON.parse(text);
    const expected = {
      ...original,
      $schema: 'https://mcpdesc.org/schema/mcp-description/0.9.0-rc.1.json',
      mcpdesc: '0.9.0',
    };
    expect(JSON.stringify(converted)).toBe(JSON.stringify(expected));
  });

  it('requires an author-selected fix before applying a blocked conversion', () => {
    const source = JSON.stringify({
      mcpdesc: '0.8.0', info: { name: 'inspect', version: '1' }, protocolVersions: ['2025-11-25'],
      tools: [{ name: 'inspect', inputSchema: { type: 'object' }, annotations: { 'x-tier': 'gold' } }],
    });
    localStorage.setItem('mcptoolkit-editor-content', source);
    render(<DocProvider><Toolbar onImport={() => {}} /><ConversionDialog /><CurrentText /></DocProvider>);
    fireEvent.click(screen.getByRole('button', { name: 'Migrate to 0.9 RC.1' }));
    expect(screen.getByRole('button', { name: 'Apply migration' })).toHaveProperty('disabled', true);
    fireEvent.change(screen.getByRole('combobox', { name: 'Fix /tools/0/annotations/x-tier' }), {
      target: { value: 'remove-property' },
    });
    expect(screen.getByRole('button', { name: 'Apply migration' })).toHaveProperty('disabled', false);
    expect(screen.getByTestId('current-text').textContent).toBe(source);
    fireEvent.click(screen.getByRole('button', { name: 'Apply migration' }));
    expect(parse(screen.getByTestId('current-text').textContent!).tools[0].annotations).toEqual({});
  });

  it('converts the latest source even before debounced parsing has run', () => {
    vi.useFakeTimers();
    function ImmediateEdit() {
      const { setText } = useDoc();
      return <button onClick={() => setText(JSON.stringify({
        mcpdesc: '0.8.0', info: { name: 'newest-source', version: '1' }, protocolVersions: ['2025-11-25'],
      }))}>Replace source</button>;
    }
    render(<DocProvider><Toolbar onImport={() => {}} /><ConversionDialog /><ImmediateEdit /><CurrentText /></DocProvider>);
    fireEvent.click(screen.getByRole('button', { name: 'Replace source' }));
    fireEvent.click(screen.getByRole('button', { name: 'Migrate to 0.9 RC.1' }));
    fireEvent.click(screen.getByRole('button', { name: 'Apply migration' }));
    const text = screen.getByTestId('current-text').textContent!;
    expect(text.startsWith('{')).toBe(true);
    expect(JSON.parse(text).info.name).toBe('newest-source');
  });

  it('previews and exports native MCP values with protocol scoping and without description-only fields', async () => {
    const { blobs, filenames } = captureDownloads();
    localStorage.setItem('mcptoolkit-editor-content', JSON.stringify({
      mcpdesc: '0.9.0', $schema: 'https://mcpdesc.org/schema/mcp-description/0.9.0-rc.1.json',
      info: { name: 'inspect', version: '1' }, protocolVersions: ['2025-11-25', '2026-07-28'],
      tools: [
        { name: 'inspect', inputSchema: { type: 'object' }, 'x-tier': 'gold', _meta: { tier: 'gold' } },
        { name: 'new-tool', inputSchema: { type: 'object' }, protocolVersions: ['2026-07-28'] },
      ],
    }));
    render(<DocProvider><Toolbar onImport={() => {}} /><PreviewPanel /><NativeExportDialog /><CurrentText /></DocProvider>);
    expect(screen.queryByRole('tab')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Export' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Native MCP' }));
    expect(screen.getByRole('menuitem', { name: 'Capabilities' })).toHaveProperty('disabled', true);
    fireEvent.click(screen.getByRole('menuitem', { name: 'Tools' }));
    expect(screen.getByRole('button', { name: 'Download JSON' })).toHaveProperty('disabled', true);
    fireEvent.change(screen.getByRole('combobox', { name: 'Native protocol version' }), { target: { value: '2025-11-25' } });
    const nativeValues = () => JSON.parse(screen.getByLabelText('Native MCP JSON').textContent!);
    expect(nativeValues()).toEqual([{ name: 'inspect', inputSchema: { type: 'object' }, _meta: { tier: 'gold' } }]);
    fireEvent.change(screen.getByRole('combobox', { name: 'Native protocol version' }), { target: { value: '2026-07-28' } });
    expect(nativeValues()).toHaveLength(2);
    fireEvent.change(screen.getByRole('combobox', { name: 'Native declaration' }), { target: { value: 'new-tool' } });
    expect(nativeValues()).toEqual({ name: 'new-tool', inputSchema: { type: 'object' } });
    expect(screen.getByTestId('current-text').textContent).toContain('x-tier');
    const expected = nativeValues();
    fireEvent.click(screen.getByRole('button', { name: 'Download JSON' }));
    expect(filenames).toEqual(['inspect.mcp.tool.new-tool.2026-07-28.json']);
    const exported = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.readAsText(blobs[0]);
    });
    expect(JSON.parse(exported)).toEqual(expected);
  });

  it('keeps document exports behind one keyboard-accessible menu', () => {
    const { filenames, blobs } = captureDownloads();
    render(<DocProvider><Toolbar onImport={() => {}} /></DocProvider>);
    const trigger = screen.getByRole('button', { name: 'Export' });
    fireEvent.keyDown(trigger, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(screen.getByRole('menuitem', { name: 'YAML' }));
    expect(screen.getByRole('menuitem', { name: 'Native MCP' })).toHaveProperty('disabled', true);
    fireEvent.keyDown(document.activeElement!, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(screen.getByRole('menuitem', { name: 'JSON' }));
    fireEvent.keyDown(document.activeElement!, { key: 'Escape' });
    expect(screen.queryByRole('menu')).toBeNull();
    expect(document.activeElement).toBe(trigger);
    for (const format of ['YAML', 'JSON', 'Markdown']) {
      fireEvent.click(trigger);
      fireEvent.click(screen.getByRole('menuitem', { name: format }));
      expect(screen.queryByRole('menu')).toBeNull();
    }
    const name = parse(defaultExample).info.name;
    expect(filenames).toEqual([`${name}.mcpdesc.yaml`, `${name}.mcpdesc.json`, `${name}.md`]);
    expect(blobs.map((blob) => blob.type)).toEqual(['text/yaml', 'application/json', 'text/markdown']);
    fireEvent.click(trigger);
    fireEvent.pointerDown(document.body);
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it.each([
    { label: 'Tools', identifier: 'analyze_game', collection: 'tools', kind: 'tool' },
    { label: 'Resources', identifier: 'chess://leaderboard/classical', collection: 'resources', kind: 'resource' },
    { label: 'Resource Templates', identifier: 'chess://games/{game_id}', collection: 'resourceTemplates', kind: 'resourceTemplate' },
    { label: 'Prompts', identifier: 'game_summary', collection: 'prompts', kind: 'prompt' },
  ])('opens collection and individual native exports from $label without collapsing cards', ({ label, identifier, collection, kind }) => {
    const doc = parse(httpExample);
    doc.mcpdesc = '0.9.0';
    doc.$schema = 'https://mcpdesc.org/schema/mcp-description/0.9.0-rc.1.json';
    localStorage.setItem('mcptoolkit-editor-content', JSON.stringify(doc));
    render(<DocProvider><PreviewPanel /><NativeExportDialog /></DocProvider>);
    const collectionAction = screen.getByRole('button', { name: `Export native ${label}`, exact: true });
    const section = collectionAction.closest('details')!;
    expect(section.open).toBe(true);
    fireEvent.click(collectionAction);
    expect(section.open).toBe(true);
    expect(JSON.parse(screen.getByLabelText('Native MCP JSON').textContent!)).toHaveLength(doc[collection].length);
    expect(screen.getByLabelText('Export filename').textContent).toBe(`chess-coach.mcp.${collection}.2025-11-25.json`);
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    const entryAction = screen.getByRole('button', { name: `Export native ${identifier}`, exact: true });
    const entry = entryAction.closest('details')!;
    fireEvent.click(entryAction);
    expect(entry.open).toBe(true);
    expect(screen.getByRole('combobox', { name: 'Native declaration' })).toHaveProperty('value', identifier);
    const value = JSON.parse(screen.getByLabelText('Native MCP JSON').textContent!);
    expect(Array.isArray(value)).toBe(false);
    expect(screen.getByLabelText('Export filename').textContent).toContain(`.mcp.${kind}.`);
  });

  it('uses the clicked declaration variant rather than another entry with the same name', () => {
    localStorage.setItem('mcptoolkit-editor-content', JSON.stringify({
      mcpdesc: '0.9.0', info: { name: 'scoped', version: '1' }, protocolVersions: ['2025-11-25', '2026-07-28'],
      tools: [
        { name: 'inspect', protocolVersions: ['2025-11-25'], inputSchema: { type: 'object' }, description: 'Old variant' },
        { name: 'inspect', protocolVersions: ['2026-07-28'], inputSchema: { type: 'object' }, description: 'New variant' },
      ],
    }));
    render(<DocProvider><PreviewPanel /><NativeExportDialog /></DocProvider>);
    fireEvent.click(screen.getAllByRole('button', { name: 'Export native inspect', exact: true })[1]);
    expect(screen.getByRole('combobox', { name: 'Native protocol version' })).toHaveProperty('value', '2026-07-28');
    expect(JSON.parse(screen.getByLabelText('Native MCP JSON').textContent!).description).toBe('New variant');
  });

  it('blocks native export when projection fails and retains diagnostic navigation', () => {
    localStorage.setItem('mcptoolkit-editor-content', JSON.stringify({
      mcpdesc: '0.9.0', info: { name: 'invalid-native', version: '1' }, protocolVersions: ['2025-11-25'],
      tools: [{ name: 'inspect', inputSchema: { type: 'object', properties: { flag: true } } }],
    }));
    render(<DocProvider><Toolbar onImport={() => {}} /><NativeExportDialog /></DocProvider>);
    fireEvent.click(screen.getByRole('button', { name: 'Export' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Native MCP' }));
    fireEvent.keyDown(screen.getByRole('menuitem', { name: 'Native MCP' }), { key: 'ArrowRight' });
    expect(document.activeElement).toBe(screen.getByRole('menuitem', { name: 'Tools' }));
    fireEvent.keyDown(document.activeElement!, { key: 'ArrowLeft' });
    expect(document.activeElement).toBe(screen.getByRole('menuitem', { name: 'Native MCP' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Native MCP' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Tools' }));
    expect(screen.getByRole('button', { name: 'Download JSON' })).toHaveProperty('disabled', true);
    expect(screen.queryByLabelText('Native MCP JSON')).toBeNull();
    expect(screen.getAllByRole('button', { name: '/tools/0/inputSchema/properties/flag' }).length).toBeGreaterThan(0);
  });
});