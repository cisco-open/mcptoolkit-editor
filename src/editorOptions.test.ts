import { describe, expect, it } from 'vitest';
import { getEditorOptions } from './editorOptions';

describe('getEditorOptions', () => {
  it('reads a custom title from the root element', () => {
    const rootElement = document.createElement('div');
    rootElement.dataset.title = '{mcpdesc} Editor';

    expect(getEditorOptions(rootElement)).toEqual({ title: '{mcpdesc} Editor' });
  });

  it('reads title link options from the root element', () => {
    const rootElement = document.createElement('div');
    rootElement.dataset.titleUrl = 'https://mcpdesc.org';
    rootElement.dataset.titleUrlTarget = '_blank';
    rootElement.dataset.titleLinkAppearance = 'standard';

    expect(getEditorOptions(rootElement)).toEqual({
      titleUrl: 'https://mcpdesc.org',
      titleUrlTarget: '_blank',
      titleLinkAppearance: 'standard',
    });
  });

  it('uses safe defaults for unknown title link option values', () => {
    const rootElement = document.createElement('div');
    rootElement.dataset.titleUrlTarget = 'popup';
    rootElement.dataset.titleLinkAppearance = 'hidden';

    expect(getEditorOptions(rootElement)).toEqual({});
  });

  it.each([undefined, '', '   '])('uses defaults for a missing or blank title (%s)', (title) => {
    const rootElement = document.createElement('div');
    if (title !== undefined) rootElement.dataset.title = title;

    expect(getEditorOptions(rootElement)).toEqual({});
  });
});