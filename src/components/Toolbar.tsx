// Copyright 2026 Cisco Systems, Inc. and its affiliates
//
// SPDX-License-Identifier: Apache-2.0

import { useCallback, useMemo } from 'react';
import { useDoc } from '../hooks/useDoc';
import { examples, exampleGroups } from '../examples';
import { stringify as yamlStringify } from 'yaml';
import { McpDescRenderer } from '../core/renderer';
import { mcpdescMarkdownTemplate } from '../core/template';

const renderer = new McpDescRenderer();

export default function Toolbar({ onImport }: { onImport: () => void }) {
  const { state, loadExample, setText, resolvedDoc } = useDoc();

  const handleExampleChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const ex = examples.find((example) => example.id === e.target.value);
      if (ex) loadExample(ex);
    },
    [loadExample],
  );

  const download = useCallback((content: string, filename: string, mime: string) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const baseFilename = useMemo(() => {
    return state.doc?.info?.name ?? 'mcpdesc';
  }, [state.doc]);

  const handleExportJSON = useCallback(() => {
    if (!state.doc) return;
    download(JSON.stringify(state.doc, null, 2), `${baseFilename}.mcpdesc.json`, 'application/json');
  }, [state.doc, download, baseFilename]);

  const handleExportYAML = useCallback(() => {
    if (!state.doc) return;
    download(yamlStringify(state.doc), `${baseFilename}.mcpdesc.yaml`, 'text/yaml');
  }, [state.doc, download, baseFilename]);

  const handleExportMarkdown = useCallback(() => {
    if (!state.doc) return;
    // Markdown is a rendering, so components are substituted; JSON/YAML export keeps the source.
    const md = renderer.render(resolvedDoc ?? state.doc, mcpdescMarkdownTemplate);
    download(md, `${baseFilename}.md`, 'text/markdown');
  }, [state.doc, resolvedDoc, download, baseFilename]);

  const handleFormatJSON = useCallback(() => {
    if (!state.doc) return;
    setText(JSON.stringify(state.doc, null, 2));
  }, [state.doc, setText]);

  const handleFormatYAML = useCallback(() => {
    if (!state.doc) return;
    setText(yamlStringify(state.doc));
  }, [state.doc, setText]);

  const btnClass = 'px-2 py-1 text-xs rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors cursor-pointer';

  return (
    <header className="flex items-center gap-2 px-3 py-1.5 bg-zinc-950 border-b border-zinc-800 shrink-0">
      {/* Brand */}
      <span className="text-sm font-semibold text-zinc-200 mr-2 select-none">MCP Description Editor</span>

      <div className="w-px h-5 bg-zinc-800" />

      <button className={btnClass} onClick={onImport}>Import</button>

      {/* Examples */}
      <select
        className="text-xs bg-zinc-800 text-zinc-300 rounded px-2 py-1 border border-zinc-700 cursor-pointer"
        value={state.selectedExampleId ?? ''}
        onChange={handleExampleChange}
      >
        <option value="" disabled>
          Examples…
        </option>
        {exampleGroups.map((group) => (
          <optgroup key={group.label} label={group.label}>
            {group.entries.map((ex) => (
              <option key={ex.id} value={ex.id}>
                {ex.label}
              </option>
            ))}
          </optgroup>
        ))}
      </select>

      <div className="w-px h-5 bg-zinc-800" />

      {/* Format conversion */}
      <button className={btnClass} onClick={handleFormatJSON} disabled={!state.doc} title="Re-format as JSON">
        → JSON
      </button>
      <button className={btnClass} onClick={handleFormatYAML} disabled={!state.doc} title="Re-format as YAML">
        → YAML
      </button>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Export */}
      <button className={btnClass} onClick={handleExportJSON} disabled={!state.doc}>
        Export JSON
      </button>
      <button className={btnClass} onClick={handleExportYAML} disabled={!state.doc}>
        Export YAML
      </button>
      <button className={btnClass} onClick={handleExportMarkdown} disabled={!state.doc}>
        Export Markdown
      </button>
    </header>
  );
}
