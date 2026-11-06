// Copyright 2026 Cisco Systems, Inc. and its affiliates
//
// SPDX-License-Identifier: Apache-2.0

import { useId, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronDown, ChevronRight, ExternalLink, Minus, Plus } from 'lucide-react';
import type { McpDescriptionRuleResultStatus } from '@mcpdesc/validator/browser';
import { useDoc } from '../hooks/useDoc';
import editorPackage from '../../package.json';
import ruleMetadata from '../core/rule-titles.generated.json';

const DEFAULT_FONT_SIZE = 12;
const MIN_FONT_SIZE = 10;
const MAX_FONT_SIZE = 22;
const titles: Readonly<Record<string, string>> = ruleMetadata.titles;

const statuses: { value: McpDescriptionRuleResultStatus; label: string }[] = [
  { value: 'passed', label: 'Passed' },
  { value: 'failed', label: 'Failed' },
  { value: 'warning', label: 'Warning' },
  { value: 'not-applicable', label: 'Not applicable' },
  { value: 'not-evaluated', label: 'Not evaluated' },
  { value: 'delegated', label: 'Delegated' },
];

const columns = [
  { key: 'rule', label: 'Rule Identifier' },
  { key: 'title', label: 'Rule Title' },
  { key: 'protocolVersion', label: 'Protocol' },
  { key: 'status', label: 'Status' },
] as const;

const diagnosticColumns = [
  { key: 'path', label: 'Path' },
  { key: 'message', label: 'Message' },
  { key: 'rule', label: 'Rule Identifier' },
  { key: 'protocolVersion', label: 'Protocol' },
] as const;

type SortKey = typeof columns[number]['key'] | typeof diagnosticColumns[number]['key'];
interface SortState { key: SortKey; direction: 'ascending' | 'descending' }

function SortHeader({ column, sort, onSort, diagnostic }: {
  column: { key: SortKey; label: string }; sort: SortState; onSort: (sort: SortState) => void; diagnostic: boolean;
}) {
  const active = sort.key === column.key;
  const SortIcon = !active ? ArrowUpDown : sort.direction === 'ascending' ? ArrowUp : ArrowDown;
  const width = diagnostic
    ? ({ path: 'w-1/5', message: 'w-2/5', rule: 'w-1/4', protocolVersion: 'w-[15%]' } as const)[column.key as 'path' | 'message' | 'rule' | 'protocolVersion']
    : ({ rule: 'w-[28%]', title: 'w-[42%]', protocolVersion: 'w-[15%]', status: 'w-[15%]' } as const)[column.key as 'rule' | 'title' | 'protocolVersion' | 'status'];
  return <th scope="col" aria-sort={active ? sort.direction : 'none'} className={`border-b border-zinc-700 px-2 text-left ${width}`}>
    <button type="button" aria-label={`Sort by ${column.label}`} className="flex items-center gap-1 whitespace-nowrap text-zinc-300 hover:text-white" onClick={() => onSort({
      key: column.key, direction: active && sort.direction === 'ascending' ? 'descending' : 'ascending',
    })}>{column.label}<SortIcon size={12} aria-hidden="true" /></button>
  </th>;
}

function ruleDocumentationUrl(selector: string | null | undefined, rule: string): string | undefined {
  if (selector !== '0.9.0-rc.1') return undefined;
  const match = /^([a-z][a-z0-9-]*)\.([a-z0-9.-]+)$/.exec(rule);
  return match ? `https://mcpdesc.org/docs/rules/${selector}/${match[1]}/${match[2].replace(/\./g, '-')}/` : undefined;
}

export default function ValidationPanel() {
  const { state, revealPathRef } = useDoc();
  const [expanded, setExpanded] = useState(false);
  const [diagnosticsExpanded, setDiagnosticsExpanded] = useState(true);
  const [selectedStatuses, setSelectedStatuses] = useState<Set<McpDescriptionRuleResultStatus>>(() => new Set(['passed']));
  const [sort, setSort] = useState<SortState>({ key: 'rule', direction: 'ascending' });
  const [diagnosticSort, setDiagnosticSort] = useState<SortState>({ key: 'path', direction: 'ascending' });
  const [search, setSearch] = useState('');
  const [protocolFilter, setProtocolFilter] = useState('all');
  const [fontSize, setFontSize] = useState(DEFAULT_FONT_SIZE);
  const [resizedHeight, setResizedHeight] = useState<number | null>(null);
  const resizing = useRef<{ startY: number; height: number } | null>(null);
  const rulesId = useId();
  const { validation } = state;
  const hasContent = state.text.trim().length > 0;
  const results = validation.results ?? [];
  const ruleTitle = (rule: string) => validation.selector === ruleMetadata.selector ? titles[rule] ?? '' : '';
  const compare = (left: string, right: string, order: SortState) => {
    const compared = left.localeCompare(right);
    return order.direction === 'ascending' ? compared : -compared;
  };
  const filteredResults = results.filter((result) => selectedStatuses.has(result.status)).sort((left, right) => {
    const value = (result: typeof left) => sort.key === 'title' ? ruleTitle(result.rule)
      : result[sort.key as 'rule' | 'protocolVersion' | 'status'] ?? '';
    return compare(value(left), value(right), sort);
  });
  const statusCounts = new Map<McpDescriptionRuleResultStatus, number>();
  for (const result of results) statusCounts.set(result.status, (statusCounts.get(result.status) ?? 0) + 1);

  const errorCount = validation.errors.length;
  const warnCount = validation.warnings.length;
  const diagnostics = errorCount > 0 ? validation.errors : validation.warnings;
  const diagnosticTitle = errorCount > 0 ? 'Errors' : 'Warnings';
  const diagnosticMode = diagnostics.length > 0;
  const protocols = [...new Set(diagnostics.flatMap((issue) => issue.protocolVersions ?? []))].sort();
  const effectiveProtocolFilter = (protocolFilter === 'unscoped' && diagnostics.some((issue) => !issue.protocolVersions?.length))
    || protocols.includes(protocolFilter as typeof protocols[number]) ? protocolFilter : 'all';
  const filteredDiagnostics = diagnostics.filter((issue) => {
    const matchesProtocol = effectiveProtocolFilter === 'all'
      || (effectiveProtocolFilter === 'unscoped' ? !issue.protocolVersions?.length : issue.protocolVersions?.some((version) => version === effectiveProtocolFilter));
    const text = [issue.path, issue.message, issue.rule, issue.keyword].filter(Boolean).join(' ').toLowerCase();
    return matchesProtocol && text.includes(search.trim().toLowerCase());
  }).sort((left, right) => {
    const value = (issue: typeof left) => diagnosticSort.key === 'protocolVersion' ? issue.protocolVersions?.join(', ') ?? ''
      : issue[diagnosticSort.key as 'path' | 'message' | 'rule'] ?? '';
    return compare(value(left), value(right), diagnosticSort);
  });
  const panelExpanded = hasContent && (diagnosticMode ? diagnosticsExpanded : expanded && results.length > 0);
  const modeName = diagnosticMode ? diagnosticTitle.toLowerCase() : 'rules';
  const rowHeight = fontSize + 12;
  const defaultHeight = rowHeight * 6;
  const minHeight = rowHeight * 2;
  const maxHeight = Math.max(defaultHeight, Math.floor(window.innerHeight * 0.6));
  const tableHeight = Math.min(maxHeight, Math.max(minHeight, resizedHeight ?? defaultHeight));
  const resize = (height: number) => setResizedHeight(Math.min(maxHeight, Math.max(minHeight, height)));

  const statusColor = !hasContent
    ? 'text-amber-400'
    : errorCount > 0
      ? 'text-red-400'
      : warnCount > 0
        ? 'text-yellow-400'
        : 'text-green-400';
  const statusIcon = !hasContent ? '○' : errorCount > 0 ? '✕' : warnCount > 0 ? '⚠' : '✓';
  const statusText =
    !hasContent
      ? 'No contents'
      : errorCount > 0
      ? `${errorCount} error${errorCount > 1 ? 's' : ''}`
      : warnCount > 0
        ? `${warnCount} warning${warnCount > 1 ? 's' : ''}`
        : 'Valid';

  return (
    <div className="shrink-0 border-t border-zinc-800 bg-zinc-900" style={{ fontSize, lineHeight: `${fontSize + 6}px` }}>
      {panelExpanded && <div role="separator" tabIndex={0} aria-label="Resize validation panel" aria-orientation="horizontal"
        aria-valuemin={minHeight} aria-valuemax={maxHeight} aria-valuenow={tableHeight} aria-controls={rulesId}
        title="Resize validation panel; double-click to reset"
        className="h-1.5 cursor-row-resize touch-none bg-zinc-800 hover:bg-sky-600 focus:bg-sky-600 focus:outline-none"
        onDoubleClick={() => setResizedHeight(null)} onKeyDown={(event) => {
          if (!['ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return;
          event.preventDefault();
          resize(event.key === 'Home' ? minHeight : event.key === 'End' ? maxHeight : tableHeight + (event.key === 'ArrowUp' ? rowHeight : -rowHeight));
        }} onPointerDown={(event) => {
          event.preventDefault();
          resizing.current = { startY: event.clientY, height: tableHeight };
          event.currentTarget.setPointerCapture?.(event.pointerId);
        }} onPointerMove={(event) => {
          if (resizing.current) resize(resizing.current.height + resizing.current.startY - event.clientY);
        }} onPointerUp={() => { resizing.current = null; }} onPointerCancel={() => { resizing.current = null; }} />}
      <div className="flex flex-wrap items-center gap-2 px-3 py-1.5">
        <button type="button" aria-label={`${panelExpanded ? 'Collapse' : 'Expand'} validation ${modeName}`} aria-expanded={panelExpanded}
          aria-controls={rulesId} disabled={!hasContent || (!diagnosticMode && results.length === 0)}
          className="flex items-center gap-1 text-left disabled:cursor-default" onClick={() => diagnosticMode ? setDiagnosticsExpanded(!diagnosticsExpanded) : setExpanded(!expanded)}>
          {panelExpanded ? <ChevronDown size={14} aria-hidden="true" /> : <ChevronRight size={14} aria-hidden="true" />}
          <span role="status" data-testid="validation-status" className={`font-medium ${statusColor}`}>
            {statusIcon} {statusText}
          </span>
        </button>
        {hasContent && validation.selector && (
          <span className="whitespace-nowrap text-zinc-400">Selector: {validation.selector}</span>
        )}
        <div role="group" aria-label="Validation text size" className="ml-auto flex items-center gap-1">
          <button type="button" aria-label="Decrease validation font size" title="Decrease text size" disabled={fontSize <= MIN_FONT_SIZE}
            className="p-1 text-zinc-400 hover:text-white disabled:opacity-30" onClick={() => setFontSize(Math.max(MIN_FONT_SIZE, fontSize - 1))}><Minus size={14} aria-hidden="true" /></button>
          <button type="button" aria-label="Reset validation font size" title="Reset text size" className="min-w-10 text-zinc-400 hover:text-white" onClick={() => setFontSize(DEFAULT_FONT_SIZE)}>{fontSize}px</button>
          <button type="button" aria-label="Increase validation font size" title="Increase text size" disabled={fontSize >= MAX_FONT_SIZE}
            className="p-1 text-zinc-400 hover:text-white disabled:opacity-30" onClick={() => setFontSize(Math.min(MAX_FONT_SIZE, fontSize + 1))}><Plus size={14} aria-hidden="true" /></button>
        </div>
        <span className="text-zinc-600">{state.format.toUpperCase()}</span>
        <span className="whitespace-nowrap text-zinc-500" title={`mcptoolkit-editor v${editorPackage.version}`}><span className="hidden sm:inline">mcptoolkit-editor </span>v{editorPackage.version}</span>
        <a
          href="https://github.com/cisco-open/mcptoolkit-editor"
          target="_blank"
          rel="noopener noreferrer"
          className="text-zinc-600 hover:text-zinc-300 transition-colors"
          aria-label="GitHub repository"
        >
          <ExternalLink size={14} aria-hidden="true" />
        </a>
      </div>
      {panelExpanded && (
        <section id={rulesId} aria-label={`Validation ${modeName}`} className="border-t border-zinc-800 px-3 pb-2">
          {diagnosticMode ? <div className="flex flex-wrap items-center gap-2 py-2">
            <label className="flex min-w-0 flex-1 items-center gap-2"><span className="text-zinc-400">Search:</span>
              <input aria-label="Search diagnostics" type="search" value={search} onChange={(event) => setSearch(event.target.value)}
                className="min-w-0 flex-1 rounded border border-zinc-700 bg-zinc-950 px-2 py-1 text-zinc-200" />
            </label>
            <label className="flex items-center gap-2 text-zinc-400">Protocol:
              <select aria-label="Filter diagnostic protocol" value={effectiveProtocolFilter} onChange={(event) => setProtocolFilter(event.target.value)} className="rounded border border-zinc-700 bg-zinc-950 px-2 py-1 text-zinc-200">
                <option value="all">All</option>
                <option value="unscoped" disabled={!diagnostics.some((issue) => !issue.protocolVersions?.length)}>Unscoped</option>
                {protocols.map((version) => <option key={version} value={version}>{version}</option>)}
              </select>
            </label>
          </div> : <fieldset className="flex flex-wrap items-center gap-x-4 gap-y-2 py-2">
            <legend className="sr-only">Filter by status</legend>
            <span className="font-medium text-zinc-400">Filter:</span>
            {statuses.map(({ value, label }) => {
              const count = statusCounts.get(value) ?? 0;
              return <label key={value} className={`flex items-center gap-1.5 ${count === 0 ? 'text-zinc-600' : 'text-zinc-300'}`}>
                <input type="checkbox" aria-label={label} checked={selectedStatuses.has(value)} disabled={count === 0}
                  className="accent-sky-500" onChange={() => setSelectedStatuses((previous) => {
                    const next = new Set(previous);
                    if (next.has(value)) next.delete(value); else next.add(value);
                    return next;
                  })} />
                {label} <span className="tabular-nums text-zinc-500">({count})</span>
              </label>;
            })}
          </fieldset>}
          <div data-testid="validation-table-viewport" className="overflow-auto" style={{ height: tableHeight }}>
            <table className="w-full min-w-[48rem] table-fixed text-left">
              <caption className="sr-only">{diagnosticMode ? `Validation ${diagnosticTitle.toLowerCase()}` : 'Validation rule results'}</caption>
              <thead className="sticky top-0 bg-zinc-900"><tr style={{ height: rowHeight }}>{(diagnosticMode ? diagnosticColumns : columns).map((column) => (
                <SortHeader key={column.key} column={column} sort={diagnosticMode ? diagnosticSort : sort} onSort={diagnosticMode ? setDiagnosticSort : setSort} diagnostic={diagnosticMode} />
              ))}</tr></thead>
              <tbody>{diagnosticMode ? filteredDiagnostics.map((issue, index) => {
                const location = `${issue.path}${issue.line ? ` (line ${issue.line}${issue.column ? `, column ${issue.column}` : ''})` : ''}`;
                return <tr key={index} style={{ height: rowHeight }}>
                  <td className="px-2"><button type="button" title={location} className="block w-full truncate text-left text-sky-300 underline" onClick={() => revealPathRef.current?.(issue.path)}>{location}</button></td>
                  <td className="truncate px-2" title={`${issue.message}${issue.keyword ? ` (${issue.keyword})` : ''}`}>{issue.message}</td>
                  <td className="truncate px-2 text-zinc-400" title={issue.rule}>{issue.rule ?? 'Not specified'}</td>
                  <td className="truncate px-2 tabular-nums" title={issue.protocolVersions?.join(', ')}>{issue.protocolVersions?.join(', ') ?? ''}</td>
                </tr>;
              }) : filteredResults.map((result, index) => {
                const href = ruleDocumentationUrl(validation.selector, result.rule);
                const title = ruleTitle(result.rule);
                return <tr key={`${result.rule}:${result.protocolVersion ?? ''}:${index}`} style={{ height: rowHeight }}>
                  <td className="px-2"><div className="flex min-w-0 items-center gap-1.5">
                    <span className="min-w-0 truncate" title={result.rule}>{result.rule}</span>
                    {href && <a href={href} target="_blank" rel="noopener noreferrer" title={`Open documentation for ${result.rule}`}
                      aria-label={`Open documentation for ${result.rule}`} className="shrink-0 p-0.5 text-sky-400 hover:text-sky-200"><ExternalLink size={12} aria-hidden="true" /></a>}
                  </div></td>
                  <td className="truncate px-2 text-zinc-300" title={title || undefined}>{title || 'Title unavailable'}</td>
                  <td className="px-2 tabular-nums">{result.protocolVersion ?? ''}</td>
                  <td title={result.reason} className={`truncate px-2 ${result.status === 'passed' ? 'text-green-400' : result.status === 'failed' ? 'text-red-400' : result.status === 'warning' ? 'text-yellow-400' : 'text-zinc-400'}`}>
                    {statuses.find(({ value }) => value === result.status)?.label}
                    {result.reason && <span className="sr-only"> ({result.reason})</span>}
                  </td>
                </tr>;
              })}</tbody>
            </table>
            {(diagnosticMode ? filteredDiagnostics.length === 0 : filteredResults.length === 0) && <p className="py-3 text-zinc-500" role="status">
              {diagnosticMode ? 'No diagnostics match the selected filters.' : 'No rule results match the selected statuses.'}
            </p>}
          </div>
        </section>
      )}
    </div>
  );
}
