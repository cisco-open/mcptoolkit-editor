// Copyright 2026 Cisco Systems, Inc. and its affiliates
//
// SPDX-License-Identifier: Apache-2.0

import { Component, useState, type ReactNode } from 'react';
import { DocProvider, useDoc } from './hooks/useDoc';
import Toolbar from './components/Toolbar';
import Editor from './components/Editor';
import PreviewPanel from './components/preview/PreviewPanel';
import ValidationPanel from './components/ValidationPanel';
import SplitPane from './components/SplitPane';
import MigrationDialog from './components/MigrationDialog';
import MigrationStatus from './components/MigrationStatus';
import ImportDialog from './components/ImportDialog';
import { getImportUrlFromSearch } from './importDocument';

export class PreviewErrorBoundary extends Component<{
  children: ReactNode;
  resetKey: string;
}, { error: Error | null }> {
  state: { error: Error | null } = { error: null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidUpdate(prevProps: { children: ReactNode; resetKey: string }) {
    if (prevProps.resetKey !== this.props.resetKey && this.state.error) {
      this.setState({ error: null });
    }
  }
  render() {
    if (this.state.error) {
      return (
        <div className="flex items-center justify-center h-full bg-white text-gray-400 text-sm px-4">
          <div className="text-center">
            <p className="text-red-500 font-medium mb-2">Render Error</p>
            <p className="font-mono text-xs text-red-400">{this.state.error.message}</p>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function Preview() {
  const { state } = useDoc();
  return (
    <PreviewErrorBoundary resetKey={state.text}>
      <PreviewPanel />
    </PreviewErrorBoundary>
  );
}

export interface EditorOptions {
  title?: string;
}

export interface AppProps {
  options?: EditorOptions;
}

export default function App({ options = {} }: AppProps) {
  const [initialImportUrl] = useState(() => getImportUrlFromSearch(window.location.search));
  const [importOpen, setImportOpen] = useState(() => Boolean(initialImportUrl));

  return (
    <DocProvider>
      <div className="flex flex-col h-screen bg-zinc-950 text-zinc-100">
        <Toolbar title={options.title} onImport={() => setImportOpen(true)} />
        <SplitPane
          left={<Editor />}
          right={(
            <div className="flex h-full flex-col">
              <div className="min-h-0 flex-1">
                <Preview />
              </div>
              <MigrationStatus />
            </div>
          )}
          defaultSplit={50}
        />
        <ValidationPanel />
        <MigrationDialog />
        <ImportDialog
          open={importOpen}
          initialUrl={initialImportUrl}
          onClose={() => setImportOpen(false)}
        />
      </div>
    </DocProvider>
  );
}
