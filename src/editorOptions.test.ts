import { describe, expect, it } from 'vitest';
import { getEditorOptions } from './editorOptions';

describe('getEditorOptions', () => {
  it('reads a custom title from the root element', () => {
    const rootElement = document.createElement('div');
    rootElement.dataset.title = '{mcpdesc} Editor';

    expect(getEditorOptions(rootElement)).toEqual({ title: '{mcpdesc} Editor' });
  });

  it.each([undefined, '', '   '])('uses defaults for a missing or blank title (%s)', (title) => {
    const rootElement = document.createElement('div');
    if (title !== undefined) rootElement.dataset.title = title;

    expect(getEditorOptions(rootElement)).toEqual({});
  });
});