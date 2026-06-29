// Copyright 2026 Cisco Systems, Inc. and its affiliates
//
// SPDX-License-Identifier: Apache-2.0

import { useEffect, useMemo, useState, useCallback } from 'react';
import { marked } from 'marked';
import type { McpDescDocument, ValidationResult } from '@core/types';

// Configure marked for inline rendering
marked.setOptions({ breaks: true });

/** Render function for type badges. Receives children, section key, item identifier, and optional color. */
export type BadgeRenderer = (
  children: React.ReactNode,
  section: string,
  value: string,
  color?: string,
) => React.ReactNode;

// ============================================================================
// Shared sub-components
// ============================================================================

/** Render a description string: normalize indentation, newline after ".", render as markdown */
function Desc({ text }: { text: string }) {
  const html = useMemo(() => {
    const rawLines = text.split('\n');
    const indents = rawLines.filter(l => l.trim().length > 0).map(l => l.match(/^(\s*)/)?.[1].length ?? 0);
    const minIndent = indents.length ? Math.min(...indents) : 0;
    let formatted = minIndent > 0
      ? rawLines.map(l => l.slice(minIndent)).join('\n')
      : text;
    formatted = formatted.replace(/(?<!\d)\.\s+/g, '.\n\n');
    const fmtLines = formatted.split('\n');
    const fixed: string[] = [];
    const listRe = /^\s*(?:[-*]|\d+\.)\s/;
    for (let i = 0; i < fmtLines.length; i++) {
      const line = fmtLines[i];
      if (listRe.test(line) && i > 0) {
        const prev = fmtLines[i - 1];
        if (!listRe.test(prev) && prev.trim() !== '') {
          fixed.push('');
        }
      }
      fixed.push(line);
    }
    formatted = fixed.join('\n');
    return marked.parse(formatted) as string;
  }, [text]);

  return (
    <div
      className="text-gray-600 text-xs max-w-none
        [&_p]:my-1 [&_ul]:my-1 [&_ul]:pl-5 [&_ul]:list-disc
        [&_ol]:my-1 [&_ol]:pl-5 [&_ol]:list-decimal [&_li]:my-0
        [&_code]:text-xs [&_code]:bg-gray-100 [&_code]:px-1 [&_code]:rounded
        [&_a]:text-blue-600"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

function Badge({ children, color = 'bg-gray-200 text-gray-700' }: { children: React.ReactNode; color?: string }) {
  return (
    <span className={`inline-block text-xs px-2 py-0.5 rounded-full ${color} mr-1 mb-1`}>
      {children}
    </span>
  );
}

function Tag({ value }: { value: string }) {
  return <Badge color="bg-indigo-100 text-indigo-700">{value}</Badge>;
}

function Section({ title, count, children, defaultOpen = true }: {
  title: string; count?: number; children: React.ReactNode; defaultOpen?: boolean;
}) {
  return (
    <details open={defaultOpen} className="mb-4">
      <summary className="cursor-pointer select-none font-semibold text-sm text-gray-700 hover:text-gray-900 py-1">
        {title}{count !== undefined && <span className="ml-1 text-gray-400">({count})</span>}
      </summary>
      <div className="pl-2 pt-1">{children}</div>
    </details>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  if (value === undefined || value === null || value === '') return null;
  return (
    <div className="flex gap-2 text-sm py-0.5">
      <span className="text-gray-400 min-w-[110px] shrink-0">{label}</span>
      <span className="text-gray-800 break-all">{typeof value === 'string' ? value : value}</span>
    </div>
  );
}

/** Static type badge (no editor navigation) */
function TypeBadge({ children, color = 'bg-gray-200 text-gray-500' }: {
  children: React.ReactNode; color?: string;
}) {
  return (
    <span className={`inline-block text-xs px-1.5 py-0.5 rounded ${color} shrink-0`}>
      {children}
    </span>
  );
}

function JsonBlock({ data }: { data: unknown }) {
  return (
    <pre className="text-xs bg-gray-50 border border-gray-200 rounded p-2 overflow-auto max-h-48 text-gray-700 mt-1">
      {JSON.stringify(data, null, 2)}
    </pre>
  );
}

/** Visual JSON Schema renderer — top-level properties as a table, nested as JSON */
function SchemaView({ schema, level = 0 }: { schema: Record<string, unknown>; level?: number }) {
  const type = schema.type as string | undefined;
  const properties = schema.properties as Record<string, Record<string, unknown>> | undefined;
  const required = (schema.required as string[]) ?? [];
  const items = schema.items as Record<string, unknown> | undefined;
  const enumValues = schema.enum as unknown[] | undefined;
  const description = schema.description as string | undefined;
  const oneOf = schema.oneOf as Record<string, unknown>[] | undefined;
  const anyOf = schema.anyOf as Record<string, unknown>[] | undefined;

  if (!properties && !enumValues && !items && !oneOf && !anyOf) {
    if (type && Object.keys(schema).filter(k => k !== 'type' && k !== 'description').length === 0) {
      return (
        <div className="mt-1">
          {description && <p className="text-gray-500 text-xs italic">{description}</p>}
          <span className="text-xs text-blue-600 font-mono">{type}</span>
        </div>
      );
    }
    return <JsonBlock data={schema} />;
  }

  return (
    <div className={`${level > 0 ? 'ml-4 border-l-2 border-gray-200 pl-3' : ''} mt-1`}>
      {level === 0 && description && (
        <p className="text-gray-500 text-xs mb-2 italic">{description}</p>
      )}

      {(oneOf || anyOf) && (
        <div className="space-y-2">
          <span className="text-xs text-gray-400 font-medium">{oneOf ? 'oneOf' : 'anyOf'}:</span>
          {(oneOf ?? anyOf)!.map((variant, i) => (
            <div key={i} className="border-l-2 border-blue-200 pl-3">
              <SchemaView schema={variant} level={level + 1} />
            </div>
          ))}
        </div>
      )}

      {properties && (
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="text-xs text-gray-400 border-b border-gray-200">
              <th className="text-left py-1 pr-3 font-medium">Property</th>
              <th className="text-left py-1 pr-3 font-medium">Type</th>
              <th className="text-left py-1 font-medium">Description</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(properties).map(([name, prop]) => {
              const propType = prop.type as string | string[] | undefined;
              const isRequired = required.includes(name);
              const propDesc = prop.description as string | undefined;
              const propEnum = prop.enum as unknown[] | undefined;
              const propDefault = prop.default;
              const isNested = prop.properties != null;
              const isArray = propType === 'array';
              const propItems = prop.items as Record<string, unknown> | undefined;
              const typeLabel = Array.isArray(propType) ? propType.join(' | ') : propType ?? 'any';

              return (
                <tr key={name} className="border-b border-gray-100 align-top">
                  <td className="py-1.5 pr-3">
                    <code className="font-mono text-gray-800 text-xs">{name}</code>
                    {isRequired && <span className="text-red-500 ml-0.5 text-xs">*</span>}
                  </td>
                  <td className="py-1.5 pr-3 whitespace-nowrap">
                    <span className="font-mono text-blue-600 text-xs">
                      {isArray && propItems ? `${(propItems.type as string) ?? 'object'}[]` : typeLabel}
                    </span>
                    {propEnum && (
                      <div className="mt-0.5 flex flex-wrap gap-0.5">
                        {propEnum.map((v, i) => (
                          <span key={i} className="inline-block text-xs bg-gray-100 text-gray-600 rounded px-1 font-mono">
                            {JSON.stringify(v)}
                          </span>
                        ))}
                      </div>
                    )}
                    {propDefault !== undefined && (
                      <div className="text-xs text-gray-400 mt-0.5">
                        default: <span className="font-mono">{JSON.stringify(propDefault)}</span>
                      </div>
                    )}
                  </td>
                  <td className="py-1.5 text-gray-500 text-xs">
                    {propDesc}
                    {isNested && <SchemaView schema={prop} level={level + 1} />}
                    {isArray && propItems && !!propItems.properties && (
                      <SchemaView schema={propItems} level={level + 1} />
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {!properties && type === 'array' && items && (
        <div>
          <span className="text-xs font-mono text-blue-600">{(items.type as string) ?? 'any'}[]</span>
          {!!items.properties && <SchemaView schema={items} level={level + 1} />}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Section cards
// ============================================================================

function InfoCard({ doc }: { doc: McpDescDocument }) {
  const { info } = doc;
  return (
    <div className="mb-6">
      <div className="flex items-center gap-3 mb-2">
        <h1 className="text-2xl font-bold text-gray-900">{info.title ?? info.name}</h1>
        <span className="inline-block text-xs font-medium px-2.5 py-1 rounded-full bg-green-100 text-green-700">
          {info.version}
        </span>
      </div>

      {info.description && <div className="mb-3"><Desc text={info.description} /></div>}
      <div className="space-y-0.5">
        {info.protocolVersion && <InfoRow label="MCP Protocol" value={info.protocolVersion} />}
        {info.id && <InfoRow label="ID" value={<code className="text-xs bg-gray-100 text-gray-800 px-1 rounded">{info.id}</code>} />}
        {info.websiteUrl && <InfoRow label="Website" value={<a className="text-blue-600 underline" href={info.websiteUrl} target="_blank" rel="noopener noreferrer">{info.websiteUrl}</a>} />}
        {info.icons?.length ? (
          <InfoRow label="Icons" value={
            <div className="flex gap-2 flex-wrap items-center">
              {info.icons.map((icon, i) => (
                <span key={i} className="inline-flex items-center gap-1 bg-gray-100 rounded px-1.5 py-0.5 text-xs">
                  <img src={icon.src} alt="" className="w-4 h-4 inline-block" />
                  {icon.sizes?.join(', ')}{icon.theme && <span className="text-gray-400">({icon.theme})</span>}
                </span>
              ))}
            </div>
          } />
        ) : null}
        {info.license && <InfoRow label="License" value={info.license.name} />}
        {info.contact && (
          <InfoRow label="Contact" value={`${info.contact.name ?? ''}${info.contact.email ? ` <${info.contact.email}>` : ''}`} />
        )}
      </div>
    </div>
  );
}

function TransportsCard({ doc, badge }: { doc: McpDescDocument; badge: BadgeRenderer }) {
  return (
    <div className="mb-4">
      <div className="font-semibold text-sm text-gray-700 py-1">
        Transports{doc.transports?.length ? <span className="ml-1 text-gray-400">({doc.transports.length})</span> : null}
      </div>
      <div className="pl-2 pt-1">
        {doc.transports?.length ? doc.transports.map((t, i) => (
          <div key={i} className="mb-2 p-2 rounded bg-gray-50 border border-gray-200 text-sm">
            {badge(t.type, 'transports', t.type, 'bg-sky-100 text-sky-700')}
            {t.url && <span className="ml-2 text-gray-700">{t.url}</span>}
            {t.command && (
              <code className="ml-2 text-xs text-amber-700 bg-gray-100 px-1 rounded">
                {t.command}{t.args ? ` ${t.args.join(' ')}` : ''}
              </code>
            )}
          </div>
        )) : (
          <p className="text-sm text-gray-400 italic">No transport defined</p>
        )}
      </div>
    </div>
  );
}

function SecurityCard({ doc, defaultOpen, badge }: { doc: McpDescDocument; defaultOpen: boolean; badge: BadgeRenderer }) {
  if (!doc.security?.length) return null;
  return (
    <Section title="Security" count={doc.security.length} defaultOpen={defaultOpen}>
      {doc.security.map((s, i) => (
        <div key={i} className="mb-2 p-2 rounded bg-gray-50 border border-gray-200 text-sm">
          {badge(s.type, 'security', s.type, 'bg-rose-100 text-rose-700')}
          {s.scheme && <span className="text-gray-500 ml-1">{s.scheme}</span>}
          {s.bearerFormat && <span className="text-gray-400 ml-1">({s.bearerFormat})</span>}
          {s.description && <div className="mt-1"><Desc text={s.description} /></div>}
        </div>
      ))}
    </Section>
  );
}

function ToolsCard({ doc, errorPaths, defaultOpen, badge, disabledTags }: { doc: McpDescDocument; errorPaths: Set<string>; defaultOpen: boolean; badge: BadgeRenderer; disabledTags: Set<string> }) {
  if (!doc.tools?.length) return null;
  const visible = doc.tools.filter((t, i) => {
    if (errorPaths.has(`/tools/${i}`)) return false;
    if (disabledTags.size > 0 && t.tags?.length && t.tags.every(tag => disabledTags.has(tag))) return false;
    return true;
  });
  if (!visible.length) return null;
  return (
    <Section title="Tools" count={visible.length} defaultOpen={defaultOpen}>
      {visible.map((tool) => {
        const props = tool.inputSchema?.properties as Record<string, unknown> | undefined;
        const hasInputProps = props != null && Object.keys(props).length > 0;
        return (
          <details key={tool.name} open={defaultOpen} className="mb-2 bg-gray-50 border border-gray-200 rounded">
            <summary className="cursor-pointer select-none p-2 hover:bg-gray-100 rounded text-sm flex items-center gap-2">
              {badge('tool', 'tools', tool.name)}
              <span className="font-mono text-amber-600">{tool.name}</span>
              {tool.title && <span className="text-gray-500">{tool.title}</span>}
              {tool.deprecated && <Badge color="bg-red-100 text-red-700">deprecated</Badge>}
              <span className="flex-1" />
              {tool.tags?.map((t) => <Tag key={t} value={t} />)}
            </summary>
            <div className="px-2 pb-2 pt-0 space-y-2">
              <div className="ml-[26px] text-xs space-y-2">
                {tool.description && <Desc text={tool.description} />}
                {tool.annotations && (
                  <div className="flex gap-2 flex-wrap">
                    {tool.annotations.readOnlyHint && <Badge color="bg-green-100 text-green-700">read-only</Badge>}
                    {tool.annotations.destructiveHint && <Badge color="bg-red-100 text-red-700">destructive</Badge>}
                    {tool.annotations.idempotentHint && <Badge color="bg-blue-100 text-blue-700">idempotent</Badge>}
                  </div>
                )}
              </div>
              {hasInputProps && (
                <details className="mt-1 ml-[8px]">
                  <summary className="cursor-pointer select-none text-sm font-sans underline text-gray-900">
                    Input
                  </summary>
                  <div className="pt-1 ml-[18px]">
                    <SchemaView schema={tool.inputSchema!} />
                  </div>
                </details>
              )}
              {tool.outputSchema && (
                <details className="mt-1 ml-[8px]">
                  <summary className="cursor-pointer select-none text-sm font-sans underline text-gray-900">
                    Output
                  </summary>
                  <div className="pt-1 ml-[18px]">
                    <SchemaView schema={tool.outputSchema} />
                  </div>
                </details>
              )}
            </div>
          </details>
        );
      })}
    </Section>
  );
}

function ResourcesCard({ doc, errorPaths, defaultOpen, badge, disabledTags }: { doc: McpDescDocument; errorPaths: Set<string>; defaultOpen: boolean; badge: BadgeRenderer; disabledTags: Set<string> }) {
  const resources = (doc.resources ?? []).filter((r, i) => {
    if (errorPaths.has(`/resources/${i}`)) return false;
    if (disabledTags.size > 0 && r.tags?.length && r.tags.every(tag => disabledTags.has(tag))) return false;
    return true;
  });
  const templates = (doc.resourceTemplates ?? []).filter((rt, i) => {
    if (errorPaths.has(`/resourceTemplates/${i}`)) return false;
    if (disabledTags.size > 0 && rt.tags?.length && rt.tags.every(tag => disabledTags.has(tag))) return false;
    return true;
  });
  const total = resources.length + templates.length;
  if (!total) return null;
  return (
    <Section title="Resources" count={total} defaultOpen={defaultOpen}>
      {resources.map((r) => (
        <details key={r.uri} open={defaultOpen} className="mb-2 bg-gray-50 border border-gray-200 rounded">
          <summary className="cursor-pointer select-none p-2 hover:bg-gray-100 rounded text-sm flex items-center gap-2">
            {badge('resource', 'resources', r.uri)}
            <span className="font-mono text-teal-600">{r.uri}</span>
            <span className="flex-1" />
            {r.tags?.map((t) => <Tag key={t} value={t} />)}
          </summary>
          <div className="px-2 pb-2 pt-0 text-xs space-y-1 ml-[36px]">
            {r.description && <Desc text={r.description} />}
            {r.mimeType && <div className="flex items-center gap-2"><Badge>{r.mimeType}</Badge></div>}
          </div>
        </details>
      ))}
      {templates.map((rt) => (
        <details key={rt.uriTemplate} open={defaultOpen} className="mb-2 bg-gray-50 border border-gray-200 rounded">
          <summary className="cursor-pointer select-none p-2 hover:bg-gray-100 rounded text-sm flex items-center gap-2">
            {badge('resource', 'resourceTemplates', rt.uriTemplate)}
            <span className="font-mono text-teal-600">{rt.uriTemplate}</span>
            <span className="flex-1" />
            {rt.tags?.map((t) => <Tag key={t} value={t} />)}
          </summary>
          <div className="px-2 pb-2 pt-0 text-xs space-y-1 ml-[36px]">
            {rt.description && <Desc text={rt.description} />}
            {rt.mimeType && <div className="flex items-center gap-2"><Badge>{rt.mimeType}</Badge></div>}
          </div>
        </details>
      ))}
    </Section>
  );
}

function PromptsCard({ doc, errorPaths, defaultOpen, badge, disabledTags }: { doc: McpDescDocument; errorPaths: Set<string>; defaultOpen: boolean; badge: BadgeRenderer; disabledTags: Set<string> }) {
  if (!doc.prompts?.length) return null;
  const visible = doc.prompts.filter((p, i) => {
    if (errorPaths.has(`/prompts/${i}`)) return false;
    if (disabledTags.size > 0 && p.tags?.length && p.tags.every(tag => disabledTags.has(tag))) return false;
    return true;
  });
  if (!visible.length) return null;
  return (
    <Section title="Prompts" count={visible.length} defaultOpen={defaultOpen}>
      {visible.map((p) => (
        <details key={p.name} open={defaultOpen} className="mb-2 bg-gray-50 border border-gray-200 rounded">
          <summary className="cursor-pointer select-none p-2 hover:bg-gray-100 rounded text-sm flex items-center gap-2">
            {badge('prompt', 'prompts', p.name)}
            <span className="font-mono text-fuchsia-600">{p.name}</span>
            {p.title && <span className="text-gray-500">{p.title}</span>}
            <span className="flex-1" />
            {p.tags?.map((t) => <Tag key={t} value={t} />)}
          </summary>
          <div className="px-2 pb-2 pt-0 text-xs ml-[30px]">
            {p.description && <Desc text={p.description} />}
            {p.arguments?.length ? (
              <table className="w-full text-xs mt-2">
                <thead>
                  <tr className="text-gray-400">
                    <th className="text-left pr-2">Argument</th>
                    <th className="text-left pr-2">Required</th>
                    <th className="text-left">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {p.arguments.map((a) => (
                    <tr key={a.name} className="border-t border-gray-200">
                      <td className="py-0.5 pr-2 font-mono text-gray-700">{a.name}</td>
                      <td className="py-0.5 pr-2">{a.required ? '✓' : '—'}</td>
                      <td className="py-0.5 text-gray-500">{a.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : null}
          </div>
        </details>
      ))}
    </Section>
  );
}

function TagsCard({ doc, defaultOpen }: { doc: McpDescDocument; defaultOpen: boolean }) {
  if (!doc.tags?.length) return null;
  const sorted = [...doc.tags].sort((a, b) => a.name.localeCompare(b.name));
  return (
    <Section title="Tags" count={doc.tags.length} defaultOpen={defaultOpen}>
      <div className="flex flex-wrap gap-1.5">
        {sorted.map((t) => (
          <span key={t.name} className="inline-flex items-baseline gap-1">
            <Badge color="bg-indigo-100 text-indigo-700">{t.name}</Badge>
            {t.description && <span className="text-gray-500 text-xs mr-2">{t.description}</span>}
          </span>
        ))}
      </div>
    </Section>
  );
}

// ============================================================================
// Tag filter bar
// ============================================================================

function TagFilterBar({ tags, disabledTags, onToggle }: {
  tags: McpDescDocument['tags']; disabledTags: Set<string>; onToggle: (tag: string) => void;
}) {
  if (!tags?.length) return null;
  const sorted = [...tags].sort((a, b) => a.name.localeCompare(b.name));
  return (
    <div className="flex items-center gap-1.5 flex-wrap mb-3 py-1">
      <span className="text-xs text-gray-400 mr-1">Filter:</span>
      {sorted.map((t) => {
        const active = !disabledTags.has(t.name);
        return (
          <button
            key={t.name}
            className={`inline-block text-xs px-2 py-0.5 rounded-full border transition-colors cursor-pointer ${
              active
                ? 'bg-indigo-100 text-indigo-700 border-indigo-300'
                : 'bg-gray-100 text-gray-400 border-gray-200 hover:border-gray-400'
            }`}
            onClick={() => onToggle(t.name)}
            title={t.description ?? t.name}
          >
            {t.name}
          </button>
        );
      })}
      {disabledTags.size > 0 && (
        <button
          className="text-xs text-gray-400 hover:text-gray-600 underline ml-1 cursor-pointer"
          onClick={() => { for (const t of disabledTags) onToggle(t); }}
        >
          reset
        </button>
      )}
    </div>
  );
}

// ============================================================================
// McpDescCardView — public component
// ============================================================================

export interface McpDescCardViewProps {
  doc: McpDescDocument;
  validation?: ValidationResult;
  /** Whether <details> sections start expanded (default: true) */
  defaultOpen?: boolean;
  /** Custom badge renderer — receives (children, section, value, color). Defaults to a static TypeBadge. */
  renderBadge?: BadgeRenderer;
}

export function McpDescCardView({ doc, validation, defaultOpen = true, renderBadge }: McpDescCardViewProps) {
  const [disabledTags, setDisabledTags] = useState<Set<string>>(new Set());

  // Reset filter when the document changes
  useEffect(() => { setDisabledTags(new Set()); }, [doc]);

  const toggleTag = useCallback((tag: string) => {
    setDisabledTags(prev => {
      const next = new Set(prev);
      if (next.has(tag)) next.delete(tag); else next.add(tag);
      return next;
    });
  }, []);

  const badge: BadgeRenderer = renderBadge ?? ((children, _section, _value, color) => (
    <TypeBadge color={color}>{children}</TypeBadge>
  ));

  const errorPaths = useMemo(() => {
    const set = new Set<string>();
    if (!validation) return set;
    for (const err of validation.errors) {
      const m = err.path.match(/^\/(?:tools|resources|resourceTemplates|prompts)\/\d+/);
      if (m) set.add(m[0]);
    }
    return set;
  }, [validation]);

  return (
    <div className="space-y-1">
      <InfoCard doc={doc} />
      <TransportsCard doc={doc} badge={badge} />
      <SecurityCard doc={doc} defaultOpen={defaultOpen} badge={badge} />
      <TagFilterBar tags={doc.tags} disabledTags={disabledTags} onToggle={toggleTag} />
      <ToolsCard doc={doc} errorPaths={errorPaths} defaultOpen={defaultOpen} badge={badge} disabledTags={disabledTags} />
      <ResourcesCard doc={doc} errorPaths={errorPaths} defaultOpen={defaultOpen} badge={badge} disabledTags={disabledTags} />
      <PromptsCard doc={doc} errorPaths={errorPaths} defaultOpen={defaultOpen} badge={badge} disabledTags={disabledTags} />
      <TagsCard doc={doc} defaultOpen={defaultOpen} />
    </div>
  );
}
