// Copyright 2026 Cisco Systems, Inc. and its affiliates
//
// SPDX-License-Identifier: Apache-2.0

import { useDoc } from '../../hooks/useDoc';
import { McpDescCardView } from '../../../packages/mcptoolkit-viewer/src/McpDescCardView';
import type { BadgeRenderer } from '../../../packages/mcptoolkit-viewer/src/McpDescCardView';
import type { McpDescDocument, ValidationResult } from '../../core/types';
import { sourceItemPath } from './navigation';
import { Download } from 'lucide-react';
import type { CardActionRenderer } from '../../../packages/mcptoolkit-viewer/src/McpDescCardView';
import { nativeExportKinds } from '../../nativeExport';

/** Clickable type bubble that navigates the editor to the item definition */
function NavBubble({ children, section, value, path, color = 'bg-gray-200 text-gray-500' }: {
  children: React.ReactNode; section: string; value: string; path?: string | null; color?: string;
}) {
  const { revealSectionItemRef, revealPathRef } = useDoc();
  return (
    <span
      className={`inline-block text-xs px-1.5 py-0.5 rounded ${color} shrink-0 cursor-pointer hover:ring-2 hover:ring-blue-300 transition-shadow`}
      title="Jump to definition"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (path) revealPathRef.current?.(path);
        else revealSectionItemRef.current?.(section, value);
      }}
    >
      {children}
    </span>
  );
}

export default function CardView({ doc, validation }: { doc: McpDescDocument; validation?: ValidationResult }) {
  const { state, setSelectedProtocolVersion, revealPathRef, requestNativeExport } = useDoc();
  const renderExportAction: CardActionRenderer = ({ section, identifier, index }) => {
    if (state.doc?.mcpdesc !== '0.9.0') return null;
    const config = nativeExportKinds.find(({ collection }) => collection === section)!;
    const label = identifier === undefined ? `Export native ${config.label}` : `Export native ${identifier}`;
    return (
      <button type="button" title={label} aria-label={label}
        className="inline-flex size-6 shrink-0 items-center justify-center rounded text-gray-500 hover:bg-gray-200 hover:text-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          const path = identifier === undefined ? null : sourceItemPath(state.doc, section, identifier, index, state.selectedProtocolVersion);
          const sourceIndex = path ? Number(path.split('/')[2]) : -1;
          const source = state.doc?.[section]?.[sourceIndex];
          requestNativeExport({ kind: config.kind, identifier, protocolVersions: source?.protocolVersions });
        }}><Download size={14} aria-hidden="true" /></button>
    );
  };
  const navBadgeRenderer: BadgeRenderer = (children, section, value, color, context) => (
    <NavBubble
      section={section}
      value={value}
      path={sourceItemPath(
        state.doc,
        section,
        value,
        context?.index,
        state.selectedProtocolVersion,
      )}
      color={color}
    >
      {children}
    </NavBubble>
  );
  return (
    <McpDescCardView
      doc={doc}
      sourceDoc={state.doc ?? undefined}
      validation={validation}
      renderBadge={navBadgeRenderer}
      renderAction={state.doc?.mcpdesc === '0.9.0' ? renderExportAction : undefined}
      exampleDisplay="names"
      onExampleSelect={({ path }) => revealPathRef.current?.(path)}
      protocolVersionProjectionMode="enabled"
      protocolVersionOptions={state.doc?.protocolVersions}
      selectedProtocolVersion={state.selectedProtocolVersion}
      onProtocolVersionSelect={setSelectedProtocolVersion}
    />
  );
}
