// Copyright 2026 Cisco Systems, Inc. and its affiliates
//
// SPDX-License-Identifier: Apache-2.0

/**
 * mcptoolkit-viewer/react — React component export.
 *
 * For consumers who are already in a React app and want to use
 * the card view as a component with their own React instance.
 *
 * Usage:
 *   import { McpDescCardView } from '@cisco_open/mcptoolkit-viewer/react';
 *   import '@cisco_open/mcptoolkit-viewer/dist/mcptoolkit-viewer.css';
 *
 *   <div className="mcptoolkit-viewer-root">
 *     <McpDescCardView doc={doc} validation={validation} />
 *   </div>
 */

export { McpDescCardView } from './McpDescCardView';
export type { McpDescCardViewProps, BadgeRenderer } from './McpDescCardView';
export { ValidationPanel } from './ValidationPanel';
export type { ValidationPanelProps } from './ValidationPanel';
export type {
  McpDescDocument,
  McpDescInfo,
  McpDescTransport,
  McpDescSecurityScheme,
  McpDescCapabilities,
  McpDescTool,
  McpDescResource,
  McpDescResourceTemplate,
  McpDescPrompt,
  McpDescPromptArgument,
  McpDescTag,
  McpDescIcon,
  ValidationResult,
  ValidationIssue,
} from '@core/types';
