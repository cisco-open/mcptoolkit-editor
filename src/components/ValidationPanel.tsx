// Copyright 2026 Cisco Systems, Inc. and its affiliates
//
// SPDX-License-Identifier: Apache-2.0

import { Fragment, useId, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronDown, ChevronRight, ExternalLink, Minus, Plus } from 'lucide-react';
import type { McpDescriptionRuleResultStatus } from '@mcpdesc/validator/browser';
import { useDoc } from '../hooks/useDoc';
import editorPackage from '../../package.json';
import ruleMetadata from '../core/rule-titles.generated.json';
import { diagnosticMessage } from '../core/diagnosticMessage';
import { validationRows } from './validationRows';

const DEFAULT_FONT_SIZE = 12;
const MIN_FONT_SIZE = 10;
const MAX_FONT_SIZE = 22;
const titles: Readonly<Record<string, string>> = ruleMetadata.titles;

const statuses: { value: McpDescriptionRuleResultStatus; label: string }[] = [
  { value: 'failed', label: 'Failed' },
  { value: 'warning', label: 'Warning' },
  { value: 'passed', label: 'Passed' },
  { value: 'not-applicable', label: 'Not applicable' },
  { value: 'not-evaluated', label: 'Not evaluated' },
];

const columns = [
  { key: 'rule', label: 'Rule Identifier' },
  { key: 'title', label: 'Rule Title' },
  { key: 'protocolVersion', label: 'Protocol' },
  { key: 'status', label: 'Status' },
] as const;

type SortKey = typeof columns[number]['key'];
interface SortState { key: SortKey; direction: 'ascending' | 'descending' }

function SortHeader({ column, sort, onSort }: {
  column: { key: SortKey; label: string }; sort: SortState; onSort: (sort: SortState) => void;
}) {
  const active = sort.key === column.key;
  const SortIcon = !active ? ArrowUpDown : sort.direction === 'ascending' ? ArrowUp : ArrowDown;
  const width = ({ rule: 'w-[34%]', title: 'w-[36%]', protocolVersion: 'w-[15%]', status: 'w-[15%]' } as const)[column.key];
  return <th scope="col" aria-sort={active ? sort.direction : 'none'} className={`border-b border-zinc-700 px-2 text-left ${width}`}>
    <button type="button" aria-label={`Sort by ${column.label}`} className="flex items-center gap-1 whitespace-nowrap text-zinc-300 hover:text-white" onClick={() => onSort({
      key: column.key, direction: active && sort.direction === 'ascending' ? 'descending' : 'ascending',
    })}>{column.label}<SortIcon size={12} aria-hidden="true" /></button>
  </th>;
}

function ruleDocumentationUrl(selector: string | null | undefined, rule: string): string | undefined {
  if (selector !== ruleMetadata.selector) return undefined;
  const match = /^([a-z][a-z0-9-]*)\.([a-z0-9.-]+)$/.exec(rule);
  return match ? `https://mcpdesc.org/docs/rules/${selector}/${match[1]}/${match[2].replace(/\./g, '-')}/` : undefined;
}

export default function ValidationPanel() {
  const { state, revealPathRef } = useDoc();
  const [expanded, setExpanded] = useState<boolean | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(() => new Set());
  const [selectedStatuses, setSelectedStatuses] = useState<Set<McpDescriptionRuleResultStatus>>(() => new Set(['passed', 'failed', 'warning']));
  const [sort, setSort] = useState<SortState>({ key: 'status', direction: 'ascending' });
  const [fontSize, setFontSize] = useState(DEFAULT_FONT_SIZE);
  const [resizedHeight, setResizedHeight] = useState<number | null>(null);
  const resizing = useRef<{ startY: number; height: number } | null>(null);
  const rulesId = useId();
  const { validation } = state;
  const hasContent = state.text.trim().length > 0;
  const rows = validationRows(validation, state.doc);
  const ruleTitle = (rule: string) => validation.selector === ruleMetadata.selector ? titles[rule] ?? '' : '';
  const compare = (left: string, right: string, order: SortState) => {
    const compared = left.localeCompare(right);
    return order.direction === 'ascending' ? compared : -compared;
  };
  const errorCount = validation.errors.length;
  const warnCount = validation.warnings.length;
  const hasDiagnostics = errorCount + warnCount > 0;
  const filteredRows = rows.filter((row) => selectedStatuses.has(row.status)).sort((left, right) => {
    if (sort.key === 'status') {
      const compared = statuses.findIndex(({ value }) => value === left.status) - statuses.findIndex(({ value }) => value === right.status);
      if (compared) return sort.direction === 'ascending' ? compared : -compared;
      return (left.rule ?? '').localeCompare(right.rule ?? '') || (left.protocolVersion ?? '').localeCompare(right.protocolVersion ?? '');
    }
    const value = (row: typeof left) => sort.key === 'title' ? row.rule ? ruleTitle(row.rule) : 'Source / system finding'
      : row[sort.key] ?? '';
    return compare(value(left), value(right), sort);
  });
  const statusCounts = new Map<McpDescriptionRuleResultStatus, number>();
  for (const row of rows) statusCounts.set(row.status, (statusCounts.get(row.status) ?? 0) + 1);
  const panelExpanded = hasContent && (expanded ?? hasDiagnostics) && rows.length > 0;
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
      ? `${errorCount} error${errorCount > 1 ? 's' : ''}${warnCount ? `, ${warnCount} warning${warnCount > 1 ? 's' : ''}` : ''}`
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
        <button type="button" aria-label={`${panelExpanded ? 'Collapse' : 'Expand'} validation rules`} aria-expanded={panelExpanded}
          aria-controls={rulesId} disabled={!hasContent || rows.length === 0}
          className="flex items-center gap-1 text-left disabled:cursor-default" onClick={() => setExpanded(!panelExpanded)}>
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
        <section id={rulesId} aria-label="Validation rules" className="border-t border-zinc-800 px-3 pb-2">
          <fieldset className="flex flex-wrap items-center gap-x-4 gap-y-2 py-2">
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
          </fieldset>
          <div data-testid="validation-table-viewport" className="overflow-auto" style={{ height: tableHeight }}>
            <table className="w-full min-w-[48rem] table-fixed text-left">
              <caption className="sr-only">Validation rule results</caption>
              <thead className="sticky top-0 bg-zinc-900"><tr style={{ height: rowHeight }}>{columns.map((column) => (
                <SortHeader key={column.key} column={column} sort={sort} onSort={setSort} />
              ))}</tr></thead>
              <tbody>{filteredRows.map((result) => {
                const href = result.rule && ruleDocumentationUrl(validation.selector, result.rule);
                const title = result.rule ? ruleTitle(result.rule) : 'Source / system finding';
                const detailsExpanded = result.standalone || expandedRows.has(result.id);
                const detailsId = `${rulesId}-${result.id}`;
                return <Fragment key={result.id}><tr style={{ height: rowHeight }}>
                  <td className="px-2"><div className="flex min-w-0 items-center gap-1.5">
                    {result.diagnostics.length > 0 && !result.standalone && <button type="button"
                      aria-label={`${detailsExpanded ? 'Collapse' : 'Expand'} findings for ${result.rule}${result.protocolVersion ? ` (${result.protocolVersion})` : ''}`}
                      aria-expanded={detailsExpanded} aria-controls={detailsId} className="shrink-0 p-0.5 text-zinc-300 hover:text-white"
                      onClick={() => setExpandedRows((previous) => {
                        const next = new Set(previous);
                        if (next.has(result.id)) next.delete(result.id); else next.add(result.id);
                        return next;
                      })}>{detailsExpanded ? <ChevronDown size={14} aria-hidden="true" /> : <ChevronRight size={14} aria-hidden="true" />}</button>}
                    <span className="min-w-0 truncate" title={result.rule}>{result.rule ?? 'Source / system'}</span>
                    {href && <a href={href} target="_blank" rel="noopener noreferrer" title={`Open documentation for ${result.rule}`}
                      aria-label={`Open documentation for ${result.rule}`} className="shrink-0 p-0.5 text-sky-400 hover:text-sky-200"><ExternalLink size={12} aria-hidden="true" /></a>}
                  </div></td>
                  <td className="truncate px-2 text-zinc-300" title={title || undefined}>{title || 'Title unavailable'}</td>
                  <td className="px-2 tabular-nums">{result.protocolVersion ?? ''}</td>
                  <td title={result.reason} className={`truncate px-2 ${result.status === 'passed' ? 'text-green-400' : result.status === 'failed' ? 'text-red-400' : result.status === 'warning' ? 'text-yellow-400' : 'text-zinc-400'}`}>
                    {statuses.find(({ value }) => value === result.status)?.label}
                    {result.diagnostics.length > 0 && <span className="text-zinc-400"> ({result.diagnostics.length})</span>}
                    {result.reason && <span className="sr-only"> ({result.reason})</span>}
                  </td>
                </tr>
                  {detailsExpanded && result.diagnostics.length > 0 && <tr id={detailsId}><td colSpan={4} className="bg-zinc-950 px-3 py-2">
                    <ul className="space-y-2">{result.diagnostics.map((issue, index) => {
                      const location = `${issue.path}${issue.line ? ` (line ${issue.line}${issue.column ? `, column ${issue.column}` : ''})` : ''}`;
                      const message = diagnosticMessage(issue);
                      return <li key={index} className="flex flex-wrap items-baseline gap-x-2">
                        <span className={issue.severity === 'error' ? 'text-red-400' : 'text-yellow-400'}>{issue.severity === 'error' ? 'Error' : 'Warning'}</span>
                        <button type="button" title={location} className="max-w-full break-all text-left text-sky-300 underline" onClick={() => revealPathRef.current?.(issue.path)}>{location}</button>
                        <span className="min-w-0 break-words text-zinc-200 [overflow-wrap:anywhere]">{message}</span>
                        {issue.keyword && <span className="break-all text-zinc-500">{issue.keyword}</span>}
                        {issue.protocolVersions?.length ? <span className="text-zinc-500">{issue.protocolVersions.join(', ')}</span> : null}
                        {issue.relatedLocations?.map((related) => (
                          <span key={`${related.relation}:${related.path}`} className="text-zinc-400">
                            {related.relation === 'component-definition' ? 'Defined at ' : `${related.relation}: `}
                            <button type="button" className="break-all text-left text-sky-300 underline" onClick={() => revealPathRef.current?.(related.path)}>{related.path}</button>
                          </span>
                        ))}
                        {(issue.detail || message !== issue.message) && <details className="w-full text-zinc-500">
                          <summary className="cursor-pointer select-none hover:text-zinc-300">Validator details</summary>
                          <dl className="mt-1 grid grid-cols-[auto_minmax(0,1fr)] gap-x-2 pl-4">
                            <dt>Message</dt><dd className="break-words [overflow-wrap:anywhere]">{issue.message}</dd>
                            {issue.detail && <><dt>Detail</dt><dd><code className="break-all">{JSON.stringify(issue.detail)}</code></dd></>}
                          </dl>
                        </details>}
                      </li>;
                    })}</ul>
                  </td></tr>}
                </Fragment>;
              })}</tbody>
            </table>
            {filteredRows.length === 0 && <p className="py-3 text-zinc-500" role="status">
              No validation results match the selected filters.
            </p>}
          </div>
        </section>
      )}
    </div>
  );
}
