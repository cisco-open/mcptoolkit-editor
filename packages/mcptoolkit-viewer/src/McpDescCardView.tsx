// Copyright 2026 Cisco Systems, Inc. and its affiliates
//
// SPDX-License-Identifier: Apache-2.0

import { useEffect, useId, useMemo, useState, useCallback } from 'react';
import { marked } from 'marked';
import type { McpDescDocument, McpDescElicitation, ValidationResult } from '@core/types';

// Configure marked for inline rendering
marked.setOptions({ breaks: true });

/** Render function for type badges. Receives children, section key, item identifier, and optional color. */
export type BadgeRenderer = (
  children: React.ReactNode,
  section: string,
  value: string,
  color?: string,
  context?: { index: number },
) => React.ReactNode;

export type ExampleDisplayMode = 'hidden' | 'names' | 'details';
export type ProtocolVersionProjectionMode = 'enabled' | 'disabled';

export interface ExampleSelection {
  path: string;
  section: string;
  itemName: string;
  exampleName: string;
  kind: 'examples' | 'interactionExamples' | 'completionExamples';
}

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

function InlineBadge({ children, color = 'bg-gray-200 text-gray-700' }: {
  children: React.ReactNode;
  color?: string;
}) {
  return (
    <span className={`inline-flex items-center text-xs leading-4 px-2 py-0.5 rounded-full ${color}`}>
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

function InfoRow({ label, value, compact = false, alignCenter = false, responsiveWrap = false }: {
  label: React.ReactNode; value: React.ReactNode; compact?: boolean; alignCenter?: boolean; responsiveWrap?: boolean;
}) {
  if (value === undefined || value === null || value === '') return null;
  return (
    <div className={`flex gap-2 ${responsiveWrap ? 'flex-wrap' : ''} ${alignCenter ? 'items-center' : ''} ${compact ? 'text-xs' : 'text-sm'} py-0.5`}>
      <span className="text-gray-400 min-w-[110px] shrink-0">{label}</span>
      <div className={`min-w-0 flex-1 text-gray-800 break-all ${responsiveWrap ? 'basis-[260px]' : ''}`}>{value}</div>
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

function ExamplesView({ examples, title = 'Examples', className = 'mt-2', mode, selection }: {
  examples?: Record<string, unknown>; title?: string; className?: string;
  mode: ExampleDisplayMode;
  selection: Omit<ExampleSelection, 'exampleName'> & { onSelect?: (selection: ExampleSelection) => void };
}) {
  const entries = Object.entries(examples ?? {});
  if (!entries.length || mode === 'hidden') return null;
  return (
    mode === 'names' ? (
      <div className={`${className} flex flex-wrap items-center gap-x-2 gap-y-1 text-xs`}>
        <span className="font-sans text-gray-500">{title}</span>
        {entries.map(([name]) => (
          selection.onSelect ? (
            <button
              key={name}
              className="cursor-pointer font-mono text-xs text-blue-700 underline"
              title="Select example"
              onClick={() => selection.onSelect?.({
                path: `${selection.path}/${name}`,
                section: selection.section,
                itemName: selection.itemName,
                exampleName: name,
                kind: selection.kind,
              })}
            >
              {name}
            </button>
          ) : <span key={name} className="font-mono text-xs text-blue-700">{name}</span>
        ))}
      </div>
    ) : (
      <details className={className}>
        <summary className="cursor-pointer select-none text-sm font-sans underline text-gray-900">
          {title} <span className="text-gray-400">({entries.length})</span>
        </summary>
        <div className="mt-1 ml-[18px] space-y-1">
          {entries.map(([name, example]) => (
            <details key={name}>
              <summary className="cursor-pointer select-none font-mono text-xs text-blue-700">{name}</summary>
              <JsonBlock data={example} />
            </details>
          ))}
        </div>
      </details>
    )
  );
}

function SecurityRequirements({ requirements }: { requirements: McpDescDocument['security'] }) {
  if (requirements === undefined || requirements.length === 0) {
    return <Badge color="bg-blue-50 text-blue-700">none</Badge>;
  }

  return (
    <div className="flex flex-wrap items-center gap-1 text-xs text-gray-600">
      {requirements.map((alternative, alternativeIndex) => {
        const schemes = Object.entries(alternative);
        return (
          <div key={alternativeIndex} className="flex flex-wrap items-center gap-1">
            {alternativeIndex > 0 && <span className="font-medium text-gray-400">OR</span>}
            {schemes.length === 0 ? <Badge color="bg-gray-100 text-gray-600">anonymous</Badge> : schemes.map(([name, scopes], schemeIndex) => (
              <span key={name} className="inline-flex items-center gap-1">
                {schemeIndex > 0 && <span className="font-medium text-gray-400">AND</span>}
                <Badge color="bg-blue-50 text-blue-700">{name}</Badge>
                {scopes.length > 0 && <span className="font-mono text-gray-500">{scopes.join(', ')}</span>}
              </span>
            ))}
          </div>
        );
      })}
    </div>
  );
}

function ClientRequirements({ requirements, inline = false }: {
  requirements?: Record<string, unknown>;
  inline?: boolean;
}) {
  if (!requirements) return null;
  const requirementPaths = capabilityPaths(requirements);
  return (
    <div className={`${inline ? 'flex flex-wrap items-center gap-2' : 'border-t border-gray-200 pt-2'}`}>
      <div className={`${inline ? '' : 'mb-1'} font-medium text-gray-500`}>Client requirements</div>
      <div className="flex flex-wrap items-center gap-1">
        {requirementPaths.map(path => (
          <InlineBadge key={path} color="bg-amber-100 text-amber-800">{path}</InlineBadge>
        ))}
      </div>
    </div>
  );
}

function ElicitationsView({ elicitations, className = 'mt-1 ml-[8px]' }: {
  elicitations?: McpDescElicitation[];
  className?: string;
}) {
  if (!elicitations?.length) return null;
  return (
    <details className={className}>
      <summary className="cursor-pointer select-none text-xs font-sans underline text-gray-900">
        Elicitations <span className="text-gray-400">({elicitations.length})</span>
      </summary>
      <div className="pt-1 ml-[18px] max-w-full overflow-x-auto space-y-3">
        {elicitations.map((elicitation, index) => {
          const componentRef = typeof elicitation.requestedSchema?.$componentRef === 'string'
            ? elicitation.requestedSchema.$componentRef
            : undefined;
          return (
            <div key={`${elicitation.name}-${index}`} className="border-l-2 border-amber-200 pl-3 text-xs">
              <div className="flex flex-wrap items-center gap-1 mb-1">
                <code className="font-mono text-gray-800">{elicitation.name}</code>
                <InlineBadge color={elicitation.mode === 'url'
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-amber-100 text-amber-800'}>
                  {elicitation.mode}
                </InlineBadge>
                {elicitation.protocolVersions?.map(version => (
                  <InlineBadge key={version} color="border border-black bg-white text-black">{version}</InlineBadge>
                ))}
              </div>
              <p className="text-gray-700 mb-1">{elicitation.message}</p>
              {elicitation.when && <InfoRow compact label="When" value={elicitation.when} />}
              {elicitation.mode === 'url' && elicitation.url && (
                <InfoRow compact label="URL" value={
                  <a className="text-blue-600 underline break-all" href={elicitation.url} target="_blank" rel="noopener noreferrer">
                    {elicitation.url}
                  </a>
                } />
              )}
              {elicitation.onDecline && <InfoRow compact label="On decline" value={elicitation.onDecline} />}
              {elicitation.onCancel && <InfoRow compact label="On cancel" value={elicitation.onCancel} />}
              {elicitation.mode === 'form' && elicitation.requestedSchema && (
                <div className="mt-2">
                  <div className="font-medium text-gray-500">Requested input</div>
                  {componentRef
                    ? <code className="inline-block mt-1 text-xs bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded break-all">{componentRef}</code>
                    : <SchemaView schema={elicitation.requestedSchema as Record<string, unknown>} />}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </details>
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
              const propOneOf = prop.oneOf as Record<string, unknown>[] | undefined;
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
                    {propOneOf && (
                      <div className="mt-0.5 flex flex-wrap gap-0.5">
                        {propOneOf.map((option, optionIndex) => (
                          <span key={optionIndex} className="inline-block text-xs bg-gray-100 text-gray-600 rounded px-1">
                            {typeof option.title === 'string' ? option.title : JSON.stringify(option.const)}
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

function InfoCard({ doc, protocolVersionProjectionMode, protocolVersionOptions, selectedProtocolVersion, onProtocolVersionSelect, protocolVersionGroupName }: {
  doc: McpDescDocument;
  protocolVersionProjectionMode: ProtocolVersionProjectionMode;
  protocolVersionOptions?: McpDescDocument['protocolVersions'];
  selectedProtocolVersion?: McpDescDocument['protocolVersions'][number] | null;
  onProtocolVersionSelect?: (protocolVersion: McpDescDocument['protocolVersions'][number] | null) => void;
  protocolVersionGroupName: string;
}) {
  const { info } = doc;
  const showProtocolVersionSelector = protocolVersionProjectionMode === 'enabled'
    && protocolVersionOptions
    && protocolVersionOptions.length > 1
    && onProtocolVersionSelect;
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
        <InfoRow responsiveWrap label="MCP Versions" value={showProtocolVersionSelector ? (
          <fieldset className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <legend className="sr-only">Effective protocol version</legend>
            {protocolVersionOptions.map((version) => (
              <label key={version} className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs font-semibold cursor-pointer rounded-full border border-black bg-white text-black px-2 py-0.5">
                <input
                  type="radio"
                  name={protocolVersionGroupName}
                  value={version}
                  checked={selectedProtocolVersion === version}
                  onChange={() => onProtocolVersionSelect(version)}
                />
                {version}
              </label>
            ))}
            <label className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs font-semibold cursor-pointer rounded-full border border-black bg-white text-black px-2 py-0.5">
              <input
                type="radio"
                name={protocolVersionGroupName}
                value=""
                checked={selectedProtocolVersion == null}
                onChange={() => onProtocolVersionSelect(null)}
              />
              All versions
            </label>
          </fieldset>
        ) : <InlineBadge color="border border-black bg-white text-black font-semibold">{doc.protocolVersions.join(', ')}</InlineBadge>} />
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

function TransportsCard({ doc, defaultOpen, badge }: { doc: McpDescDocument; defaultOpen: boolean; badge: BadgeRenderer }) {
  return (
    <Section title="Transports" count={doc.transports?.length ?? 0} defaultOpen={defaultOpen}>
      {doc.transports?.length ? doc.transports.map((t, i) => (
        <div key={i} className="mb-2 p-2 rounded bg-gray-50 border border-gray-200 text-sm">
        {badge(t.type, 'transports', t.type, 'bg-gray-200 text-gray-500', { index: i })}
            {t.url && <span className="ml-2 text-black">{t.url}</span>}
            {t.command && (
              <code className="ml-2 text-black">
                {t.command}{t.args ? ` ${t.args.join(' ')}` : ''}
              </code>
            )}
            {t.security !== undefined && (
              <div className="mt-2 border-t border-gray-200 pt-2">
                <InfoRow
                  compact
                  alignCenter
                  label="Default Security"
                  value={<SecurityRequirements requirements={t.security} />}
                />
              </div>
            )}
            <ClientRequirements requirements={t.clientRequirements} />
        </div>
      )) : (
        <p className="text-sm text-gray-400 italic">No transport defined</p>
      )}
    </Section>
  );
}

function SecurityCard({ doc, defaultOpen, badge }: { doc: McpDescDocument; defaultOpen: boolean; badge: BadgeRenderer }) {
  const schemes = Object.entries(doc.securitySchemes ?? {});
  return (
    <Section title="Security" defaultOpen={defaultOpen}>
      <InfoRow
        compact
        label={<span className="font-medium text-gray-600">Default</span>}
        value={<SecurityRequirements requirements={doc.security} />}
      />
      {schemes.length > 0 && (
        <div className="mt-2">
          <div className="mb-2 text-xs font-medium text-gray-600">
            Schemes <span className="text-gray-500">({schemes.length})</span>
          </div>
          <div className="space-y-2">{schemes.map(([name, scheme]) => (
          <div key={name} className="mb-2 p-2 rounded bg-gray-50 border border-gray-200 text-sm">
            <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
              {badge(scheme.type, 'securitySchemes', name, 'bg-gray-200 text-gray-500')}
              <code className="font-medium text-blue-700">{name}</code>
              {scheme.description && <span className="text-xs text-gray-500"><Desc text={scheme.description} /></span>}
            </div>
            <div className="mt-1.5 space-y-1 text-xs text-gray-500">
              {scheme.type === 'http' && <InfoRow compact label="Scheme" value={scheme.scheme} />}
              {scheme.type === 'http' && scheme.bearerFormat && <InfoRow compact label="Bearer format" value={scheme.bearerFormat} />}
              {scheme.type === 'apiKey' && <InfoRow compact label="Parameter" value={scheme.name} />}
              {scheme.type === 'apiKey' && <InfoRow compact label="Location" value={scheme.in} />}
              {scheme.type === 'openIdConnect' && <InfoRow compact label="OpenID Connect" value={scheme.openIdConnectUrl} />}
              {scheme.type === 'oauth2' && Object.entries(scheme.flows).map(([flowName, flow]) => (
                <div key={flowName} className="border-l-2 border-gray-200 pl-2">
                  <div className="font-medium text-gray-600">{flowName}</div>
                  {flow.authorizationUrl && <InfoRow compact label="Authorization" value={flow.authorizationUrl} />}
                  {flow.tokenUrl && <InfoRow compact label="Token" value={flow.tokenUrl} />}
                  {flow.refreshUrl && <InfoRow compact label="Refresh" value={flow.refreshUrl} />}
                  {Object.keys(flow.scopes).length > 0 && <InfoRow compact label="Scopes" value={Object.keys(flow.scopes).join(', ')} />}
                </div>
              ))}
            </div>
          </div>
          ))}</div>
        </div>
      )}
    </Section>
  );
}

function capabilityPaths(value: unknown, prefix = ''): string[] {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return prefix ? [prefix] : [];
  }
  const entries = Object.entries(value);
  if (entries.length === 0) return prefix ? [prefix] : [];
  return entries.flatMap(([name, nestedValue]) => (
    capabilityPaths(nestedValue, prefix ? `${prefix}/${name}` : name)
  ));
}

function capabilityLabel(name: string): string {
  return name.charAt(0).toUpperCase() + name.slice(1);
}

function CapabilitiesCard({ doc, defaultOpen, selectedProtocolVersion }: {
  doc: McpDescDocument;
  defaultOpen: boolean;
  selectedProtocolVersion?: McpDescDocument['protocolVersions'][number] | null;
}) {
  if (!doc.capabilities?.length) return null;
  const omittedKeys = new Set(['protocolVersions', 'security', 'clientRequirements', '_meta']);

  return (
    <Section title="Capabilities" defaultOpen={defaultOpen}>
      <div className="space-y-2">
        {doc.capabilities.map((capabilities, capabilityIndex) => {
          const protocolVersions = capabilities.protocolVersions
            ?? (selectedProtocolVersion ? [selectedProtocolVersion] : doc.protocolVersions);
          return (
            <div key={capabilityIndex} className="p-1.5 rounded bg-gray-50 border border-gray-200 text-[11px] flex items-center gap-1.5 whitespace-nowrap">
              <span className="inline-flex items-center leading-4 px-1.5 py-0.5 rounded-full bg-gray-200 text-gray-700 shrink-0">
                {protocolVersions.join(', ')}
              </span>
              {Object.entries(capabilities)
                .filter(([name]) => !omittedKeys.has(name) && name !== 'extensions')
                .map(([name, value]) => {
                  const details = capabilityPaths(value);
                  return (
                    <span key={name} className="text-gray-700 whitespace-nowrap">
                      <span className="font-semibold">{capabilityLabel(name)}</span>
                      {details.length > 0 && <span className="text-gray-500"> ({details.join(', ')})</span>}
                    </span>
                  );
                })}
              {capabilities.extensions && (
                <>
                  <span className="inline-flex items-center leading-4 font-semibold text-gray-700">Extensions</span>
                  {Object.keys(capabilities.extensions).map(extension => (
                    <span key={extension} className="inline-flex items-center leading-4 px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800 shrink-0">
                      {extension}
                    </span>
                  ))}
                </>
              )}
            </div>
          );
        })}
      </div>
    </Section>
  );
}

function ToolsCard({ doc, sourceDoc, selectedProtocolVersion, errorPaths, defaultOpen, badge, disabledTags, exampleDisplay, onExampleSelect }: {
  doc: McpDescDocument; errorPaths: Set<string>; defaultOpen: boolean; badge: BadgeRenderer; disabledTags: Set<string>;
  sourceDoc?: McpDescDocument; selectedProtocolVersion?: McpDescDocument['protocolVersions'][number] | null;
  exampleDisplay: ExampleDisplayMode; onExampleSelect?: (selection: ExampleSelection) => void;
}) {
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
        const toolIndex = doc.tools?.indexOf(tool) ?? -1;
        const sourceTool = selectedProtocolVersion
          ? sourceDoc?.tools?.find(candidate => (
            candidate.name === tool.name && candidate.protocolVersions?.includes(selectedProtocolVersion)
          )) ?? sourceDoc?.tools?.find(candidate => candidate.name === tool.name && !candidate.protocolVersions)
          : tool;
        const toolProtocolVersions = sourceTool?.protocolVersions;
        const props = tool.inputSchema?.properties as Record<string, unknown> | undefined;
        const hasInputProps = props != null && Object.keys(props).length > 0;
        return (
          <details key={`${tool.name}-${toolIndex}`} open={defaultOpen} className="mb-2 bg-gray-50 border border-gray-200 rounded">
            <summary className="cursor-pointer select-none p-2 hover:bg-gray-100 rounded text-sm flex items-center gap-2">
              {badge('tool', 'tools', tool.name, undefined, { index: toolIndex })}
              <span className="font-mono text-amber-600">{tool.name}</span>
              {tool.title && <span className="text-gray-500">{tool.title}</span>}
              {tool.deprecated && <Badge color="bg-red-100 text-red-700">deprecated</Badge>}
              <span className="flex-1" />
              {tool.tags?.map((t) => <Tag key={t} value={t} />)}
            </summary>
            <div className="px-2 pb-2 pt-0 space-y-2">
              <div className="ml-[26px] text-xs space-y-2">
                {tool.description && <Desc text={tool.description} />}
                {toolProtocolVersions?.length && (
                  <div className="flex flex-wrap items-center gap-2 text-gray-500">
                    <span className="font-medium">MCP Version</span>
                    <InlineBadge color="border border-black bg-white text-black">{toolProtocolVersions.join(', ')}</InlineBadge>
                  </div>
                )}
                {tool.annotations && (
                  <div className="flex gap-2 flex-wrap">
                    {tool.annotations.readOnlyHint && <Badge color="bg-green-100 text-green-700">read-only</Badge>}
                    {tool.annotations.destructiveHint && <Badge color="bg-red-100 text-red-700">destructive</Badge>}
                    {tool.annotations.idempotentHint && <Badge color="bg-blue-100 text-blue-700">idempotent</Badge>}
                  </div>
                )}
                {tool.security !== undefined && (
                  <div className="border-t border-gray-200 pt-2">
                    <div className="mb-1 font-medium text-gray-500">Security requirements</div>
                    <SecurityRequirements requirements={tool.security} />
                  </div>
                )}
                {tool.execution && (
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="font-medium text-gray-500">Execution</div>
                    {tool.execution.taskSupport
                      ? <InlineBadge color="bg-amber-100 text-amber-800">task support: {tool.execution.taskSupport}</InlineBadge>
                      : <JsonBlock data={tool.execution} />}
                  </div>
                )}
                <ClientRequirements requirements={tool.clientRequirements} inline />
              </div>
              {hasInputProps && (
                <details className="mt-1 ml-[8px]">
                  <summary className="cursor-pointer select-none text-xs font-sans underline text-gray-900">
                    Input
                  </summary>
                  <div className="pt-1 ml-[18px]">
                    <SchemaView schema={tool.inputSchema!} />
                  </div>
                </details>
              )}
              {tool.outputSchema && (
                <details className="mt-1 ml-[8px]">
                  <summary className="cursor-pointer select-none text-xs font-sans underline text-gray-900">
                    Output
                  </summary>
                  <div className="pt-1 ml-[18px]">
                    <SchemaView schema={tool.outputSchema} />
                  </div>
                </details>
              )}
              <ElicitationsView elicitations={tool.elicitations} />
              <ExamplesView examples={tool.examples} className="mt-1 ml-[8px]" mode={exampleDisplay} selection={{ path: `/tools/${toolIndex}/examples`, section: 'tools', itemName: tool.name, kind: 'examples', onSelect: onExampleSelect }} />
              <ExamplesView examples={tool.interactionExamples} title="Interaction examples" className="mt-1 ml-[8px]" mode={exampleDisplay} selection={{ path: `/tools/${toolIndex}/interactionExamples`, section: 'tools', itemName: tool.name, kind: 'interactionExamples', onSelect: onExampleSelect }} />
            </div>
          </details>
        );
      })}
    </Section>
  );
}

function ResourcesCard({ doc, errorPaths, defaultOpen, badge, disabledTags, exampleDisplay, onExampleSelect }: {
  doc: McpDescDocument; errorPaths: Set<string>; defaultOpen: boolean; badge: BadgeRenderer; disabledTags: Set<string>;
  exampleDisplay: ExampleDisplayMode; onExampleSelect?: (selection: ExampleSelection) => void;
}) {
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
      {resources.map((r) => {
        const resourceIndex = doc.resources?.indexOf(r) ?? -1;
        return <details key={r.uri} open={defaultOpen} className="mb-2 bg-gray-50 border border-gray-200 rounded">
          <summary className="cursor-pointer select-none p-2 hover:bg-gray-100 rounded text-sm flex items-center gap-2">
            {badge('resource', 'resources', r.uri, undefined, { index: resourceIndex })}
            <span className="font-mono text-teal-600">{r.uri}</span>
            <span className="flex-1" />
            {r.tags?.map((t) => <Tag key={t} value={t} />)}
          </summary>
          <div className="px-2 pb-2 pt-0 space-y-2">
            <div className="text-xs space-y-1 ml-[36px]">
              {r.description && <Desc text={r.description} />}
              {r.mimeType && <div className="flex items-center gap-2"><Badge>{r.mimeType}</Badge></div>}
              {r.security !== undefined && (
                <div className="border-t border-gray-200 pt-2">
                  <div className="mb-1 font-medium text-gray-500">Security requirements</div>
                  <SecurityRequirements requirements={r.security} />
                </div>
              )}
              <ClientRequirements requirements={r.clientRequirements} />
            </div>
            <ElicitationsView elicitations={r.elicitations} />
            <ExamplesView examples={r.examples} className="mt-1 ml-[8px]" mode={exampleDisplay} selection={{ path: `/resources/${resourceIndex}/examples`, section: 'resources', itemName: r.name, kind: 'examples', onSelect: onExampleSelect }} />
          </div>
        </details>;
      })}
      {templates.map((rt) => {
        const templateIndex = doc.resourceTemplates?.indexOf(rt) ?? -1;
        return <details key={rt.uriTemplate} open={defaultOpen} className="mb-2 bg-gray-50 border border-gray-200 rounded">
          <summary className="cursor-pointer select-none p-2 hover:bg-gray-100 rounded text-sm flex items-center gap-2">
            {badge('resource', 'resourceTemplates', rt.uriTemplate, undefined, { index: templateIndex })}
            <span className="font-mono text-teal-600">{rt.uriTemplate}</span>
            <span className="flex-1" />
            {rt.tags?.map((t) => <Tag key={t} value={t} />)}
          </summary>
          <div className="px-2 pb-2 pt-0 space-y-2">
            <div className="text-xs space-y-1 ml-[36px]">
              {rt.description && <Desc text={rt.description} />}
              {rt.mimeType && <div className="flex items-center gap-2"><Badge>{rt.mimeType}</Badge></div>}
              {rt.security !== undefined && (
                <div className="border-t border-gray-200 pt-2">
                  <div className="mb-1 font-medium text-gray-500">Security requirements</div>
                  <SecurityRequirements requirements={rt.security} />
                </div>
              )}
              <ClientRequirements requirements={rt.clientRequirements} />
            </div>
            <ElicitationsView elicitations={rt.elicitations} />
            <ExamplesView examples={rt.examples} className="mt-1 ml-[8px]" mode={exampleDisplay} selection={{ path: `/resourceTemplates/${templateIndex}/examples`, section: 'resourceTemplates', itemName: rt.name, kind: 'examples', onSelect: onExampleSelect }} />
            <ExamplesView examples={rt.completionExamples} title="Completion examples" className="mt-1 ml-[8px]" mode={exampleDisplay} selection={{ path: `/resourceTemplates/${templateIndex}/completionExamples`, section: 'resourceTemplates', itemName: rt.name, kind: 'completionExamples', onSelect: onExampleSelect }} />
          </div>
        </details>;
      })}
    </Section>
  );
}

function PromptsCard({ doc, errorPaths, defaultOpen, badge, disabledTags, exampleDisplay, onExampleSelect }: {
  doc: McpDescDocument; errorPaths: Set<string>; defaultOpen: boolean; badge: BadgeRenderer; disabledTags: Set<string>;
  exampleDisplay: ExampleDisplayMode; onExampleSelect?: (selection: ExampleSelection) => void;
}) {
  if (!doc.prompts?.length) return null;
  const visible = doc.prompts.filter((p, i) => {
    if (errorPaths.has(`/prompts/${i}`)) return false;
    if (disabledTags.size > 0 && p.tags?.length && p.tags.every(tag => disabledTags.has(tag))) return false;
    return true;
  });
  if (!visible.length) return null;
  return (
    <Section title="Prompts" count={visible.length} defaultOpen={defaultOpen}>
      {visible.map((p) => {
        const promptIndex = doc.prompts?.indexOf(p) ?? -1;
        return <details key={p.name} open={defaultOpen} className="mb-2 bg-gray-50 border border-gray-200 rounded">
          <summary className="cursor-pointer select-none p-2 hover:bg-gray-100 rounded text-sm flex items-center gap-2">
            {badge('prompt', 'prompts', p.name, undefined, { index: promptIndex })}
            <span className="font-mono text-fuchsia-600">{p.name}</span>
            {p.title && <span className="text-gray-500">{p.title}</span>}
            <span className="flex-1" />
            {p.tags?.map((t) => <Tag key={t} value={t} />)}
          </summary>
          <div className="px-2 pb-2 pt-0 space-y-2">
            <div className="text-xs ml-[30px]">
              {p.description && <Desc text={p.description} />}
              {p.security !== undefined && (
                <div className="mt-2 border-t border-gray-200 pt-2">
                  <div className="mb-1 font-medium text-gray-500">Security requirements</div>
                  <SecurityRequirements requirements={p.security} />
                </div>
              )}
              <ClientRequirements requirements={p.clientRequirements} />
            </div>
            {p.arguments?.length ? (
              <details className="mt-1 ml-[8px]">
                <summary className="cursor-pointer select-none text-xs font-sans underline text-gray-900">
                  Arguments
                </summary>
                <div className="pt-1 ml-[18px]">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="text-xs text-gray-400 border-b border-gray-200">
                        <th className="text-left py-1 pr-3 font-medium">Argument</th>
                        <th className="text-left py-1 pr-3 font-medium">Required</th>
                        <th className="text-left py-1 font-medium">Description</th>
                      </tr>
                    </thead>
                    <tbody>
                      {p.arguments.map((a) => (
                        <tr key={a.name} className="border-b border-gray-100 align-top">
                          <td className="py-1.5 pr-3"><code className="font-mono text-gray-800 text-xs">{a.name}</code></td>
                          <td className="py-1.5 pr-3 text-xs text-gray-500">{a.required ? 'yes' : 'no'}</td>
                          <td className="py-1.5 text-xs text-gray-500">{a.description}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            ) : null}
            <ElicitationsView elicitations={p.elicitations} />
            <ExamplesView examples={p.examples} className="mt-1 ml-[8px]" mode={exampleDisplay} selection={{ path: `/prompts/${promptIndex}/examples`, section: 'prompts', itemName: p.name, kind: 'examples', onSelect: onExampleSelect }} />
            <ExamplesView examples={p.completionExamples} title="Completion examples" className="mt-1 ml-[8px]" mode={exampleDisplay} selection={{ path: `/prompts/${promptIndex}/completionExamples`, section: 'prompts', itemName: p.name, kind: 'completionExamples', onSelect: onExampleSelect }} />
          </div>
        </details>;
      })}
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
  /** Original unprojected document, used to retain declaration scope in effective views. */
  sourceDoc?: McpDescDocument;
  validation?: ValidationResult;
  /** Whether <details> sections start expanded (default: true) */
  defaultOpen?: boolean;
  /** Custom badge renderer — receives (children, section, value, color). Defaults to a static TypeBadge. */
  renderBadge?: BadgeRenderer;
  /** How operation examples are rendered (default: hidden). */
  exampleDisplay?: ExampleDisplayMode;
  /** Receives the exact JSON pointer when a named example is selected. */
  onExampleSelect?: (selection: ExampleSelection) => void;
  /** Whether the host-controlled effective-view projection selector is shown (default: disabled). */
  protocolVersionProjectionMode?: ProtocolVersionProjectionMode;
  /** Protocol versions offered for host-controlled effective-view projection. */
  protocolVersionOptions?: McpDescDocument['protocolVersions'];
  /** Currently selected effective-view protocol version; null shows all versions. */
  selectedProtocolVersion?: McpDescDocument['protocolVersions'][number] | null;
  /** Called when the effective-view protocol version selection changes. */
  onProtocolVersionSelect?: (protocolVersion: McpDescDocument['protocolVersions'][number] | null) => void;
}

export function McpDescCardView({ doc, sourceDoc, validation, defaultOpen = true, renderBadge, exampleDisplay = 'hidden', onExampleSelect, protocolVersionProjectionMode = 'disabled', protocolVersionOptions, selectedProtocolVersion, onProtocolVersionSelect }: McpDescCardViewProps) {
  const [disabledTags, setDisabledTags] = useState<Set<string>>(new Set());
  const protocolVersionGroupName = useId();

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
      <InfoCard
        doc={doc}
        protocolVersionProjectionMode={protocolVersionProjectionMode}
        protocolVersionOptions={protocolVersionOptions}
        selectedProtocolVersion={selectedProtocolVersion}
        onProtocolVersionSelect={onProtocolVersionSelect}
        protocolVersionGroupName={protocolVersionGroupName}
      />
      <CapabilitiesCard doc={doc} defaultOpen={defaultOpen} selectedProtocolVersion={selectedProtocolVersion} />
      <TransportsCard doc={doc} defaultOpen={defaultOpen} badge={badge} />
      <SecurityCard doc={doc} defaultOpen={defaultOpen} badge={badge} />
      <TagFilterBar tags={doc.tags} disabledTags={disabledTags} onToggle={toggleTag} />
      <ToolsCard doc={doc} sourceDoc={sourceDoc} selectedProtocolVersion={selectedProtocolVersion} errorPaths={errorPaths} defaultOpen={defaultOpen} badge={badge} disabledTags={disabledTags} exampleDisplay={exampleDisplay} onExampleSelect={onExampleSelect} />
      <ResourcesCard doc={doc} errorPaths={errorPaths} defaultOpen={defaultOpen} badge={badge} disabledTags={disabledTags} exampleDisplay={exampleDisplay} onExampleSelect={onExampleSelect} />
      <PromptsCard doc={doc} errorPaths={errorPaths} defaultOpen={defaultOpen} badge={badge} disabledTags={disabledTags} exampleDisplay={exampleDisplay} onExampleSelect={onExampleSelect} />
      <TagsCard doc={doc} defaultOpen={defaultOpen} />
    </div>
  );
}
