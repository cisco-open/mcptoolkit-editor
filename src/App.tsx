// Copyright 2026 Cisco Systems, Inc. and its affiliates
//
// SPDX-License-Identifier: Apache-2.0

import { Component, type ReactNode } from 'react';
import { DocProvider } from './hooks/useDoc';
import Toolbar from './components/Toolbar';
import Editor from './components/Editor';
import PreviewPanel from './components/preview/PreviewPanel';
import ValidationPanel from './components/ValidationPanel';
import SplitPane from './components/SplitPane';

class PreviewErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state: { error: Error | null } = { error: null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidUpdate(prevProps: { children: ReactNode }) {
    if (prevProps.children !== this.props.children && this.state.error) {
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

export default function App() {
  return (
    <DocProvider>
      <div className="flex flex-col h-screen bg-zinc-950 text-zinc-100">
        <Toolbar />
        <SplitPane
          left={<Editor />}
          right={<PreviewErrorBoundary><PreviewPanel /></PreviewErrorBoundary>}
          defaultSplit={50}
        />
        <ValidationPanel />
      </div>
    </DocProvider>
  );
}
