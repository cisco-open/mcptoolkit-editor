import { useMemo, useState } from 'react';
import { projectMcpNativeValue, type McpNativeKind } from '@mcpdesc/core';
import { MCPDESC_RC_SPECIFICATION } from '../../core/validator';
import { useDoc } from '../../hooks/useDoc';

const kinds = [
  { kind: 'tool', collection: 'tools', identity: 'name', label: 'Tools' },
  { kind: 'resource', collection: 'resources', identity: 'uri', label: 'Resources' },
  { kind: 'resourceTemplate', collection: 'resourceTemplates', identity: 'uriTemplate', label: 'Resource templates' },
  { kind: 'prompt', collection: 'prompts', identity: 'name', label: 'Prompts' },
] as const;

export default function NativeProjection() {
  const { state, setSelectedProtocolVersion, revealPathRef } = useDoc();
  const [kind, setKind] = useState<McpNativeKind>('tool');
  const [identifier, setIdentifier] = useState('');
  const doc = state.doc;
  const versions = Array.isArray(doc?.protocolVersions) ? doc.protocolVersions : [];
  const protocolVersion = versions.find((version) => version === state.selectedProtocolVersion) ?? versions[0];
  const config = kinds.find((entry) => entry.kind === kind)!;
  const declarations = doc?.[config.collection];
  const identifiers = Array.isArray(declarations)
    ? declarations.filter((entry) => entry && typeof entry === 'object'
      && (!Array.isArray(entry.protocolVersions) || entry.protocolVersions.includes(protocolVersion)))
      .map((entry) => entry[config.identity]).filter((value): value is string => typeof value === 'string')
    : [];
  const selectedIdentifier = identifiers.includes(identifier) ? identifier : '';
  const result = useMemo(() => doc?.mcpdesc === '0.9.0' && protocolVersion
    ? projectMcpNativeValue(doc, {
      selector: MCPDESC_RC_SPECIFICATION, protocolVersion, kind,
      identifier: selectedIdentifier || undefined,
    })
    : null, [doc, protocolVersion, kind, selectedIdentifier]);

  const download = () => {
    if (!result?.ok) return;
    const url = URL.createObjectURL(new Blob([JSON.stringify(result.value, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `mcp-${kind}-${protocolVersion}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section aria-label="Native MCP projection" className="flex min-h-0 flex-1 flex-col bg-zinc-950 text-xs text-zinc-200">
      <div className="flex flex-wrap items-center gap-2 border-b border-zinc-800 p-2">
        <select aria-label="Native protocol version" value={protocolVersion ?? ''} className="max-w-full border border-zinc-700 bg-zinc-800 p-1.5" onChange={(event) => {
          setSelectedProtocolVersion(versions.find((version) => version === event.target.value) ?? null);
        }}>
          {versions.map((version) => <option key={version} value={version}>{version}</option>)}
        </select>
        <select aria-label="Native declaration kind" value={kind} className="max-w-full border border-zinc-700 bg-zinc-800 p-1.5" onChange={(event) => {
          setKind(event.target.value as McpNativeKind);
          setIdentifier('');
        }}>
          {kinds.map((entry) => <option key={entry.kind} value={entry.kind}>{entry.label}</option>)}
        </select>
        <select aria-label="Native declaration" value={selectedIdentifier} className="min-w-0 max-w-full border border-zinc-700 bg-zinc-800 p-1.5" onChange={(event) => setIdentifier(event.target.value)}>
          <option value="">All declarations</option>
          {[...new Set(identifiers)].map((value) => <option key={value} value={value}>{value}</option>)}
        </select>
        <button type="button" className="ml-auto px-2 py-1 text-sky-300 disabled:opacity-40" disabled={!result?.ok} onClick={download}>Export native JSON</button>
      </div>
      <div className="min-h-0 flex-1 overflow-auto p-3">
        {!result && <p role="status">No native projection available</p>}
        {result?.diagnostics.map((diagnostic, index) => (
          <div key={index} className={`mb-3 break-words ${diagnostic.severity === 'error' ? 'text-red-300' : 'text-amber-300'}`}>
            <button type="button" className="break-all text-left underline" onClick={() => revealPathRef.current?.(`/${diagnostic.path.map((part) => String(part).replace(/~/g, '~0').replace(/\//g, '~1')).join('/')}`)}>
              /{diagnostic.path.join('/')}
            </button>
            <p>{diagnostic.message ?? diagnostic.rule ?? diagnostic.code}</p>
            <p className="break-all text-zinc-400">{diagnostic.rule}</p>
          </div>
        ))}
        {result?.ok && <pre aria-label="Native MCP JSON" className="whitespace-pre-wrap break-words font-mono leading-5">{JSON.stringify(result.value, null, 2)}</pre>}
      </div>
    </section>
  );
}