// Copyright 2026 Cisco Systems, Inc. and its affiliates
//
// SPDX-License-Identifier: Apache-2.0

import { useDoc } from '../hooks/useDoc';

export default function MigrationStatus() {
  const { state } = useDoc();
  const { migration } = state;
  if (migration.status !== 'succeeded') return null;

  const { report } = migration;
  const warnings = report.result.diagnostics.filter(({ severity }) => severity === 'warning').length;
  const message = warnings > 0
    ? `Migrated from 0.8.0 to 0.9.0 with ${warnings} warning${warnings === 1 ? '' : 's'}`
    : 'Migrated from 0.8.0 to 0.9.0 successfully';

  const downloadReport = () => {
    const blob = new Blob([`${JSON.stringify(report, null, 2)}\n`], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `mcpdesc-${report.selector}-migration.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex shrink-0 items-center justify-end gap-3 border-t border-gray-200 bg-gray-50 px-3 py-2 text-xs">
      <span className={warnings > 0 ? 'font-medium text-amber-700' : 'font-medium text-green-700'}>
        {message}
      </span>
      <button type="button" className="text-blue-700 underline hover:text-blue-900" onClick={downloadReport}>
        Download report
      </button>
    </div>
  );
}
