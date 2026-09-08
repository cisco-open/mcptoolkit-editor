import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import Toolbar from '../components/Toolbar';
import { examples } from '../examples';
import { DocProvider, useDoc } from './useDoc';

function CurrentText() {
  const { state } = useDoc();
  return <output data-testid="current-text">{state.text}</output>;
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
        <Toolbar />
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
        <Toolbar />
        <CurrentText />
      </DocProvider>,
    );

    expect(screen.getByRole('combobox')).toHaveProperty('value', '');
    expect(screen.getByTestId('current-text').textContent).toBe('saved content');
  });
});