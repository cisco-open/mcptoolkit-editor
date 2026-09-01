// Copyright 2026 Cisco Systems, Inc. and its affiliates
//
// SPDX-License-Identifier: Apache-2.0

/**
 * Central document state — owns the raw text, parsed document, and validation results.
 * Uses React Context + useReducer for lightweight global state.
 */

import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useRef,
  useCallback,
  type ReactNode,
} from 'react';
import {
  projectEffectiveProtocolView,
} from '@mcpdesc/core';
import { parseMcpDescriptionSource } from '@mcpdesc/core/documents';
import type { SupportedProtocolVersion } from '@mcpdesc/validator/standalone';
import { McpDescValidator, type McpDescDocument, type ValidationResult } from '../core';
import minimalExample from '../../examples/minimal.yaml?raw';

// ============================================================================
// State shape
// ============================================================================

export type DocFormat = 'json' | 'yaml';

interface DocState {
  /** Raw text in the editor */
  text: string;
  /** Detected format (json/yaml) */
  format: DocFormat;
  /** Parsed document (null if parse error) */
  doc: McpDescDocument | null;
  /** Parse error message if text is not valid JSON/YAML */
  parseError: string | null;
  /** Schema + semantic validation results */
  validation: ValidationResult;
  /** Protocol revision selected for the Effective Protocol View. */
  selectedProtocolVersion: SupportedProtocolVersion | null;
}

type DocAction =
  | { type: 'SET_TEXT'; text: string }
  | { type: 'LOAD_EXAMPLE'; text: string }
  | { type: 'SET_VALIDATION'; validation: ValidationResult }
  | { type: 'SET_SELECTED_PROTOCOL_VERSION'; protocolVersion: SupportedProtocolVersion | null }
  | { type: 'SET_PARSED'; doc: McpDescDocument | null; parseError: string | null; format: DocFormat };

function reducer(state: DocState, action: DocAction): DocState {
  switch (action.type) {
    case 'SET_TEXT':
      return { ...state, text: action.text };
    case 'LOAD_EXAMPLE':
      return { ...state, text: action.text };
    case 'SET_PARSED':
      return { ...state, doc: action.doc, parseError: action.parseError, format: action.format };
    case 'SET_VALIDATION':
      return { ...state, validation: action.validation };
    case 'SET_SELECTED_PROTOCOL_VERSION':
      return { ...state, selectedProtocolVersion: action.protocolVersion };
    default:
      return state;
  }
}

const emptyValidation: ValidationResult = { valid: true, errors: [], warnings: [] };

const LOCALSTORAGE_KEY = 'mcptoolkit-editor-content';

function loadInitialText(): string {
  try {
    const saved = localStorage.getItem(LOCALSTORAGE_KEY);
    if (saved) return saved;
  } catch { /* ignore */ }
  return minimalExample;
}

const initialState: DocState = {
  text: loadInitialText(),
  format: 'json',
  doc: null,
  parseError: null,
  validation: emptyValidation,
  selectedProtocolVersion: null,
};

// ============================================================================
// Context
// ============================================================================

interface DocContextValue {
  state: DocState;
  setText: (text: string) => void;
  loadExample: (text: string) => void;
  setSelectedProtocolVersion: (protocolVersion: SupportedProtocolVersion | null) => void;
  effectiveDoc: McpDescDocument | null;
  /** Ref that the Editor sets to allow preview→editor navigation */
  revealSectionItemRef: React.MutableRefObject<((section: string, value: string) => void) | null>;
}

const DocContext = createContext<DocContextValue | null>(null);

export function useDoc() {
  const ctx = useContext(DocContext);
  if (!ctx) throw new Error('useDoc must be used inside <DocProvider>');
  return ctx;
}

// ============================================================================
// Provider
// ============================================================================

const DEBOUNCE_MS = 300;

export function DocProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const validatorRef = useRef<McpDescValidator | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const revealSectionItemRef = useRef<((section: string, value: string) => void) | null>(null);

  // Initialise validator once
  useEffect(() => {
    const v = new McpDescValidator();
    validatorRef.current = v;
    // Validate the initial text immediately
    parseAndValidate(state.text);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const parseAndValidate = useCallback((raw: string) => {
    // 1. Parse
    let doc: McpDescDocument | null = null;
    let parseError: string | null = null;
    let format: DocFormat = 'json';

    const parsed = parseMcpDescriptionSource(raw);
    if (parsed.ok) {
      doc = parsed.value as McpDescDocument;
      format = parsed.format;
    } else {
      const diagnostic = parsed.diagnostics[0];
      const location = diagnostic.location
        ? ` at line ${diagnostic.location.line}, column ${diagnostic.location.column}`
        : '';
      parseError = `${diagnostic.message}${location}`;
    }

    dispatch({ type: 'SET_PARSED', doc, parseError, format });

    // 2. Validate
    if (doc && validatorRef.current) {
      const result = validatorRef.current.validateDocument(doc);
      dispatch({ type: 'SET_VALIDATION', validation: result });
    } else if (parseError) {
      dispatch({
        type: 'SET_VALIDATION',
        validation: {
          valid: false,
          errors: [{ path: '/', message: parseError }],
          warnings: [],
        },
      });
    }

    // 3. Persist to localStorage
    try {
      localStorage.setItem(LOCALSTORAGE_KEY, raw);
    } catch { /* quota exceeded — ignore */ }
  }, []);

  // Debounced parse + validate on text change
  useEffect(() => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => parseAndValidate(state.text), DEBOUNCE_MS);
    return () => clearTimeout(timerRef.current);
  }, [state.text, parseAndValidate]);

  const setText = useCallback((text: string) => dispatch({ type: 'SET_TEXT', text }), []);
  const loadExample = useCallback((text: string) => dispatch({ type: 'LOAD_EXAMPLE', text }), []);
  const setSelectedProtocolVersion = useCallback(
    (protocolVersion: SupportedProtocolVersion | null) =>
      dispatch({ type: 'SET_SELECTED_PROTOCOL_VERSION', protocolVersion }),
    [],
  );
  const projection = state.doc && state.selectedProtocolVersion
    ? projectEffectiveProtocolView(state.doc, {
      specification: '0.8.0-rc.1',
      protocolVersion: state.selectedProtocolVersion,
    })
    : null;
  const effectiveDoc = projection?.ok ? projection.value as McpDescDocument : state.doc;

  return (
    <DocContext.Provider value={{
      state,
      setText,
      loadExample,
      setSelectedProtocolVersion,
      effectiveDoc,
      revealSectionItemRef,
    }}>
      {children}
    </DocContext.Provider>
  );
}
