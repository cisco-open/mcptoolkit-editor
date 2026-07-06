// Copyright 2026 Cisco Systems, Inc. and its affiliates
//
// SPDX-License-Identifier: Apache-2.0

import { useState } from 'react';
import type { ValidationResult } from '@core/types';

export interface ValidationPanelProps {
  validation: ValidationResult;
  visible: boolean;
}

export function ValidationPanel({ validation, visible }: ValidationPanelProps) {
  const [expanded, setExpanded] = useState(visible);
  const errorCount = validation.errors.length;
  const warningCount = validation.warnings.length;
  const total = errorCount + warningCount;

  if (total === 0) return null;

  return (
    <div className="border-t border-gray-200 bg-white">
      {/* Status bar — always visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-3 py-1.5 text-xs hover:bg-gray-50 transition-colors cursor-pointer"
      >
        <span className="font-medium text-gray-600">Validation</span>
        {errorCount > 0 && (
          <span className="inline-flex items-center gap-1 text-red-600">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {errorCount} {errorCount === 1 ? 'error' : 'errors'}
          </span>
        )}
        {warningCount > 0 && (
          <span className="inline-flex items-center gap-1 text-amber-600">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {warningCount} {warningCount === 1 ? 'warning' : 'warnings'}
          </span>
        )}
        <span className="flex-1" />
        <span className="text-gray-400">{expanded ? '▼' : '▲'}</span>
      </button>

      {/* Expandable issue list */}
      {expanded && (
        <div className="max-h-48 overflow-y-auto border-t border-gray-100 px-3 py-2 text-xs space-y-1">
          {validation.errors.map((e, i) => (
            <div key={`e-${i}`} className="flex gap-2 text-red-700">
              <span className="shrink-0 font-mono text-red-400">{e.path}</span>
              <span>{e.message}</span>
            </div>
          ))}
          {validation.warnings.map((w, i) => (
            <div key={`w-${i}`} className="flex gap-2 text-amber-700">
              <span className="shrink-0 font-mono text-amber-400">{w.path}</span>
              <span>{w.message}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
