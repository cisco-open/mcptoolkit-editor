import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import Toolbar from '../components/Toolbar';
import { examples } from '../examples';
import { DocProvider, useDoc } from './useDoc';

function CurrentText() {
  const { state } = useDoc();
  return <output data-testid="current-text">{state.text}</output>;
}

function EditDocument() {
  const { setText } = useDoc();
  return <button onClick={() => setText('edited content')}>Edit document</button>;
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
});