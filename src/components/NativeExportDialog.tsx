import { useEffect, useMemo, useRef, useState } from 'react';
import { Download, X } from 'lucide-react';
import { useDoc } from '../hooks/useDoc';
import { downloadFile, nativeExportFilename, nativeExportKinds, projectNativeExport, type NativeExportRequest } from '../nativeExport';
import type { McpDescDocument, McpProtocolVersion } from '../core/types';

function NativeExportReview({ doc, request }: { doc: McpDescDocument; request: NativeExportRequest }) {
  const { state, closeNativeExport, revealPathRef } = useDoc();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const versions = (Array.isArray(doc.protocolVersions) ? doc.protocolVersions : [])
    .filter((version) => !request.protocolVersions || request.protocolVersions.includes(version));
  const [protocolVersion, setProtocolVersion] = useState<McpProtocolVersion | ''>(() =>
    versions.find((version) => version === state.selectedProtocolVersion) ?? (versions.length === 1 ? versions[0] : ''));
  const [identifier, setIdentifier] = useState(request.identifier ?? '');
  const config = nativeExportKinds.find(({ kind }) => kind === request.kind)!;
  const declarations = doc[config.collection];
  const identifiers = Array.isArray(declarations)
    ? declarations.filter((entry) => entry && typeof entry === 'object'
      && (!protocolVersion || !Array.isArray(entry.protocolVersions) || entry.protocolVersions.includes(protocolVersion)))
      .map((entry) => entry[config.identity]).filter((value): value is string => typeof value === 'string')
    : [];
  const selection = { kind: request.kind, identifier: identifier || undefined };
  const result = useMemo(() => protocolVersion ? projectNativeExport(doc, {
    kind: request.kind, identifier: identifier || undefined,
  }, protocolVersion) : null, [doc, request.kind, identifier, protocolVersion]);
  const serverName = typeof doc.info?.name === 'string' ? doc.info.name : 'mcpdesc';
  const filename = protocolVersion ? nativeExportFilename(serverName, selection, protocolVersion) : '';

  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();
    return () => { if (dialog?.open) dialog.close(); };
  }, []);

  return (
    <dialog ref={dialogRef} aria-labelledby="native-export-title" onCancel={(event) => { event.preventDefault(); closeNativeExport(); }}
      className="m-auto max-h-[85vh] w-[calc(100%-2rem)] max-w-2xl overflow-auto rounded border border-zinc-700 bg-zinc-900 p-5 text-zinc-100 shadow-2xl backdrop:bg-black/65">
      <div className="flex items-center justify-between gap-3">
        <h2 id="native-export-title" className="text-base font-semibold">Export Native MCP: {config.label}</h2>
        <button type="button" title="Close export" aria-label="Close export" className="shrink-0 p-1 text-zinc-400 hover:text-white" onClick={closeNativeExport}><X size={18} aria-hidden="true" /></button>
      </div>
      <div className="my-4 grid gap-3 text-xs sm:grid-cols-2">
        <label className="min-w-0 space-y-1"><span className="block text-zinc-400">Protocol revision</span>
          <select aria-label="Native protocol version" value={protocolVersion} className="w-full border border-zinc-600 bg-zinc-800 p-2" onChange={(event) => setProtocolVersion(versions.find((version) => version === event.target.value) ?? '')}>
            <option value="" disabled>Select protocol revision</option>
            {versions.map((version) => <option key={version} value={version}>{version}</option>)}
          </select>
        </label>
        <label className="min-w-0 space-y-1"><span className="block text-zinc-400">Declaration</span>
          <select aria-label="Native declaration" value={identifier} className="w-full min-w-0 border border-zinc-600 bg-zinc-800 p-2" onChange={(event) => setIdentifier(event.target.value)}>
            <option value="">All declarations</option>
            {[...new Set([...identifiers, ...(identifier ? [identifier] : [])])].map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
        </label>
      </div>
      {result?.diagnostics.map((diagnostic, index) => (
        <div key={index} className={`mb-3 break-words text-xs ${diagnostic.severity === 'error' ? 'text-red-300' : 'text-amber-300'}`}>
          <button type="button" className="break-all text-left underline" onClick={() => {
            closeNativeExport();
            revealPathRef.current?.(`/${diagnostic.path.map((part) => String(part).replace(/~/g, '~0').replace(/\//g, '~1')).join('/')}`);
          }}>/{diagnostic.path.join('/')}</button>
          <p>{diagnostic.message ?? diagnostic.rule ?? diagnostic.code}</p>
          <p className="break-all text-zinc-400">{diagnostic.rule}</p>
        </div>
      ))}
      {result?.ok && <details className="border-t border-zinc-700 py-3 text-xs">
        <summary className="cursor-pointer text-zinc-300">JSON preview</summary>
        <pre aria-label="Native MCP JSON" className="mt-2 max-h-60 overflow-auto whitespace-pre-wrap break-words font-mono leading-5">{JSON.stringify(result.value, null, 2)}</pre>
      </details>}
      <output aria-label="Export filename" className="block break-all text-xs text-zinc-400">{filename}</output>
      <div className="mt-5 flex justify-end gap-2 text-sm">
        <button type="button" className="border border-zinc-700 px-3 py-1.5" onClick={closeNativeExport}>Cancel</button>
        <button type="button" disabled={!result?.ok} className="flex items-center gap-2 bg-blue-600 px-3 py-1.5 disabled:opacity-40" onClick={() => {
          if (!result?.ok) return;
          downloadFile(JSON.stringify(result.value, null, 2), filename);
          closeNativeExport();
        }}><Download size={16} aria-hidden="true" />Download JSON</button>
      </div>
    </dialog>
  );
}

export default function NativeExportDialog() {
  const { nativeExport } = useDoc();
  return nativeExport ? <NativeExportReview doc={nativeExport.doc} request={nativeExport} /> : null;
}