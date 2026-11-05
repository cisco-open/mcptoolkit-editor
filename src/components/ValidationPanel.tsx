// Copyright 2026 Cisco Systems, Inc. and its affiliates
//
// SPDX-License-Identifier: Apache-2.0

import { useId, useState } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronDown, ChevronRight, ExternalLink } from 'lucide-react';
import type { McpDescriptionRuleResult, McpDescriptionRuleResultStatus } from '@mcpdesc/validator/browser';
import { useDoc } from '../hooks/useDoc';
import editorPackage from '../../package.json';

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
  { key: 'protocolVersion', label: 'Protocol' },
  { key: 'status', label: 'Status' },
] as const;

function ruleDocumentationUrl(selector: string | null | undefined, rule: string): string | undefined {
  if (selector !== '0.9.0-rc.1') return undefined;
  const match = /^([a-z][a-z0-9-]*)\.([a-z0-9.-]+)$/.exec(rule);
  return match ? `https://mcpdesc.org/docs/rules/${selector}/${match[1]}/${match[2].replace(/\./g, '-')}/` : undefined;
}

export default function ValidationPanel() {
  const { state, revealPathRef } = useDoc();
  const [expanded, setExpanded] = useState(false);
  const [selectedStatuses, setSelectedStatuses] = useState<Set<McpDescriptionRuleResultStatus>>(() => new Set(['passed']));
  const [sort, setSort] = useState<{ key: typeof columns[number]['key']; direction: 'ascending' | 'descending' }>({ key: 'rule', direction: 'ascending' });
  const rulesId = useId();
  const { validation } = state;
  const hasContent = state.text.trim().length > 0;
  const results = validation.results ?? [];
  const filteredResults = results.filter((result) => selectedStatuses.has(result.status)).sort((left, right) => {
    const compared = (left[sort.key] ?? '').localeCompare(right[sort.key] ?? '');
    return sort.direction === 'ascending' ? compared : -compared;
  });
  const statusCounts = new Map<McpDescriptionRuleResultStatus, number>();
  for (const result of results) statusCounts.set(result.status, (statusCounts.get(result.status) ?? 0) + 1);

  const errorCount = validation.errors.length;
  const warnCount = validation.warnings.length;
  const diagnostics = errorCount > 0 ? validation.errors : validation.warnings;
  const diagnosticTitle = errorCount > 0 ? 'Errors' : 'Warnings';

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
    <div className="border-t border-zinc-800 bg-zinc-900 text-xs shrink-0">
      <div className="flex flex-wrap items-center gap-2 px-3 py-1.5">
        <button type="button" aria-label={`${expanded ? 'Collapse' : 'Expand'} validation rules`} aria-expanded={hasContent && expanded}
          aria-controls={rulesId} disabled={!hasContent || results.length === 0}
          className="flex items-center gap-1 text-left disabled:cursor-default" onClick={() => setExpanded(!expanded)}>
          {hasContent && expanded ? <ChevronDown size={14} aria-hidden="true" /> : <ChevronRight size={14} aria-hidden="true" />}
          <span role="status" data-testid="validation-status" className={`font-medium ${statusColor}`}>
            {statusIcon} {statusText}
          </span>
        </button>
        {hasContent && validation.selector && (
          <span className="whitespace-nowrap text-zinc-400">Selector: {validation.selector}</span>
        )}
        <span className="text-zinc-600 ml-auto">{state.format.toUpperCase()}</span>
        <span className="whitespace-nowrap text-zinc-500">mcptoolkit-editor v{editorPackage.version}</span>
        <a
          href="https://github.com/cisco-open/mcptoolkit-editor"
          target="_blank"
          rel="noopener noreferrer"
          className="text-zinc-600 hover:text-zinc-300 transition-colors"
          aria-label="GitHub repository"
        >
          <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor" aria-hidden="true">
            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38
              0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13
              -.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66
              .07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15
              -.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0
              1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82
              1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01
              1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
          </svg>
        </a>
      </div>
      {hasContent && diagnostics.length > 0 && (
        <section aria-label={`Validation ${diagnosticTitle.toLowerCase()}`} className="border-t border-zinc-800 bg-zinc-950 px-3 py-2">
          <h2 className={`mb-1 font-medium ${errorCount > 0 ? 'text-red-400' : 'text-yellow-400'}`}>{diagnosticTitle} ({diagnostics.length})</h2>
          <ol className="max-h-32 space-y-2 overflow-auto">
            {diagnostics.map((issue, index) => (
              <li key={index} className="break-words">
                <button type="button" className="break-all text-left text-sky-300 underline" onClick={() => revealPathRef.current?.(issue.path)}>{issue.path}</button>
                <p>{issue.message}</p>
                <p className="break-all text-zinc-400">{issue.rule}{issue.protocolVersions?.length ? ` | ${issue.protocolVersions.join(', ')}` : ''}</p>
              </li>
            ))}
          </ol>
        </section>
      )}
      {hasContent && expanded && results.length > 0 && (
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
          <div className="max-h-56 overflow-auto">
            <table className="w-full min-w-[32rem] table-fixed text-left">
              <caption className="sr-only">Validation rule results</caption>
              <thead className="sticky top-0 bg-zinc-900"><tr>{columns.map(({ key, label }) => {
                const active = sort.key === key;
                const SortIcon = !active ? ArrowUpDown : sort.direction === 'ascending' ? ArrowUp : ArrowDown;
                return <th key={key} scope="col" aria-sort={active ? sort.direction : 'none'} className={`border-b border-zinc-700 pb-2 ${key === 'rule' ? 'w-3/5' : 'w-1/5'}`}>
                  <button type="button" aria-label={`Sort by ${label}`} className="flex items-center gap-1 pr-3 text-zinc-300 hover:text-white" onClick={() => setSort({
                    key, direction: active && sort.direction === 'ascending' ? 'descending' : 'ascending',
                  })}>{label}<SortIcon size={12} aria-hidden="true" /></button>
                </th>;
              })}</tr></thead>
              <tbody>{filteredResults.map((result: McpDescriptionRuleResult, index) => {
                const href = ruleDocumentationUrl(validation.selector, result.rule);
                return <tr key={`${result.rule}:${result.protocolVersion ?? ''}:${index}`}>
                  <td className="py-1 pr-3 align-top"><div className="flex items-start gap-1.5">
                    <span className="break-all">{result.rule}</span>
                    {href && <a href={href} target="_blank" rel="noopener noreferrer" title={`Open documentation for ${result.rule}`}
                      aria-label={`Open documentation for ${result.rule}`} className="shrink-0 p-0.5 text-sky-400 hover:text-sky-200"><ExternalLink size={12} aria-hidden="true" /></a>}
                  </div></td>
                  <td className="py-1 pr-3 align-top tabular-nums">{result.protocolVersion ?? ''}</td>
                  <td className={`py-1 align-top ${result.status === 'passed' ? 'text-green-400' : result.status === 'failed' ? 'text-red-400' : result.status === 'warning' ? 'text-yellow-400' : 'text-zinc-400'}`}>
                    {statuses.find(({ value }) => value === result.status)?.label}
                    {result.reason && <span className="block break-words text-zinc-500">{result.reason}</span>}
                  </td>
                </tr>;
              })}</tbody>
            </table>
            {filteredResults.length === 0 && <p className="py-3 text-zinc-500" role="status">No rule results match the selected statuses.</p>}
          </div>
        </section>
      )}
    </div>
  );
}
