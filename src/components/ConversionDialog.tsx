import { useEffect, useRef } from 'react';
import type { McpDescriptionConversionFixKind } from '@mcpdesc/core';
import { conversionFixes } from '../core/conversion';
import { MCPDESC_RC_SPECIFICATION } from '../core/validator';
import { useDoc } from '../hooks/useDoc';

export default function ConversionDialog() {
  const { conversion, reviewConversionFixes, applyConversion, cancelConversion, revealPathRef } = useDoc();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const open = Boolean(conversion);

  useEffect(() => {
    if (!open) return;
    const dialog = dialogRef.current;
    dialog?.showModal();
    return () => { if (dialog?.open) dialog.close(); };
  }, [open]);

  if (!conversion) return null;
  const { result, initialResult, fixes } = conversion;

  const downloadReport = () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify({
      selector: MCPDESC_RC_SPECIFICATION, ...result, fixes,
    }, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'mcpdesc-0.9.0-rc.2-conversion.json';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="conversion-title"
      onCancel={(event) => { event.preventDefault(); cancelConversion(); }}
      className="m-auto max-h-[85vh] w-[calc(100%-2rem)] max-w-2xl overflow-auto border border-zinc-700 bg-zinc-900 p-5 text-zinc-100 shadow-2xl backdrop:bg-black/65"
    >
      <h2 id="conversion-title" className="text-base font-semibold">Migrate to MCP Description 0.9.0 RC.2</h2>
      <p className="mt-2 text-sm text-amber-300">Release candidate: 0.9.0 with the explicit 0.9.0-rc.2 schema declaration.</p>
      <div className="mt-4 space-y-3 text-xs">
        {initialResult.diagnostics.filter((diagnostic) => conversionFixes(diagnostic).length > 0).map((diagnostic) => {
          const key = JSON.stringify(diagnostic.path);
          const selected = fixes.find((fix) => JSON.stringify(fix.path) === key)?.fix ?? '';
          return (
            <label key={`${diagnostic.rule}:${key}`} className="block space-y-1">
              <span className="block break-all font-mono">{diagnostic.path.join('/')}</span>
              <span className="block text-zinc-400">{diagnostic.message ?? diagnostic.rule}</span>
              <select
                aria-label={`Fix /${diagnostic.path.join('/')}`}
                className="max-w-full border border-zinc-600 bg-zinc-800 p-1.5"
                value={selected}
                onChange={(event) => reviewConversionFixes([
                  ...fixes.filter((fix) => JSON.stringify(fix.path) !== key),
                  ...(event.target.value ? [{ path: diagnostic.path, fix: event.target.value as McpDescriptionConversionFixKind }] : []),
                ])}
              >
                <option value="">Keep unchanged</option>
                {conversionFixes(diagnostic).map((fix) => (
                  <option key={fix} value={fix}>{fix === 'remove-property' ? 'Remove property' : 'Move to experimental'}</option>
                ))}
              </select>
            </label>
          );
        })}
        {result.diagnostics.map((diagnostic, index) => (
          <div key={index} className={diagnostic.severity === 'error' ? 'text-red-300' : 'text-amber-300'}>
            <button type="button" className="break-all text-left underline" onClick={() => {
              const pointer = diagnostic.path.map((part) => String(part).replace(/~/g, '~0').replace(/\//g, '~1')).join('/');
              cancelConversion();
              revealPathRef.current?.(`/${pointer}`);
            }}>
              /{diagnostic.path.join('/')}
            </button>
            <p className="break-words">{diagnostic.message ?? diagnostic.rule}</p>
            <p className="break-all text-zinc-400">{diagnostic.rule}</p>
          </div>
        ))}
        {result.ok && <pre className="max-h-60 overflow-auto border-t border-zinc-700 pt-3" aria-label="Conversion patch">{JSON.stringify(result.patch, null, 2)}</pre>}
      </div>
      <div className="mt-5 flex flex-wrap justify-end gap-2 text-sm">
        <button type="button" className="px-3 py-1.5 text-sky-300 underline" onClick={downloadReport}>Download report</button>
        <button type="button" className="border border-zinc-700 px-3 py-1.5" onClick={cancelConversion}>Cancel</button>
        <button type="button" disabled={!result.ok} className="bg-blue-600 px-3 py-1.5 disabled:opacity-40" onClick={applyConversion}>Apply migration</button>
      </div>
    </dialog>
  );
}