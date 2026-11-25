// Copyright 2026 Cisco Systems, Inc. and its affiliates
//
// SPDX-License-Identifier: Apache-2.0

/**
 * mcptoolkit-viewer — Main entry point.
 *
 * Drop-in script that renders an interactive MCP Description card view.
 * Usage:
 *   McpToolkitViewer({ dom_id: '#mcpdesc', url: '/api/spec.yaml' })
 */

import React, { useState, useEffect } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { McpDescValidator, unsupportedFormatMessage } from '@core/validator';
import { McpDescCardView } from './McpDescCardView';
import { parseYaml } from './parseYaml';
import { ValidationPanel } from './ValidationPanel';
import type { McpToolkitViewerOptions, McpToolkitViewerInstance } from './types';
import type { McpDescDocument, ValidationResult } from '@core/types';
import './styles.css';

// Shared validator instance; validates MCP Description 0.9.0 only.
const validator = new McpDescValidator();

/** Parse a raw string as JSON or YAML, returning the document object */
function parseSpec(raw: string): McpDescDocument {
  const trimmed = raw.trimStart();
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    return JSON.parse(raw) as McpDescDocument;
  }
  return parseYaml(raw) as McpDescDocument;
}

/** Fetch a spec from a URL */
async function fetchSpec(url: string): Promise<McpDescDocument> {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Failed to fetch ${url}: ${resp.status} ${resp.statusText}`);
  const text = await resp.text();
  return parseSpec(text);
}

function getPublicDocumentUrl(value?: string): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' ? url.href : null;
  } catch {
    return null;
  }
}

async function downloadPublicDocument(url: string): Promise<void> {
  const response = await fetch(url, { credentials: 'omit', referrerPolicy: 'no-referrer' });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);

  const objectUrl = URL.createObjectURL(await response.blob());
  const link = document.createElement('a');
  link.href = objectUrl;
  const filename = new URL(url).pathname.split('/').filter(Boolean).pop();
  link.download = filename ? decodeURIComponent(filename) : 'mcpdesc.yaml';
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}

function getEditorUrl(publicUrl: string): string {
  const url = new URL('https://editor.mcpdesc.org/');
  url.searchParams.set('url', publicUrl);
  return url.href;
}

// ============================================================================
// Internal React app
// ============================================================================

interface AppProps {
  initialDoc: McpDescDocument | null;
  initialError: string | null;
  options: McpToolkitViewerOptions;
  /** Ref for external control — set by the app so the imperative API can call into React state */
  controlRef: React.MutableRefObject<{
    setDoc: (doc: McpDescDocument) => void;
  } | null>;
}

function App({ initialDoc, initialError, options, controlRef }: AppProps) {
  const [doc, setDoc] = useState<McpDescDocument | null>(initialDoc);
  const [error, setError] = useState<string | null>(initialError);
  const [validation, setValidation] = useState<ValidationResult | null>(null);

  const theme = options.theme ?? 'light';
  const defaultOpen = options.defaultOpen ?? true;
  const showValidation = options.showValidation ?? true;
  const publicUrl = getPublicDocumentUrl(options.publicUrl);

  // Sync props when parent re-renders with new initialDoc/initialError
  useEffect(() => {
    setDoc(initialDoc);
    setError(initialError);
  }, [initialDoc, initialError]);

  // Validate whenever doc changes
  useEffect(() => {
    if (!doc) {
      setValidation(null);
      return;
    }
    const result = validator.validateDocument(doc);
    if (result.errors.length > 0 || result.warnings.length > 0) {
      console.warn(
        `mcptoolkit-viewer: MCP Description ${doc.mcpdesc} has validation issues; rendering continues.`,
        result,
      );
    }
    setValidation(result);
  }, [doc]);

  // Expose setDoc for imperative API
  useEffect(() => {
    controlRef.current = { setDoc };
  }, [controlRef]);

  const bgClass = theme === 'dark' ? 'bg-zinc-900 text-zinc-100' : 'bg-white text-gray-900';

  if (error) {
    return (
      <div className={`p-4 ${bgClass} min-h-[100px]`}>
        <div className="text-red-600 text-sm font-mono">{error}</div>
      </div>
    );
  }

  if (!doc) {
    return (
      <div className={`p-4 ${bgClass} min-h-[100px]`}>
        <div className="text-gray-400 text-sm">Loading...</div>
      </div>
    );
  }

  const unsupported = unsupportedFormatMessage(doc.mcpdesc);
  if (unsupported) {
    return (
      <div className={`p-4 ${bgClass} min-h-[100px]`}>
        <div role="alert" className="text-red-600 text-sm">{unsupported}</div>
      </div>
    );
  }

  const headerActions = publicUrl ? (
    <>
      <button
        type="button"
        className="inline-flex min-h-9 items-center rounded border border-gray-300 bg-white px-3 text-sm font-medium text-gray-700 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        onClick={() => {
          void downloadPublicDocument(publicUrl).catch((downloadError: unknown) => {
            console.error('mcptoolkit-viewer: unable to download the public document.', downloadError);
          });
        }}
      >
        Download
      </button>
      <a
        className="inline-flex min-h-9 items-center rounded border border-gray-300 bg-white px-3 text-sm font-medium text-gray-700 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        href={getEditorUrl(publicUrl)}
        target="_blank"
        rel="noopener noreferrer"
      >
        Edit
      </a>
    </>
  ) : undefined;

  return (
    <div className={`flex flex-col h-full ${bgClass}`}>
      <div className="flex-1 overflow-y-auto p-4">
        <McpDescCardView
          doc={doc}
          validation={validation ?? undefined}
          headerActions={headerActions}
          defaultOpen={defaultOpen}
          exampleDisplay={options.exampleDisplay}
          onExampleSelect={options.onExampleSelect}
        />
      </div>
      {showValidation && validation && (
        <ValidationPanel
          validation={validation}
          visible={validation.errors.length > 0 || validation.warnings.length > 0}
        />
      )}
    </div>
  );
}

// ============================================================================
// Public API
// ============================================================================

export function McpToolkitViewer(options: McpToolkitViewerOptions): McpToolkitViewerInstance {
  if (options.publicUrl && !getPublicDocumentUrl(options.publicUrl)) {
    console.warn('mcptoolkit-viewer: publicUrl must be an absolute HTTPS URL; Download and Edit actions are disabled.');
  }

  const container = document.querySelector(options.dom_id);
  if (!container) {
    throw new Error(`mcptoolkit-viewer: element not found: ${options.dom_id}`);
  }

  // Add scoping root class
  container.classList.add('mcptoolkit-viewer-root');

  const controlRef: React.MutableRefObject<{ setDoc: (doc: McpDescDocument) => void } | null> = { current: null };
  let root: Root | null = null;

  function render(doc: McpDescDocument | null, error: string | null) {
    if (!root) {
      root = createRoot(container!);
    }
    root.render(
      React.createElement(App, {
        initialDoc: doc,
        initialError: error,
        options,
        controlRef,
      })
    );
  }

  // Initial render
  if (options.spec) {
    render(options.spec, null);
  } else if (options.url) {
    // Show loading state, then fetch
    render(null, null);
    fetchSpec(options.url)
      .then((doc) => render(doc, null))
      .catch((err) => render(null, String(err)));
  } else {
    render(null, 'mcptoolkit-viewer: provide either "spec" or "url" option');
  }

  return {
    updateSpec(spec: McpDescDocument) {
      if (controlRef.current) {
        controlRef.current.setDoc(spec);
      } else {
        render(spec, null);
      }
    },

    async reload() {
      if (!options.url) {
        throw new Error('mcptoolkit-viewer: cannot reload — no "url" option configured');
      }
      try {
        const doc = await fetchSpec(options.url);
        if (controlRef.current) {
          controlRef.current.setDoc(doc);
        } else {
          render(doc, null);
        }
      } catch (err) {
        render(null, String(err));
      }
    },

    destroy() {
      if (root) {
        root.unmount();
        root = null;
      }
      container.classList.remove('mcptoolkit-viewer-root');
    },
  };
}

// Package version
export const version = '3.1.0';

// Re-export for consumers
export { McpDescCardView } from './McpDescCardView';
export type { McpDescCardViewProps, BadgeRenderer } from './McpDescCardView';
// Exposed on the UMD global so the standalone demo can parse its menu config.
// eslint-disable-next-line react-refresh/only-export-components
export { parseYaml } from './parseYaml';
export { ValidationPanel } from './ValidationPanel';
export type { ValidationPanelProps } from './ValidationPanel';
export type { McpToolkitViewerOptions, McpToolkitViewerInstance } from './types';
export type {
  McpDescDocument,
  ValidationResult,
  ValidationIssue,
} from '@core/types';
