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
  useMemo,
  useRef,
  useCallback,
  type ReactNode,
} from 'react';
import {
  migrateMcpDescription07ToRc3,
  projectEffectiveProtocolView,
  serializeMcpDescription,
  type JsonValue,
  type McpDescriptionMigrationReport,
} from '@mcpdesc/core';
import { parseMcpDescriptionSource } from '@mcpdesc/core/documents';
import { resolveMcpDescriptionComponentReferences } from '@mcpdesc/core/components';
import type { SupportedProtocolVersion } from '@mcpdesc/validator/browser';
import {
  getMcpDesc07ValidationErrors,
  isValidMcpDesc07,
  MCPDESC_SPECIFICATION,
  McpDescValidator,
  type McpDescDocument,
  type ValidationResult,
} from '../core';
import {
  defaultExample,
  defaultExampleId,
  getExampleFromSearch,
  type ExampleEntry,
} from '../examples';
import { replaceEditorUrlSource } from '../editorUrl';

// ============================================================================
// State shape
// ============================================================================

export type DocFormat = 'json' | 'yaml';

export type MigrationState =
  | { status: 'idle' }
  | { status: 'confirmation-required'; source: JsonValue; sourceText: string; format: DocFormat }
  | { status: 'cancelled'; sourceText: string }
  | { status: 'succeeded'; report: McpDescriptionMigrationReport }
  | { status: 'failed'; sourceText: string; report: McpDescriptionMigrationReport };

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
  /** Bundled example currently loaded, when the source is unchanged. */
  selectedExampleId: string | null;
  /** State and downloadable report for an explicit 0.7 to 0.8 migration. */
  migration: MigrationState;
}

type DocAction =
  | { type: 'SET_TEXT'; text: string }
  | { type: 'LOAD_EXAMPLE'; example: ExampleEntry }
  | { type: 'REQUEST_MIGRATION'; source: JsonValue; sourceText: string; format: DocFormat }
  | { type: 'CANCEL_MIGRATION'; sourceText: string }
  | { type: 'MIGRATION_SUCCEEDED'; text: string; report: McpDescriptionMigrationReport }
  | { type: 'MIGRATION_FAILED'; sourceText: string; report: McpDescriptionMigrationReport }
  | { type: 'SET_VALIDATION'; validation: ValidationResult }
  | { type: 'SET_SELECTED_PROTOCOL_VERSION'; protocolVersion: SupportedProtocolVersion | null }
  | { type: 'SET_PARSED'; doc: McpDescDocument | null; parseError: string | null; format: DocFormat };

function reducer(state: DocState, action: DocAction): DocState {
  switch (action.type) {
    case 'SET_TEXT': {
      const migration = 'sourceText' in state.migration && state.migration.sourceText !== action.text
        ? { status: 'idle' as const }
        : state.migration;
      if (action.text.trim().length === 0) {
        return {
          ...state,
          text: action.text,
          doc: null,
          parseError: null,
          validation: emptyValidation,
          selectedExampleId: null,
          selectedProtocolVersion: null,
          migration,
        };
      }
      return { ...state, text: action.text, selectedExampleId: null, migration };
    }
    case 'LOAD_EXAMPLE':
      return {
        ...state,
        text: action.example.content,
        doc: null,
        parseError: null,
        validation: emptyValidation,
        selectedExampleId: action.example.id,
        selectedProtocolVersion: null,
        migration: { status: 'idle' },
      };
    case 'REQUEST_MIGRATION':
      return {
        ...state,
        migration: {
          status: 'confirmation-required',
          source: action.source,
          sourceText: action.sourceText,
          format: action.format,
        },
      };
    case 'CANCEL_MIGRATION':
      return { ...state, migration: { status: 'cancelled', sourceText: action.sourceText } };
    case 'MIGRATION_SUCCEEDED':
      return { ...state, text: action.text, migration: { status: 'succeeded', report: action.report } };
    case 'MIGRATION_FAILED':
      return { ...state, migration: { status: 'failed', sourceText: action.sourceText, report: action.report } };
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
const LEGACY_MIGRATION_ERROR =
  'mcpdesc v0.7 is not supported, migrate your document to v0.8 or above.';
const PRE_07_ERROR = 'mcpdesc versions before v0.7 are not supported.';

function createInitialState(): DocState {
  const requestedExample = getExampleFromSearch(window.location.search);
  if (requestedExample) {
    return {
      text: requestedExample.content,
      format: 'yaml',
      doc: null,
      parseError: null,
      validation: emptyValidation,
      selectedProtocolVersion: null,
      selectedExampleId: requestedExample.id,
      migration: { status: 'idle' },
    };
  }

  let text = defaultExample;
  let selectedExampleId: string | null = defaultExampleId;
  try {
    const saved = localStorage.getItem(LOCALSTORAGE_KEY);
    if (saved) {
      text = saved;
      selectedExampleId = null;
    }
  } catch { /* ignore */ }
  return {
    text,
    format: 'yaml',
    doc: null,
    parseError: null,
    validation: emptyValidation,
    selectedProtocolVersion: null,
    selectedExampleId,
    migration: { status: 'idle' },
  };
}

// ============================================================================
// Context
// ============================================================================

interface DocContextValue {
  state: DocState;
  setText: (text: string) => void;
  loadExample: (example: ExampleEntry) => void;
  importText: (text: string, sourceUrl?: string) => void;
  setSelectedProtocolVersion: (protocolVersion: SupportedProtocolVersion | null) => void;
  confirmMigration: () => void;
  cancelMigration: () => void;
  effectiveDoc: McpDescDocument | null;
  /** Effective document with local `$componentRef` values substituted; null when resolution fails. */
  resolvedDoc: McpDescDocument | null;
  /** Ref that the Editor sets to allow preview→editor navigation */
  revealSectionItemRef: React.MutableRefObject<((section: string, value: string) => void) | null>;
  /** Ref that the Editor sets to allow preview→editor navigation by JSON pointer. */
  revealPathRef: React.MutableRefObject<((path: string) => void) | null>;
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
  const [state, dispatch] = useReducer(reducer, undefined, createInitialState);
  const validatorRef = useRef<McpDescValidator | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const migrationRef = useRef<MigrationState>(state.migration);
  const revealSectionItemRef = useRef<((section: string, value: string) => void) | null>(null);
  const revealPathRef = useRef<((path: string) => void) | null>(null);

  useEffect(() => {
    migrationRef.current = state.migration;
  }, [state.migration]);

  // Initialise validator once
  useEffect(() => {
    const v = new McpDescValidator();
    validatorRef.current = v;
    // Validate the initial text immediately
    parseAndValidate(state.text);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const parseAndValidate = useCallback((raw: string) => {
    if (raw.trim().length === 0) {
      dispatch({ type: 'SET_PARSED', doc: null, parseError: null, format: 'yaml' });
      dispatch({ type: 'SET_VALIDATION', validation: emptyValidation });
      try {
        localStorage.setItem(LOCALSTORAGE_KEY, raw);
      } catch { /* quota exceeded — ignore */ }
      return;
    }

    // 1. Parse
    let doc: McpDescDocument | null = null;
    let parseError: string | null = null;
    let format: DocFormat = raw.trimStart().startsWith('{') ? 'json' : 'yaml';

    const parsed = parseMcpDescriptionSource(raw);
    if (parsed.ok) {
      doc = parsed.value as McpDescDocument;
      format = parsed.format;
      const version = doc.mcpdesc;
      if (version === '0.7.0') {
        doc = null;
        parseError = LEGACY_MIGRATION_ERROR;
        const migration = migrationRef.current;
        const alreadyHandled = 'sourceText' in migration && migration.sourceText === raw;
        if (!alreadyHandled) {
          dispatch({
            type: 'REQUEST_MIGRATION',
            source: parsed.value,
            sourceText: raw,
            format: parsed.format,
          });
        }
      } else if (typeof version === 'string' && /^0\.[0-6](?:\.|$)/.test(version)) {
        doc = null;
        parseError = PRE_07_ERROR;
      }
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
      const diagnostic = parsed.ok ? undefined : parsed.diagnostics[0];
      const lastContentLine = raw.trimEnd().split('\n').length;
      const line = diagnostic?.location?.line && diagnostic.location.line > lastContentLine
        ? lastContentLine
        : diagnostic?.location?.line;
      dispatch({
        type: 'SET_VALIDATION',
        validation: {
          valid: false,
          errors: [{
            path: '/',
            message: parseError,
            line,
            column: diagnostic?.location?.column,
          }],
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

  const setText = useCallback((text: string) => {
    dispatch({ type: 'SET_TEXT', text });
    replaceEditorUrlSource({ type: 'document' });
  }, []);
  const loadExample = useCallback(
    (example: ExampleEntry) => {
      dispatch({ type: 'LOAD_EXAMPLE', example });
      replaceEditorUrlSource({ type: 'example', id: example.id });
    },
    [],
  );
  const importText = useCallback((text: string, sourceUrl?: string) => {
    dispatch({ type: 'SET_TEXT', text });
    replaceEditorUrlSource(sourceUrl
      ? { type: 'url', value: sourceUrl }
      : { type: 'document' });
  }, []);
  const cancelMigration = useCallback(() => {
    const migration = migrationRef.current;
    if (migration.status === 'confirmation-required') {
      dispatch({ type: 'CANCEL_MIGRATION', sourceText: migration.sourceText });
    }
  }, []);
  const confirmMigration = useCallback(() => {
    const migration = migrationRef.current;
    if (migration.status !== 'confirmation-required') return;

    if (!isValidMcpDesc07(migration.source)) {
      const diagnostics = getMcpDesc07ValidationErrors(migration.source).map((error) => ({
        code: `source-${error.keyword}`,
        severity: 'error' as const,
        message: error.message ?? 'The source does not conform to MCP Description 0.7.0.',
        path: error.instancePath.split('/').slice(1),
        phase: 'source' as const,
      }));
      dispatch({
        type: 'MIGRATION_FAILED',
        sourceText: migration.sourceText,
        report: {
          status: 'failed',
          sourceSpecification: '0.7.0',
          targetSpecification: MCPDESC_SPECIFICATION,
          diagnostics,
          defaultsApplied: [],
          changes: [],
        },
      });
      return;
    }

    const result = migrateMcpDescription07ToRc3(migration.source, {
      specification: MCPDESC_SPECIFICATION,
      sourceValidated: true,
      defaultProtocolVersion: '2025-11-25',
    });
    if (!result.ok) {
      dispatch({
        type: 'MIGRATION_FAILED',
        sourceText: migration.sourceText,
        report: result.report,
      });
      return;
    }

    const text = serializeMcpDescription(result.value as JsonValue, { format: migration.format });
    dispatch({ type: 'MIGRATION_SUCCEEDED', text, report: result.report });
    replaceEditorUrlSource({ type: 'document' });
  }, []);
  const setSelectedProtocolVersion = useCallback(
    (protocolVersion: SupportedProtocolVersion | null) =>
      dispatch({ type: 'SET_SELECTED_PROTOCOL_VERSION', protocolVersion }),
    [],
  );
  const effectiveDoc = useMemo(() => {
    if (!state.doc || !state.selectedProtocolVersion) return state.doc;
    const projection = projectEffectiveProtocolView(state.doc, {
      specification: MCPDESC_SPECIFICATION,
      protocolVersion: state.selectedProtocolVersion,
    });
    return projection.ok ? projection.value as McpDescDocument : state.doc;
  }, [state.doc, state.selectedProtocolVersion]);

  // Resolution runs after projection so references on filtered-out declarations are ignored.
  const resolution = useMemo(
    () => (effectiveDoc
      ? effectiveDoc.components
        ? resolveMcpDescriptionComponentReferences(effectiveDoc, { specification: MCPDESC_SPECIFICATION })
        : { ok: true as const, value: effectiveDoc }
      : null),
    [effectiveDoc],
  );
  const resolvedDoc = resolution?.ok ? resolution.value as McpDescDocument : null;

  return (
    <DocContext.Provider value={{
      state,
      setText,
      loadExample,
      importText,
      confirmMigration,
      cancelMigration,
      setSelectedProtocolVersion,
      effectiveDoc,
      resolvedDoc,
      revealSectionItemRef,
      revealPathRef,
    }}>
      {children}
    </DocContext.Provider>
  );
}
