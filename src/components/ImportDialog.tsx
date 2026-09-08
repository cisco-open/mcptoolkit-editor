// Copyright 2026 Cisco Systems, Inc. and its affiliates
//
// SPDX-License-Identifier: Apache-2.0

import { useCallback, useEffect, useRef, useState } from 'react';
import { useDoc } from '../hooks/useDoc';
import { fetchRemoteDocument, MAX_IMPORT_BYTES } from '../importDocument';

interface ImportDialogProps {
  open: boolean;
  initialUrl: string;
  onClose: () => void;
}

export default function ImportDialog({ open, initialUrl, onClose }: ImportDialogProps) {
  const { setText } = useDoc();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const urlInputRef = useRef<HTMLInputElement>(null);
  const autoImportStartedRef = useRef(false);
  const [source, setSource] = useState<'file' | 'url'>(initialUrl ? 'url' : 'file');
  const [url, setUrl] = useState(initialUrl);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const importUrl = useCallback(async (value: string) => {
    setLoading(true);
    setError(null);
    try {
      const text = await fetchRemoteDocument(value);
      setText(text);
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load this URL.');
    } finally {
      setLoading(false);
    }
  }, [onClose, setText]);

  useEffect(() => {
    if (!open) return;
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (!dialog.open) dialog.showModal();

    const handleCancel = (event: Event) => {
      event.preventDefault();
      onClose();
    };
    dialog.addEventListener('cancel', handleCancel);
    return () => {
      dialog.removeEventListener('cancel', handleCancel);
      if (dialog.open) dialog.close();
    };
  }, [onClose, open]);

  useEffect(() => {
    if (open && source === 'url') urlInputRef.current?.focus();
  }, [open, source]);

  useEffect(() => {
    if (!open || !initialUrl || autoImportStartedRef.current) return;
    autoImportStartedRef.current = true;
    void importUrl(initialUrl);
  }, [importUrl, initialUrl, open]);

  const handleFileChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setError(null);
    if (file.size > MAX_IMPORT_BYTES) {
      setError('The document exceeds the 1 MiB import limit.');
      event.target.value = '';
      return;
    }
    try {
      setText(await file.text());
      onClose();
    } catch {
      setError('Unable to read this file.');
    } finally {
      event.target.value = '';
    }
  }, [onClose, setText]);

  if (!open) return null;

  const tabClass = (active: boolean) => [
    'px-3 py-1.5 text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-inset',
    active ? 'bg-zinc-700 text-zinc-50' : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100',
  ].join(' ');

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="import-title"
      className="m-auto w-[calc(100%-2rem)] max-w-lg border border-zinc-700 bg-zinc-900 p-0 text-zinc-100 shadow-2xl [color-scheme:dark] backdrop:bg-black/75"
    >
      <div className="border-b border-zinc-800 px-5 pt-4">
        <h2 id="import-title" className="text-base font-semibold">Import MCP Description</h2>
        <div className="mt-3 mb-3 inline-flex border border-zinc-700 bg-zinc-950" role="group" aria-label="Import source">
          <button
            type="button"
            aria-pressed={source === 'file'}
            className={tabClass(source === 'file')}
            onClick={() => { setSource('file'); setError(null); }}
          >
            File
          </button>
          <button
            type="button"
            aria-pressed={source === 'url'}
            className={tabClass(source === 'url')}
            onClick={() => { setSource('url'); setError(null); }}
          >
            URL
          </button>
        </div>
      </div>

      <div className="p-5">
        {source === 'file' ? (
          <div className="space-y-3">
            <div>
              <span className="block text-sm font-medium text-zinc-200">Local document</span>
              <p id="import-file-help" className="mt-1 text-xs text-zinc-400">JSON or YAML, up to 1 MiB.</p>
            </div>
            <div>
              <input
                id="import-file"
                type="file"
                accept=".json,.yaml,.yml,application/json,application/yaml,text/yaml"
                aria-describedby="import-file-help"
                className="peer sr-only"
                onChange={handleFileChange}
              />
              <label
                htmlFor="import-file"
                className="inline-flex cursor-pointer border border-zinc-600 bg-zinc-800 px-3 py-2 text-sm font-medium text-zinc-100 transition-colors hover:bg-zinc-700 peer-focus-visible:ring-2 peer-focus-visible:ring-blue-400 peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-zinc-900"
              >
                Choose file
              </label>
            </div>
          </div>
        ) : (
          <form
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              void importUrl(url);
            }}
          >
            <label className="block text-sm font-medium text-zinc-200" htmlFor="import-url">
              Public HTTPS URL
            </label>
            <input
              ref={urlInputRef}
              id="import-url"
              type="url"
              required
              placeholder="https://example.com/server.mcpdesc.yaml"
              value={url}
              disabled={loading}
              aria-describedby="import-url-help"
              className="w-full border border-zinc-600 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-400 focus-visible:border-blue-400 focus-visible:ring-2 focus-visible:ring-blue-400/40 disabled:opacity-60"
              onChange={(event) => setUrl(event.target.value)}
            />
            <p id="import-url-help" className="text-xs text-zinc-400">Public HTTPS URL, up to 1 MiB. The server must allow browser CORS requests.</p>
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className="bg-blue-600 px-3 py-1.5 text-sm font-medium text-white outline-none hover:bg-blue-500 focus-visible:ring-2 focus-visible:ring-blue-300 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900 disabled:cursor-wait disabled:opacity-60"
              >
                {loading ? 'Loading…' : 'Import'}
              </button>
            </div>
          </form>
        )}

        {error && <p role="alert" className="mt-4 text-sm text-red-400">{error}</p>}

        <div className="mt-5 flex justify-end border-t border-zinc-800 pt-4">
          <button
            type="button"
            className="border border-zinc-600 bg-zinc-800 px-3 py-1.5 text-sm text-zinc-100 outline-none hover:bg-zinc-700 focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900"
            onClick={onClose}
          >
            Cancel
          </button>
        </div>
      </div>
    </dialog>
  );
}