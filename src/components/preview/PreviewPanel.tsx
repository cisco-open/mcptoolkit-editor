// Copyright 2026 Cisco Systems, Inc. and its affiliates
//
// SPDX-License-Identifier: Apache-2.0

import { useState } from 'react';
import { useDoc } from '../../hooks/useDoc';
import CardView from './CardView';

const DEFAULT_ZOOM = 1.1;
const MIN_ZOOM = 0.7;
const MAX_ZOOM = 2.0;
const ZOOM_STEP = 0.1;

export default function PreviewPanel() {
  const { state, effectiveDoc, resolvedDoc, setSelectedProtocolVersion } = useDoc();
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);

  const fontBtnClass =
    'px-1.5 py-0.5 text-xs rounded bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors cursor-pointer leading-none';

  if (
    state.migration.status === 'confirmation-required'
    || state.migration.status === 'cancelled'
    || state.migration.status === 'failed'
  ) {
    return (
      <div className="flex items-center justify-center h-full bg-white text-gray-500 text-sm px-4">
        <div className="max-w-md text-center">
          <p className="font-medium text-gray-800 mb-2">Unsupported version</p>
          <p>This MCP Description 0.7 document must be migrated to 0.8 before it can be previewed.</p>
        </div>
      </div>
    );
  }

  if (state.parseError) {
    return (
      <div className="flex items-center justify-center h-full bg-white text-gray-400 text-sm px-4">
        <div className="text-center">
          <p className="text-red-500 font-medium mb-2">Parse Error</p>
          <p className="font-mono text-xs text-red-400">{state.parseError}</p>
        </div>
      </div>
    );
  }

  if (!state.doc) {
    return (
      <div className="flex items-center justify-center h-full bg-white text-gray-400 text-sm">
        Start typing to see the preview…
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header bar with zoom controls */}
      <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-2 shrink-0">
        {state.doc.protocolVersions.length > 1 ? (
          <label className="flex items-center gap-2 text-xs text-gray-500">
            Effective view
            <select
              className="border border-gray-300 bg-white px-1.5 py-0.5 text-xs text-gray-700"
              value={state.selectedProtocolVersion ?? ''}
              onChange={(event) => setSelectedProtocolVersion(
                event.target.value === '' ? null : event.target.value as typeof state.doc.protocolVersions[number],
              )}
            >
              <option value="">All protocols</option>
              {state.doc.protocolVersions.map((version) => (
                <option key={version} value={version}>{version}</option>
              ))}
            </select>
          </label>
        ) : <span />}
        <div className="flex items-center gap-1 py-1">
          <button
            className={fontBtnClass}
            onClick={() => setZoom((z) => Math.max(MIN_ZOOM, Math.round((z - ZOOM_STEP) * 10) / 10))}
            title="Decrease size"
          >
            −
          </button>
          <button
            className={fontBtnClass}
            onClick={() => setZoom(DEFAULT_ZOOM)}
            title="Reset to default"
          >
            {Math.round(zoom * 100)}%
          </button>
          <button
            className={fontBtnClass}
            onClick={() => setZoom((z) => Math.min(MAX_ZOOM, Math.round((z + ZOOM_STEP) * 10) / 10))}
            title="Increase size"
          >
            +
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4" style={{ zoom }}>
        <CardView doc={resolvedDoc ?? effectiveDoc ?? state.doc} validation={state.validation} />
      </div>
    </div>
  );
}
