import type { EditorOptions } from './App';

export function getEditorOptions(rootElement: HTMLElement): EditorOptions {
  const title = rootElement.dataset.title?.trim();
  const titleUrl = rootElement.dataset.titleUrl?.trim();
  const titleUrlTarget = rootElement.dataset.titleUrlTarget === '_blank' ? '_blank' : undefined;
  const titleLinkAppearance = rootElement.dataset.titleLinkAppearance === 'standard'
    ? 'standard'
    : undefined;

  return {
    ...(title ? { title } : {}),
    ...(titleUrl ? { titleUrl } : {}),
    ...(titleUrlTarget ? { titleUrlTarget } : {}),
    ...(titleLinkAppearance ? { titleLinkAppearance } : {}),
  };
}