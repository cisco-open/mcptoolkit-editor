// Copyright 2026 Cisco Systems, Inc. and its affiliates
//
// SPDX-License-Identifier: Apache-2.0

import { serializeMcpDescriptionMigrationReport } from '@mcpdesc/core';
import { useDoc } from '../hooks/useDoc';

export default function MigrationStatus() {
  const { state } = useDoc();
  const { migration } = state;
  if (migration.status !== 'succeeded' && migration.status !== 'failed') return null;

  const errors = migration.report.diagnostics.filter(({ severity }) => severity === 'error').length;
  const warnings = migration.report.diagnostics.filter(({ severity }) => severity === 'warning').length;
  const failed = migration.status === 'failed';
  const message = failed
    ? `Migration failed with ${errors} error${errors === 1 ? '' : 's'}`
    : warnings > 0
      ? `Migrated to 0.8 with ${warnings} warning${warnings === 1 ? '' : 's'}`
      : 'Migrated to 0.8 successfully';

  const downloadReport = () => {
    const blob = new Blob(
      [serializeMcpDescriptionMigrationReport(migration.report)],
      { type: 'application/json' },
    );
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'mcpdesc-migration-report.json';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex shrink-0 items-center justify-end gap-3 border-t border-gray-200 bg-gray-50 px-3 py-2 text-xs">
      <span className={failed ? 'font-medium text-red-700' : warnings > 0 ? 'font-medium text-amber-700' : 'font-medium text-green-700'}>
        {message}
      </span>
      <button type="button" className="text-blue-700 underline hover:text-blue-900" onClick={downloadReport}>
        Download report
      </button>
    </div>
  );
}