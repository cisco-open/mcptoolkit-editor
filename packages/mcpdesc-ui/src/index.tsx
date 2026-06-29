/**
 * mcpdesc-ui — Main entry point.
 *
 * Drop-in script that renders an interactive MCP Description card view.
 * Usage:
 *   McpDescUI({ dom_id: '#mcpdesc', url: '/api/spec.yaml' })
 */

import React, { useState, useEffect } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import yaml from 'yaml';
import { McpDescValidator } from '@core/validator';
import mcpdescSchema from '@core/mcpdesc-schema.json';
import { McpDescCardView } from './McpDescCardView';
import { ValidationPanel } from './ValidationPanel';
import type { McpDescUIOptions, McpDescUIInstance } from './types';
import type { McpDescDocument, ValidationResult } from '@core/types';
import './styles.css';

// Shared validator instance — schema loaded once
const validator = new McpDescValidator();
validator.loadSchema(mcpdescSchema as Record<string, unknown>);

/** Parse a raw string as JSON or YAML, returning the document object */
function parseSpec(raw: string): McpDescDocument {
  const trimmed = raw.trimStart();
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    return JSON.parse(raw) as McpDescDocument;
  }
  return yaml.parse(raw) as McpDescDocument;
}

/** Fetch a spec from a URL */
async function fetchSpec(url: string): Promise<McpDescDocument> {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Failed to fetch ${url}: ${resp.status} ${resp.statusText}`);
  const text = await resp.text();
  return parseSpec(text);
}

// ============================================================================
// Internal React app
// ============================================================================

interface AppProps {
  initialDoc: McpDescDocument | null;
  initialError: string | null;
  options: McpDescUIOptions;
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

  return (
    <div className={`flex flex-col h-full ${bgClass}`}>
      <div className="flex-1 overflow-y-auto p-4">
        <McpDescCardView doc={doc} validation={validation ?? undefined} defaultOpen={defaultOpen} />
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

export function McpDescUI(options: McpDescUIOptions): McpDescUIInstance {
  const container = document.querySelector(options.dom_id);
  if (!container) {
    throw new Error(`mcpdesc-ui: element not found: ${options.dom_id}`);
  }

  // Add scoping root class
  container.classList.add('mcpdesc-ui-root');

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
    render(null, 'mcpdesc-ui: provide either "spec" or "url" option');
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
        throw new Error('mcpdesc-ui: cannot reload — no "url" option configured');
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
      container.classList.remove('mcpdesc-ui-root');
    },
  };
}

// Package version
export const version = '1.0.0-rc1';

// Re-export for consumers
export { McpDescCardView } from './McpDescCardView';
export type { McpDescCardViewProps, BadgeRenderer } from './McpDescCardView';
export { ValidationPanel } from './ValidationPanel';
export type { ValidationPanelProps } from './ValidationPanel';
export type { McpDescUIOptions, McpDescUIInstance } from './types';
export type {
  McpDescDocument,
  ValidationResult,
  ValidationIssue,
} from '@core/types';
