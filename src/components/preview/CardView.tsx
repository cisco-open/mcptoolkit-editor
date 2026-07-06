// Copyright 2026 Cisco Systems, Inc. and its affiliates
//
// SPDX-License-Identifier: Apache-2.0

import { useDoc } from '../../hooks/useDoc';
import { McpDescCardView } from '../../../packages/mcptoolkit-viewer/src/McpDescCardView';
import type { BadgeRenderer } from '../../../packages/mcptoolkit-viewer/src/McpDescCardView';
import type { McpDescDocument, ValidationResult } from '../../core/types';

/** Clickable type bubble that navigates the editor to the item definition */
function NavBubble({ children, section, value, color = 'bg-gray-200 text-gray-500' }: {
  children: React.ReactNode; section: string; value: string; color?: string;
}) {
  const { revealSectionItemRef } = useDoc();
  return (
    <span
      className={`inline-block text-xs px-1.5 py-0.5 rounded ${color} shrink-0 cursor-pointer hover:ring-2 hover:ring-blue-300 transition-shadow`}
      title="Jump to definition"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        revealSectionItemRef.current?.(section, value);
      }}
    >
      {children}
    </span>
  );
}

const navBadgeRenderer: BadgeRenderer = (children, section, value, color) => (
  <NavBubble section={section} value={value} color={color}>{children}</NavBubble>
);

export default function CardView({ doc, validation }: { doc: McpDescDocument; validation?: ValidationResult }) {
  return (
    <McpDescCardView
      doc={doc}
      validation={validation}
      renderBadge={navBadgeRenderer}
    />
  );
}
