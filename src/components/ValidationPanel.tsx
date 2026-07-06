// Copyright 2026 Cisco Systems, Inc. and its affiliates
//
// SPDX-License-Identifier: Apache-2.0

import { useDoc } from '../hooks/useDoc';
import { version as uiVersion } from '../../packages/mcptoolkit-viewer/src/index';

export default function ValidationPanel() {
  const { state } = useDoc();
  const { validation } = state;

  const errorCount = validation.errors.length;
  const warnCount = validation.warnings.length;

  const statusColor = errorCount > 0 ? 'text-red-400' : warnCount > 0 ? 'text-yellow-400' : 'text-green-400';
  const statusIcon = errorCount > 0 ? '✕' : warnCount > 0 ? '⚠' : '✓';
  const statusText =
    errorCount > 0
      ? `${errorCount} error${errorCount > 1 ? 's' : ''}`
      : warnCount > 0
        ? `${warnCount} warning${warnCount > 1 ? 's' : ''}`
        : 'Valid';

  return (
    <div className="border-t border-zinc-800 bg-zinc-900 text-xs shrink-0">
      <div className="flex items-center gap-2 px-3 py-1.5">
        <span className={`font-medium ${statusColor}`}>
          {statusIcon} {statusText}
        </span>
        {warnCount > 0 && errorCount > 0 && (
          <span className="text-yellow-400">
            ⚠ {warnCount} warning{warnCount > 1 ? 's' : ''}
          </span>
        )}
        <span className="text-zinc-600 ml-auto">{state.format.toUpperCase()}</span>
        <span className="text-zinc-500">mcptoolkit-viewer v{uiVersion}</span>
      </div>
    </div>
  );
}
