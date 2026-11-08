import { useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronRight, Download } from 'lucide-react';
import { nativeExportKinds } from '../nativeExport';
import { useDoc } from '../hooks/useDoc';

export default function ExportMenu({ onJSON, onYAML, onMarkdown }: {
  onJSON: () => void;
  onYAML: () => void;
  onMarkdown: () => void;
}) {
  const { state, requestNativeExport } = useDoc();
  const [open, setOpen] = useState(false);
  const [nativeOpen, setNativeOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const nativeTriggerRef = useRef<HTMLButtonElement>(null);
  const submenuRef = useRef<HTMLDivElement>(null);

  const close = () => { setOpen(false); setNativeOpen(false); };
  useEffect(() => {
    if (!open) return;
    rootRef.current?.querySelector<HTMLButtonElement>('[role="menuitem"]:not(:disabled)')?.focus();
    const outside = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) { setOpen(false); setNativeOpen(false); }
    };
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, [open]);
  useEffect(() => {
    if (nativeOpen) submenuRef.current?.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus();
  }, [nativeOpen]);

  const itemClass = 'flex w-full items-center gap-2 rounded px-3 py-2 text-left text-xs text-zinc-200 hover:bg-zinc-700 focus:bg-zinc-700 focus:outline-none disabled:cursor-not-allowed disabled:text-zinc-500';
  return (
    <div ref={rootRef} className="relative" onKeyDown={(event) => {
      if (event.key === 'Escape') { event.preventDefault(); close(); triggerRef.current?.focus(); }
      if (event.key === 'Tab') close();
      if (!open || !['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const items = Array.from(rootRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]:not(:disabled)') ?? []);
      const current = items.indexOf(document.activeElement as HTMLButtonElement);
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1
        : (current + (event.key === 'ArrowUp' ? -1 : 1) + items.length) % items.length;
      items[next]?.focus();
    }}>
      <button
        ref={triggerRef} type="button" aria-haspopup="menu" aria-expanded={open} disabled={!state.doc}
        className="flex items-center gap-1.5 rounded bg-zinc-800 px-2 py-1 text-xs text-zinc-200 hover:bg-zinc-700 disabled:opacity-40"
        onClick={() => { if (open) close(); else setOpen(true); }}
        onKeyDown={(event) => { if (!open && ['ArrowDown', 'ArrowUp'].includes(event.key)) { event.preventDefault(); event.stopPropagation(); setOpen(true); } }}
      >
        <Download size={14} aria-hidden="true" />Export<ChevronDown size={12} aria-hidden="true" />
      </button>
      {open && (
        <div role="menu" aria-label="Export formats" className="absolute right-0 top-full z-50 mt-1 w-64 max-w-[calc(100vw-1.5rem)] rounded border border-zinc-600 bg-zinc-900 p-1 shadow-xl">
          {[
            { label: 'YAML', action: onYAML }, { label: 'JSON', action: onJSON }, { label: 'Markdown', action: onMarkdown },
          ].map(({ label, action }) => (
            <button key={label} type="button" role="menuitem" className={itemClass} onClick={() => { close(); action(); triggerRef.current?.focus(); }}>{label}</button>
          ))}
          <div className="my-1 border-t border-zinc-700" role="separator" />
          <button
            ref={nativeTriggerRef} type="button" role="menuitem" aria-haspopup="menu" aria-expanded={nativeOpen}
            disabled={state.doc?.mcpdesc !== '0.9.0'} title={state.doc?.mcpdesc !== '0.9.0' ? 'Requires MCP Description 0.9.0' : undefined}
            className={itemClass} onClick={() => setNativeOpen(!nativeOpen)}
            onKeyDown={(event) => { if (event.key === 'ArrowRight') { event.preventDefault(); setNativeOpen(true); } }}
          >Native MCP<ChevronRight size={14} className="ml-auto" aria-hidden="true" /></button>
          {nativeOpen && (
            <div ref={submenuRef} role="menu" aria-label="Native MCP exports" className="ml-3 border-l border-zinc-700 pl-1" onKeyDown={(event) => {
              if (event.key === 'ArrowLeft') { event.preventDefault(); event.stopPropagation(); setNativeOpen(false); nativeTriggerRef.current?.focus(); }
            }}>
              <button type="button" role="menuitem" disabled title="Not yet supported by core native projection" className={itemClass}>Capabilities</button>
              {nativeExportKinds.map(({ kind, label }) => (
                <button key={kind} type="button" role="menuitem" className={itemClass} onClick={() => { triggerRef.current?.focus(); close(); requestNativeExport({ kind }); }}>{label}</button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}