import type { EditorOptions } from './App';

export function getEditorOptions(rootElement: HTMLElement): EditorOptions {
  const title = rootElement.dataset.title?.trim();
  return title ? { title } : {};
}