import { render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import Editor from './Editor';

const mocks = vi.hoisted(() => {
  const editorInstance = {
    createDecorationsCollection: vi.fn(() => ({ clear: vi.fn() })),
    focus: vi.fn(),
    getModel: vi.fn(() => null),
    getValue: vi.fn(() => ''),
    setScrollTop: vi.fn(),
    updateOptions: vi.fn(),
  };
  const monacoInstance = {
    editor: { setModelMarkers: vi.fn() },
    languages: {
      json: { jsonDefaults: { setDiagnosticsOptions: vi.fn() } },
      registerDefinitionProvider: vi.fn(() => ({ dispose: vi.fn() })),
    },
  };
  const docContext = {
    state: {
      documentLoadRevision: 0,
      format: 'yaml',
      text: '',
      validation: { errors: [], warnings: [] },
    },
    setText: vi.fn(),
    revealPathRef: { current: null },
    revealSectionItemRef: { current: null },
  };
  return { docContext, editorInstance, monacoInstance };
});

vi.mock('../hooks/useDoc', () => ({
  useDoc: () => mocks.docContext,
}));

vi.mock('@monaco-editor/react', async () => {
  const React = await import('react');
  function MockMonacoEditor({ onMount }: {
    onMount: (editor: typeof mocks.editorInstance, monaco: typeof mocks.monacoInstance) => void;
  }) {
    React.useEffect(() => {
      onMount(mocks.editorInstance, mocks.monacoInstance);
    }, [onMount]);
    return React.createElement('div');
  }

  return {
    default: MockMonacoEditor,
  };
});

describe('Editor document loading', () => {
  afterEach(() => {
    mocks.docContext.state.documentLoadRevision = 0;
    vi.clearAllMocks();
  });

  it('scrolls Monaco to the top when a new document is loaded', () => {
    const view = render(<Editor />);

    expect(mocks.editorInstance.setScrollTop).not.toHaveBeenCalled();

    mocks.docContext.state.documentLoadRevision = 1;
    view.rerender(<Editor />);

    expect(mocks.editorInstance.setScrollTop).toHaveBeenCalledOnce();
    expect(mocks.editorInstance.setScrollTop).toHaveBeenCalledWith(0);
  });
});