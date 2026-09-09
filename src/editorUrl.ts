export type EditorUrlSource =
  | { type: 'example'; id: string }
  | { type: 'url'; value: string }
  | { type: 'document' };

export function replaceEditorUrlSource(source: EditorUrlSource): void {
  try {
    const url = new URL(window.location.href);
    url.searchParams.delete('example');
    url.searchParams.delete('url');

    if (source.type === 'example') {
      url.searchParams.set('example', source.id);
    } else if (source.type === 'url') {
      url.searchParams.set('url', source.value);
    }

    window.history.replaceState(window.history.state, '', url);
  } catch {
    // URL synchronization is optional in restricted or sandboxed browser contexts.
  }
}