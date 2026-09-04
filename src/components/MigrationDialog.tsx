// Copyright 2026 Cisco Systems, Inc. and its affiliates
//
// SPDX-License-Identifier: Apache-2.0

import { useEffect, useRef } from 'react';
import { useDoc } from '../hooks/useDoc';

export default function MigrationDialog() {
  const { state, confirmMigration, cancelMigration } = useDoc();
  const open = state.migration.status === 'confirmation-required';
  const dialogRef = useRef<HTMLDialogElement>(null);
  const migrateButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const dialog = dialogRef.current;
    if (!dialog) return;
    dialog.showModal();
    migrateButtonRef.current?.focus();
    const handleCancel = (event: Event) => {
      event.preventDefault();
      cancelMigration();
    };
    dialog.addEventListener('cancel', handleCancel);
    return () => {
      dialog.removeEventListener('cancel', handleCancel);
      if (dialog.open) dialog.close();
    };
  }, [open, cancelMigration]);

  if (!open) return null;

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="migration-title"
      aria-describedby="migration-description"
      className="m-auto w-[calc(100%-2rem)] max-w-md border border-zinc-700 bg-zinc-900 p-5 text-zinc-100 shadow-2xl backdrop:bg-black/65"
    >
        <h2 id="migration-title" className="text-base font-semibold text-zinc-100">
          Migrate MCP Description document?
        </h2>
        <p id="migration-description" className="mt-2 text-sm leading-6 text-zinc-300">
          This document uses version 0.7 of the MCP Description specification, which this editor does not
          support. It must be migrated to version 0.8 before editing.
        </p>
        <form className="mt-5 flex justify-end gap-2" onSubmit={(event) => {
          event.preventDefault();
          confirmMigration();
        }}>
          <button
            type="button"
            className="border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-zinc-200 hover:bg-zinc-700"
            onClick={cancelMigration}
          >
            Cancel
          </button>
          <button
            ref={migrateButtonRef}
            type="submit"
            autoFocus
            className="bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-500"
          >
            Migrate
          </button>
        </form>
    </dialog>
  );
}