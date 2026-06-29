import { useRef, useCallback, useState, useEffect } from 'react';
import MonacoEditor, { type OnMount, type OnChange } from '@monaco-editor/react';
import { type editor } from 'monaco-editor';
import { useDoc } from '../hooks/useDoc';
import type { ValidationIssue } from '../core';
import mcpdescSchema from '../core/mcpdesc-schema.json';

const DEFAULT_FONT_SIZE = 15;
const MIN_FONT_SIZE = 10;
const MAX_FONT_SIZE = 28;
const FONT_STEP = 1;

/**
 * Convert a JSON-pointer path (e.g. "/tools/0/name") to a 1-based line number
 * by walking each path segment sequentially through the raw text.
 * Returns 0 when no matching line can be found.
 */
function pathToLine(text: string, path: string, params?: Record<string, unknown>): number {
  const segments = (path || '/').split('/').filter(Boolean);
  const lines = text.split('\n');
  let lineIdx = 0;
  let matched = segments.length === 0; // root path counts as matched

  for (let si = 0; si < segments.length; si++) {
    const seg = segments[si];
    if (/^\d+$/.test(seg)) {
      const target = parseInt(seg, 10);
      let count = -1;
      let found = false;
      // YAML: count only "- " lines at the same indent level as the first one
      let itemIndent = -1;
      for (let i = lineIdx + 1; i < lines.length; i++) {
        const raw = lines[i];
        const lt = raw.trimStart();
        if (!(lt.startsWith('- ') || lt === '-')) continue;
        const indent = raw.length - lt.length;
        if (itemIndent === -1) itemIndent = indent;      // anchor on first "- " found
        else if (indent !== itemIndent) continue;          // skip nested/deeper items
        count++;
        if (count === target) { lineIdx = i; found = true; matched = true; break; }
      }
      if (!found) {
        count = -1;
        for (let i = lineIdx + 1; i < lines.length; i++) {
          if (lines[i].trimStart().startsWith('{')) {
            count++;
            if (count === target) { lineIdx = i; found = true; matched = true; break; }
          }
        }
      }
    } else {
      const escaped = seg.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      // For the first segment (root-level keys), only match at indent 0 (YAML)
      // or indent ≤ 2 (JSON `"key":`) to avoid matching nested keys like capabilities.prompts
      const isRootSeg = si === 0 && lineIdx === 0;
      const pat = new RegExp(`["']?${escaped}["']?\\s*[:\\[{]`);
      for (let i = lineIdx; i < lines.length; i++) {
        if (!pat.test(lines[i])) continue;
        if (isRootSeg) {
          const indent = lines[i].length - lines[i].trimStart().length;
          if (indent > 2) continue; // skip nested matches (e.g. capabilities.prompts)
        }
        lineIdx = i; matched = true; break;
      }
    }
  }

  // For additionalProperties errors, locate the exact offending property
  if (params?.additionalProperty) {
    const prop = String(params.additionalProperty).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pat = new RegExp(`["']?${prop}["']?\\s*:`);
    for (let i = lineIdx; i < lines.length; i++) {
      if (pat.test(lines[i])) return i + 1;
    }
  }

  return matched ? lineIdx + 1 : 0;
}

/**
 * Simple two-step search for preview→editor navigation:
 * 1. Find the root-level section key (e.g. `tools:`) — indent 0 for YAML, ≤ 2 for JSON
 * 2. Search for the item value within that section (stop at the next root-level key)
 * Returns a 1-based line number, or 0 if not found.
 */
function findSectionItem(text: string, section: string, value: string): number {
  const lines = text.split('\n');
  const isJson = text.trimStart().startsWith('{');
  // Root-level keys: indent 0 in YAML, indent ≤ 2 in JSON (inside outer {})
  const maxRootIndent = isJson ? 2 : 0;

  // Step 1: find the root-level section key
  const secEsc = section.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const secPat = new RegExp(`["']?${secEsc}["']?\\s*[:\\[{]`);
  let sectionStart = -1;
  for (let i = 0; i < lines.length; i++) {
    const indent = lines[i].length - lines[i].trimStart().length;
    if (indent > maxRootIndent) continue;
    if (secPat.test(lines[i])) { sectionStart = i; break; }
  }
  if (sectionStart === -1) return 0;

  // Step 2: search for the value within the section, stop at next root-level key
  const valEsc = value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const valPat = new RegExp(`["']?${valEsc}["']?`);
  for (let i = sectionStart + 1; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trimStart();
    if (!trimmed) continue;
    const indent = line.length - trimmed.length;
    // Stop at next root-level key
    if (indent <= maxRootIndent && /^["']?\w/.test(trimmed) && !trimmed.startsWith('- ') && trimmed !== '-') break;
    if (valPat.test(line)) return i + 1;
  }

  return sectionStart + 1; // fallback to section header
}

export default function Editor() {

  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<typeof import('monaco-editor') | null>(null);
  const monacoConfigured = useRef(false);
  const decorationsRef = useRef<editor.IEditorDecorationsCollection | null>(null);
  const [fontSize, setFontSize] = useState(DEFAULT_FONT_SIZE);
  const [unmappedIssues, setUnmappedIssues] = useState<string[]>([]);

  const applyFontSize = useCallback((size: number) => {
    setFontSize(size);
    editorRef.current?.updateOptions({ fontSize: size });
  }, []);

  const { state, setText, revealSectionItemRef } = useDoc();

  // Register reveal callback so the preview can jump to a section item in the editor
  useEffect(() => {
    revealSectionItemRef.current = (section: string, value: string) => {
      const ed = editorRef.current;
      if (!ed) return;
      const line = findSectionItem(ed.getValue(), section, value);
      if (line > 0) {
        ed.revealLineInCenter(line);
        ed.setPosition({ lineNumber: line, column: 1 });
        ed.focus();
      }
    };
    return () => { revealSectionItemRef.current = null; };
  }, [revealSectionItemRef]);

  const handleMount: OnMount = useCallback((ed, monaco) => {
    editorRef.current = ed;
    monacoRef.current = monaco;

    if (!monacoConfigured.current) {
      monacoConfigured.current = true;

      monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
        validate: true,
        schemas: [
          {
            uri: 'https://developer.cisco.com/mcp-description/schema/0.6.0',
            fileMatch: ['*'],
            schema: mcpdescSchema as Record<string, unknown>,
          },
        ],
        allowComments: false,
        schemaValidation: 'error',
      });
    }

    ed.focus();
  }, []);

  // Update glyph-margin decorations when validation changes
  useEffect(() => {
    const ed = editorRef.current;
    const monaco = monacoRef.current;
    if (!ed || !monaco) return;

    const allIssues: (ValidationIssue & { severity: 'error' | 'warning' })[] = [
      ...state.validation.errors.map(e => ({ ...e, severity: 'error' as const })),
      ...state.validation.warnings.map(w => ({ ...w, severity: 'warning' as const })),
    ];

    // Group by line, collect unmapped
    const lineMap = new Map<number, string[]>();
    const unmapped: string[] = [];
    for (const issue of allIssues) {
      const line = pathToLine(state.text, issue.path, issue.params);
      const label = `${issue.severity === 'error' ? '✕' : '⚠'} ${issue.path}: ${issue.message}`;
      if (line === 0) {
        unmapped.push(label);
      } else {
        const existing = lineMap.get(line) ?? [];
        existing.push(label);
        lineMap.set(line, existing);
      }
    }
    setUnmappedIssues(unmapped);

    const newDecorations: editor.IModelDeltaDecoration[] = [];
    for (const [line, messages] of lineMap) {
      newDecorations.push({
        range: new monaco.Range(line, 1, line, 1),
        options: {
          isWholeLine: true,
          glyphMarginClassName: 'error-glyph',
          glyphMarginHoverMessage: { value: messages.join('\n\n') },
          className: 'error-line-highlight',
        },
      });
    }

    if (decorationsRef.current) {
      decorationsRef.current.clear();
    }
    decorationsRef.current = ed.createDecorationsCollection(newDecorations);
  }, [state.validation, state.text]);

  const handleChange: OnChange = useCallback(
    (value) => {
      if (value !== undefined) setText(value);
    },
    [setText],
  );

  // Detect language from format (YAML when the text doesn't start with { or [)
  const language = state.format === 'yaml' ? 'yaml' : 'json';

  const fontBtnClass =
    'px-1.5 py-0.5 text-xs rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors cursor-pointer leading-none';

  return (
    <div className="flex flex-col h-full">
      {/* Editor font-size controls — right-aligned */}
      <div className="flex items-center justify-end gap-1 px-2 py-1 bg-zinc-900 border-b border-zinc-800 shrink-0">
        <button
          className={fontBtnClass}
          onClick={() => applyFontSize(Math.max(MIN_FONT_SIZE, fontSize - FONT_STEP))}
          title="Decrease font size"
        >
          −
        </button>
        <button
          className={fontBtnClass}
          onClick={() => applyFontSize(DEFAULT_FONT_SIZE)}
          title="Reset to default"
        >
          {fontSize}px
        </button>
        <button
          className={fontBtnClass}
          onClick={() => applyFontSize(Math.min(MAX_FONT_SIZE, fontSize + FONT_STEP))}
          title="Increase font size"
        >
          +
        </button>
      </div>
      <div className="flex-1 overflow-hidden">
        <MonacoEditor
          height="100%"
          language={language}
          theme="vs-dark"
          value={state.text}
          onChange={handleChange}
          onMount={handleMount}
          options={{
            minimap: { enabled: false },
            fontSize,
            lineNumbers: 'on',
            scrollBeyondLastLine: false,
            wordWrap: 'on',
            tabSize: 2,
            automaticLayout: true,
            folding: true,
            formatOnPaste: true,
            glyphMargin: true,
          }}
        />
      </div>
      {unmappedIssues.length > 0 && (
        <div className="shrink-0 max-h-32 overflow-auto border-t border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-400 space-y-0.5">
          {unmappedIssues.map((msg, i) => (
            <div key={i} className={msg.startsWith('✕') ? 'text-red-400' : 'text-yellow-400'}>{msg}</div>
          ))}
        </div>
      )}
    </div>
  );
}
