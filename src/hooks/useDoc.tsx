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
  useState,
  type ReactNode,
} from 'react';
import {
  projectEffectiveProtocolView,
  serializeMcpDescription,
  type JsonValue,
  type McpDescriptionConversionResult,
  type McpDescriptionConversionFix,
} from '@mcpdesc/core';
import { parseMcpDescriptionSource } from '@mcpdesc/core/documents';
import { resolveMcpDescriptionComponentReferences } from '@mcpdesc/core/components';
import type { SupportedProtocolVersion } from '@mcpdesc/validator/browser';
import {
  MCPDESC_FORMAT_VERSION,
  MCPDESC_SPECIFICATION,
  McpDescValidator,
  legacySourceFindings,
  unsupportedFormatMessage,
  type McpDescDocument,
  type ValidationIssue,
  type ValidationResult,
} from '../core';
import {
  defaultExample,
  defaultExampleId,
  getExampleFromSearch,
  type ExampleEntry,
} from '../examples';
import { replaceEditorUrlSource } from '../editorUrl';
import { convertTo09 } from '../core/conversion';
import type { NativeExportRequest } from '../nativeExport';

// ============================================================================
// State shape
// ============================================================================

export type DocFormat = 'json' | 'yaml';

export interface ConversionReview {
  sourceText: string;
  source: McpDescDocument;
  format: DocFormat;
  initialResult: McpDescriptionConversionResult;
  result: McpDescriptionConversionResult;
  fixes: readonly McpDescriptionConversionFix[];
  /** 0.8 schema and semantic findings that prevent conversion of an invalid source. */
  sourceFindings: readonly ValidationIssue[];
}

/** Downloadable record of an applied 0.8 to 0.9.0 migration. */
export interface MigrationReport {
  source: '0.8.0';
  selector: typeof MCPDESC_SPECIFICATION;
  fixes: readonly McpDescriptionConversionFix[];
  result: Extract<McpDescriptionConversionResult, { ok: true }>;
}

export type MigrationState =
  | { status: 'idle' }
  /** The source declares a format version other than 0.9.0; preview and exports are unavailable. */
  | { status: 'unsupported'; sourceText: string; message: string; migratable: boolean }
  | { status: 'succeeded'; report: MigrationReport };

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
  /** Increments when a new document is loaded through an example or import. */
  documentLoadRevision: number;
  /** Unsupported-version state and the report of an applied 0.8 to 0.9.0 migration. */
  migration: MigrationState;
}

type DocAction =
  | { type: 'SET_TEXT'; text: string }
  | { type: 'IMPORT_TEXT'; text: string }
  | { type: 'LOAD_EXAMPLE'; example: ExampleEntry }
  | { type: 'SET_MIGRATION'; migration: MigrationState }
  | { type: 'MIGRATION_SUCCEEDED'; text: string; report: MigrationReport }
  | { type: 'SET_VALIDATION'; validation: ValidationResult }
  | { type: 'SET_SELECTED_PROTOCOL_VERSION'; protocolVersion: SupportedProtocolVersion | null }
  | { type: 'SET_PARSED'; doc: McpDescDocument | null; parseError: string | null; format: DocFormat };

function reducer(state: DocState, action: DocAction): DocState {
  switch (action.type) {
    case 'SET_TEXT':
    case 'IMPORT_TEXT': {
      const migration = action.type === 'IMPORT_TEXT'
        || ('sourceText' in state.migration && state.migration.sourceText !== action.text)
        ? { status: 'idle' as const }
        : state.migration;
      const documentLoadRevision = action.type === 'IMPORT_TEXT'
        ? state.documentLoadRevision + 1
        : state.documentLoadRevision;
      if (action.text.trim().length === 0) {
        return {
          ...state,
          text: action.text,
          doc: null,
          parseError: null,
          validation: emptyValidation,
          selectedExampleId: null,
          selectedProtocolVersion: null,
          documentLoadRevision,
          migration,
        };
      }
      return { ...state, text: action.text, selectedExampleId: null, documentLoadRevision, migration };
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
        documentLoadRevision: state.documentLoadRevision + 1,
        migration: { status: 'idle' },
      };
    case 'SET_MIGRATION':
      return { ...state, migration: action.migration };
    case 'MIGRATION_SUCCEEDED':
      return {
        ...state,
        text: action.text,
        selectedExampleId: null,
        migration: { status: 'succeeded', report: action.report },
      };
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

function reviewConversion(
  sourceText: string,
  source: McpDescDocument,
  format: DocFormat,
): ConversionReview {
  const result = convertTo09(source);
  return {
    sourceText, source, format, initialResult: result, result, fixes: [],
    sourceFindings: !result.ok && result.status === 'invalid-source' ? legacySourceFindings(source) : [],
  };
}

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
      documentLoadRevision: 0,
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
    documentLoadRevision: 0,
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
  conversion: ConversionReview | null;
  requestConversion: () => void;
  reviewConversionFixes: (fixes: readonly McpDescriptionConversionFix[]) => void;
  applyConversion: () => void;
  cancelConversion: () => void;
  nativeExport: (NativeExportRequest & { doc: McpDescDocument; sourceText: string }) | null;
  requestNativeExport: (request: NativeExportRequest) => void;
  closeNativeExport: () => void;
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
  const [conversionReview, setConversionReview] = useState<ConversionReview | null>(null);
  const conversion = conversionReview?.sourceText === state.text ? conversionReview : null;
  const [nativeExportReview, setNativeExportReview] = useState<(NativeExportRequest & { doc: McpDescDocument; sourceText: string }) | null>(null);
  const nativeExport = nativeExportReview?.sourceText === state.text ? nativeExportReview : null;
  const validatorRef = useRef<McpDescValidator | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  // Source text whose migration prompt the author dismissed; avoids reopening it while typing.
  const declinedConversionRef = useRef<string | null>(null);
  const revealSectionItemRef = useRef<((section: string, value: string) => void) | null>(null);
  const revealPathRef = useRef<((path: string) => void) | null>(null);

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
      const isObject = typeof parsed.value === 'object' && parsed.value !== null && !Array.isArray(parsed.value);
      const message = isObject && 'mcpdesc' in doc ? unsupportedFormatMessage(doc.mcpdesc) : null;
      if (message) {
        const migratable = doc.mcpdesc === '0.8.0';
        if (migratable && declinedConversionRef.current !== raw) {
          const source = doc;
          setConversionReview((current) => (current?.sourceText === raw
            ? current
            : reviewConversion(raw, source, parsed.format)));
        }
        dispatch({ type: 'SET_MIGRATION', migration: { status: 'unsupported', sourceText: raw, message, migratable } });
        doc = null;
      }
    } else {
      const diagnostic = parsed.diagnostics[0];
      const location = diagnostic.location
        ? ` at line ${diagnostic.location.line}, column ${diagnostic.location.column}`
        : '';
      parseError = `${diagnostic.message}${location}`;
    }

    // 2. Validate (an unsupported format version yields one finding instead of rule results)
    const result = parsed.ok ? validatorRef.current?.validateDocument(parsed.value) : undefined;
    if (result?.errors.some(({ keyword }) => keyword === 'unsupported-format-version')) doc = null;
    dispatch({ type: 'SET_PARSED', doc, parseError, format });

    if (result) {
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
      declinedConversionRef.current = null;
      dispatch({ type: 'LOAD_EXAMPLE', example });
      replaceEditorUrlSource({ type: 'example', id: example.id });
    },
    [],
  );
  const importText = useCallback((text: string, sourceUrl?: string) => {
    declinedConversionRef.current = null;
    dispatch({ type: 'IMPORT_TEXT', text });
    replaceEditorUrlSource(sourceUrl
      ? { type: 'url', value: sourceUrl }
      : { type: 'document' });
  }, []);
  const setSelectedProtocolVersion = useCallback(
    (protocolVersion: SupportedProtocolVersion | null) =>
      dispatch({ type: 'SET_SELECTED_PROTOCOL_VERSION', protocolVersion }),
    [],
  );
  // Always convert the latest raw source, never a stale debounced parse.
  const requestConversion = () => {
    const parsed = parseMcpDescriptionSource(state.text);
    if (!parsed.ok || typeof parsed.value !== 'object' || parsed.value === null
      || Array.isArray(parsed.value) || parsed.value.mcpdesc !== '0.8.0') return;
    declinedConversionRef.current = null;
    setConversionReview(reviewConversion(state.text, parsed.value as McpDescDocument, parsed.format));
  };
  const reviewConversionFixes = (fixes: readonly McpDescriptionConversionFix[]) => {
    if (!conversion) return;
    setConversionReview({
      ...conversion, fixes, result: convertTo09(conversion.source, fixes),
    });
  };
  const applyConversion = () => {
    if (!conversion?.result.ok) return;
    // Preserve authored member order; the conversion keeps it and only inserts new members.
    const value = conversion.result.value as JsonValue;
    const text = conversion.format === 'yaml'
      ? serializeMcpDescription(value, { format: 'yaml', keyOrder: 'preserve', presentation: 'normalized' })
      : serializeMcpDescription(value, { format: 'json', keyOrder: 'preserve' });
    dispatch({
      type: 'MIGRATION_SUCCEEDED',
      text,
      report: { source: '0.8.0', selector: MCPDESC_SPECIFICATION, fixes: conversion.fixes, result: conversion.result },
    });
    replaceEditorUrlSource({ type: 'document' });
    setConversionReview(null);
  };
  const cancelConversion = () => {
    if (conversion) declinedConversionRef.current = conversion.sourceText;
    setConversionReview(null);
  };
  const requestNativeExport = (request: NativeExportRequest) => {
    const parsed = parseMcpDescriptionSource(state.text);
    if (!parsed.ok || typeof parsed.value !== 'object' || parsed.value === null
      || Array.isArray(parsed.value) || parsed.value.mcpdesc !== MCPDESC_FORMAT_VERSION) return;
    setNativeExportReview({ ...request, doc: parsed.value as McpDescDocument, sourceText: state.text });
  };
  const effectiveDoc = useMemo(() => {
    if (!state.doc || !state.selectedProtocolVersion) return state.doc;
    const projection = projectEffectiveProtocolView(state.doc, {
      protocolVersion: state.selectedProtocolVersion,
    });
    return projection.ok ? projection.value as McpDescDocument : state.doc;
  }, [state.doc, state.selectedProtocolVersion]);

  // Resolution runs after projection so references on filtered-out declarations are ignored.
  const resolution = useMemo(
    () => (effectiveDoc
      ? effectiveDoc.components
        ? resolveMcpDescriptionComponentReferences(effectiveDoc)
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
      conversion,
      requestConversion,
      reviewConversionFixes,
      applyConversion,
      cancelConversion,
      nativeExport,
      requestNativeExport,
      closeNativeExport: () => setNativeExportReview(null),
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
