import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Toolbar from '../components/Toolbar';
import MigrationStatus from '../components/MigrationStatus';
import ConversionDialog from '../components/ConversionDialog';
import NativeExportDialog from '../components/NativeExportDialog';
import { parse } from 'yaml';
import { parseMcpDescriptionSource } from '@mcpdesc/core/documents';
import legacyV08Example from '../../examples/migration/minimal.mcpdesc-v0.8.yaml?raw';
import legacyV07Example from '../../examples/migration/minimal.mcpdesc-v0.7.yaml?raw';
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

  it('shows and navigates to the single transport typo finding', () => {
    const reveal = vi.fn();
    function RegisterReveal() {
      const { revealPathRef } = useDoc();
      revealPathRef.current = reveal;
      return null;
    }
    localStorage.setItem('mcptoolkit-editor-content', `mcpdesc: 0.9.0
info:
  name: chess-rating-server
  version: 1.0.0
protocolVersions: [2025-11-25]
transports:
  - type: stdio
    command: chess-rating
    arg: [serve]
`);
    render(<DocProvider><RegisterReveal /><ValidationPanel /></DocProvider>);
    expect(screen.getByTestId('validation-status').textContent).toContain('1 error');
    expect(screen.getByText('Selector: 0.9.0')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Expand findings for mcpdesc.transport.members' }));
    expect(screen.getByText(/^Unexpected member "arg" for type "stdio"\./)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '/transports/0/arg' }));
    expect(reveal).toHaveBeenCalledWith('/transports/0/arg');
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

  it('prompts to migrate a saved 0.8.0 document and keeps it unchanged until Apply', async () => {
    vi.useFakeTimers();
    localStorage.setItem('mcptoolkit-editor-content', legacyV08Example);
    render(<DocProvider><PreviewPanel /><ConversionDialog /><MigrationStatus /><ValidationPanel /><CurrentText /></DocProvider>);
    expect(screen.getByRole('dialog', { name: 'Migrate to MCP Description 0.9.0' })).toBeTruthy();
    expect(screen.getByText('Unsupported version')).toBeTruthy();
    expect(screen.getByTestId('validation-status').textContent).toContain('1 error');
    expect(screen.getByLabelText('Conversion patch').textContent).toContain('/$schema');

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    await act(async () => vi.advanceTimersByTime(300));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByTestId('current-text').textContent).toBe(legacyV08Example);

    fireEvent.click(screen.getByRole('button', { name: 'Migrate to 0.9.0' }));
    fireEvent.click(screen.getByRole('button', { name: 'Apply migration' }));
    await act(async () => vi.advanceTimersByTime(300));
    const migrated = parse(screen.getByTestId('current-text').textContent!);
    expect(migrated).toMatchObject({ mcpdesc: '0.9.0', $schema: 'https://mcpdesc.org/schema/mcp-description/0.9.0.json' });
    expect(screen.queryByText('Unsupported version')).toBeNull();
    expect(screen.getByText('Migrated from 0.8.0 to 0.9.0 successfully')).toBeTruthy();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('prompts again when a 0.8.0 document is imported', async () => {
    vi.useFakeTimers();
    function ImportLegacy() {
      const { importText } = useDoc();
      return <button onClick={() => importText(legacyV08Example)}>Import legacy</button>;
    }
    render(<DocProvider><ImportLegacy /><ConversionDialog /></DocProvider>);
    expect(screen.queryByRole('dialog')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Import legacy' }));
    await act(async () => vi.advanceTimersByTime(300));
    expect(screen.getByRole('dialog', { name: /^Migrate to MCP Description 0\.9\.0/ })).toBeTruthy();
  });

  it('offers migration when selecting the 0.8 example from the toolbar', async () => {
    vi.useFakeTimers();
    render(<DocProvider><Toolbar onImport={() => {}} /><ConversionDialog /><CurrentText /></DocProvider>);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'basic-v0-8' } });
    await act(async () => vi.advanceTimersByTime(300));
    expect(screen.getByTestId('current-text').textContent).toBe(examples.find((example) => example.id === 'basic-v0-8')?.content);
    expect(screen.getByRole('dialog', { name: /^Migrate to MCP Description 0\.9\.0/ })).toBeTruthy();
  });

  it('shows older-version guidance when selecting the 0.7 stdio example', async () => {
    vi.useFakeTimers();
    render(<DocProvider><Toolbar onImport={() => {}} /><PreviewPanel /><ConversionDialog /><CurrentText /></DocProvider>);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'basic-v0-7' } });
    await act(async () => vi.advanceTimersByTime(300));
    expect(screen.getByTestId('current-text').textContent).toBe(legacyV07Example);
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByText(/Use mcptoolkit-editor 2\.2\.2/)).toBeTruthy();
  });

  it.each(['yaml', 'json'] as const)('preserves source field ordering when migrating %s', (format) => {
    const original = parse(legacyV08Example);
    const source = format === 'yaml' ? legacyV08Example : JSON.stringify(original, null, 2);
    localStorage.setItem('mcptoolkit-editor-content', source);
    render(<DocProvider><ConversionDialog /><CurrentText /></DocProvider>);

    fireEvent.click(screen.getByRole('button', { name: 'Apply migration' }));

    const text = screen.getByTestId('current-text').textContent!;
    const converted = format === 'yaml' ? parse(text) : JSON.parse(text);
    const expected = {
      ...original,
      $schema: 'https://mcpdesc.org/schema/mcp-description/0.9.0.json',
      mcpdesc: '0.9.0',
    };
    expect(JSON.stringify(converted)).toBe(JSON.stringify(expected));
  });

  it('normalizes migrated YAML and preserves JSON-style scalar typing', () => {
    localStorage.setItem('mcptoolkit-editor-content', `mcpdesc: 0.8.0
info:
  name: TRUE
  version: 012
protocolVersions:
  - '2025-11-25'
`);
    render(<DocProvider><ConversionDialog /><CurrentText /></DocProvider>);

    fireEvent.click(screen.getByRole('button', { name: 'Apply migration' }));

    const text = screen.getByTestId('current-text').textContent!;
    const parsed = parseMcpDescriptionSource(text);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.value).toMatchObject({ info: { name: 'TRUE', version: '012' } });
    expect(text).toContain('name: "TRUE"');
    expect(text).toContain('version: "012"');
    expect(text.endsWith('\n')).toBe(true);
    expect(text.endsWith('\n\n')).toBe(false);
  });

  it('requires an author-selected fix before applying a blocked conversion', () => {
    const source = JSON.stringify({
      mcpdesc: '0.8.0', info: { name: 'inspect', version: '1' }, protocolVersions: ['2025-11-25'],
      tools: [{ name: 'inspect', inputSchema: { type: 'object' }, annotations: { 'x-tier': 'gold' } }],
    });
    localStorage.setItem('mcptoolkit-editor-content', source);
    render(<DocProvider><ConversionDialog /><CurrentText /></DocProvider>);
    expect(screen.getByRole('button', { name: 'Apply migration' })).toHaveProperty('disabled', true);
    fireEvent.change(screen.getByRole('combobox', { name: 'Fix /tools/0/annotations/x-tier' }), {
      target: { value: 'remove-property' },
    });
    expect(screen.getByRole('button', { name: 'Apply migration' })).toHaveProperty('disabled', false);
    expect(screen.getByTestId('current-text').textContent).toBe(source);
    fireEvent.click(screen.getByRole('button', { name: 'Apply migration' }));
    expect(parse(screen.getByTestId('current-text').textContent!).tools[0].annotations).toEqual({});
  });

  it('lists 0.8.0 problems that prevent migrating an invalid source', () => {
    const reveal = vi.fn();
    function RegisterReveal() {
      const { revealPathRef } = useDoc();
      revealPathRef.current = reveal;
      return null;
    }
    localStorage.setItem('mcptoolkit-editor-content', `mcpdesc: 0.8.0
info:
  name: inspect
  version: '1'
protocolVersions: [2025-11-25]
transports:
  - type: stdio
    arg: [serve]
`);
    render(<DocProvider><RegisterReveal /><ConversionDialog /></DocProvider>);
    expect(screen.getByRole('heading', { name: /0\.8\.0 problems? before migrating$/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Apply migration' })).toHaveProperty('disabled', true);
    fireEvent.click(screen.getAllByRole('button', { name: /^\/transports\/0/ })[0]);
    expect(reveal).toHaveBeenCalledWith(expect.stringMatching(/^\/transports\/0/));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('points 0.7.0 documents to the last 0.8 editor release without prompting', () => {
    localStorage.setItem('mcptoolkit-editor-content', legacyV07Example);
    render(<DocProvider><PreviewPanel /><ConversionDialog /></DocProvider>);
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByText(/Use mcptoolkit-editor 2\.2\.2/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Migrate to 0.9.0' })).toBeNull();
  });

  it('converts the latest source even before debounced parsing has run', () => {
    vi.useFakeTimers();
    function ImmediateEdit() {
      const { setText, requestConversion } = useDoc();
      return <>
        <button onClick={() => setText(JSON.stringify({
          mcpdesc: '0.8.0', info: { name: 'newest-source', version: '1' }, protocolVersions: ['2025-11-25'],
        }))}>Replace source</button>
        <button onClick={requestConversion}>Request migration</button>
      </>;
    }
    render(<DocProvider><ConversionDialog /><ImmediateEdit /><CurrentText /></DocProvider>);
    fireEvent.click(screen.getByRole('button', { name: 'Replace source' }));
    fireEvent.click(screen.getByRole('button', { name: 'Request migration' }));
    fireEvent.click(screen.getByRole('button', { name: 'Apply migration' }));
    const text = screen.getByTestId('current-text').textContent!;
    expect(text.startsWith('{')).toBe(true);
    expect(JSON.parse(text).info.name).toBe('newest-source');
  });

  it('previews and exports native MCP values with protocol scoping and without description-only fields', async () => {
    const { blobs, filenames } = captureDownloads();
    localStorage.setItem('mcptoolkit-editor-content', JSON.stringify({
      mcpdesc: '0.9.0', $schema: 'https://mcpdesc.org/schema/mcp-description/0.9.0.json',
      info: { name: 'inspect', version: '1' }, protocolVersions: ['2025-11-25', '2026-07-28'],
      tools: [
        { _meta: { tier: 'gold' }, inputSchema: { type: 'object' }, name: 'inspect', 'x-tier': 'gold' },
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
    expect(Object.keys(nativeValues()[0])).toEqual(['name', 'inputSchema', '_meta']);
    fireEvent.change(screen.getByRole('combobox', { name: 'Native protocol version' }), { target: { value: '2026-07-28' } });
    expect(nativeValues()).toHaveLength(2);
    fireEvent.change(screen.getByRole('combobox', { name: 'Native declaration' }), { target: { value: 'new-tool' } });
    expect(nativeValues()).toEqual({ name: 'new-tool', inputSchema: { type: 'object' } });
    expect(screen.getByTestId('current-text').textContent).toContain('x-tier');
    const expected = nativeValues();
    const preview = screen.getByLabelText('Native MCP JSON').textContent;
    fireEvent.click(screen.getByRole('button', { name: 'Download JSON' }));
    expect(filenames).toEqual(['inspect.mcp.tool.new-tool.2026-07-28.json']);
    const exported = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.readAsText(blobs[0]);
    });
    expect(JSON.parse(exported)).toEqual(expected);
    expect(exported).toBe(preview);
  });

  it('shows the native extensions warning once and keeps download and navigation available', () => {
    localStorage.setItem('mcptoolkit-editor-content', JSON.stringify({
      mcpdesc: '0.9.0', info: { name: 'Miro MCP', version: '3.4.6' }, protocolVersions: ['2025-11-25'],
      capabilities: [{ tools: { listChanged: true }, extensions: { 'io.modelcontextprotocol/ui': {} } }],
      tools: [{ name: 'preview_resource_poll', inputSchema: { type: 'object' } }],
    }));
    render(<DocProvider><Toolbar onImport={() => {}} /><NativeExportDialog /></DocProvider>);
    fireEvent.click(screen.getByRole('button', { name: 'Export' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Native MCP' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Tools' }));
    expect(screen.getAllByText('mcp.capabilities.extensions.protocol-version')).toHaveLength(1);
    expect(screen.getAllByText(/preserves a deployed pre-standard extension negotiation convention/)).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Download JSON' })).toHaveProperty('disabled', false);
    expect(JSON.parse(screen.getByLabelText('Native MCP JSON').textContent!))
      .toEqual([{ name: 'preview_resource_poll', inputSchema: { type: 'object' } }]);
    fireEvent.click(screen.getByRole('button', { name: '/capabilities/0/extensions' }));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('keeps document exports behind one keyboard-accessible menu', () => {
    const { filenames, blobs } = captureDownloads();
    render(<DocProvider><Toolbar onImport={() => {}} /></DocProvider>);
    const trigger = screen.getByRole('button', { name: 'Export' });
    fireEvent.keyDown(trigger, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(screen.getByRole('menuitem', { name: 'YAML' }));
    expect(screen.getByRole('menuitem', { name: 'Native MCP' })).toHaveProperty('disabled', false);
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
    localStorage.setItem('mcptoolkit-editor-content', httpExample);
    render(<DocProvider><PreviewPanel /><NativeExportDialog /></DocProvider>);
    const collectionAction = screen.getByRole('button', { name: `Export native ${label}` });
    const section = collectionAction.closest('details')!;
    expect(section.open).toBe(true);
    fireEvent.click(collectionAction);
    expect(section.open).toBe(true);
    expect(JSON.parse(screen.getByLabelText('Native MCP JSON').textContent!)).toHaveLength(doc[collection].length);
    expect(screen.getByLabelText('Export filename').textContent).toBe(`chess-coach.mcp.${collection}.2025-11-25.json`);
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    const entryAction = screen.getByRole('button', { name: `Export native ${identifier}` });
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
    fireEvent.click(screen.getAllByRole('button', { name: 'Export native inspect' })[1]);
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