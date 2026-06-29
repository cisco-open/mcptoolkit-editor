// Copyright 2026 Cisco Systems, Inc. and its affiliates
//
// SPDX-License-Identifier: Apache-2.0

/**
 * Public API types for mcpdesc-ui.
 */

// Re-export core types consumers need
export type {
  McpDescDocument,
  McpDescInfo,
  McpDescTransport,
  McpDescSecurityScheme,
  McpDescOAuthFlow,
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

export interface McpDescUIOptions {
  /** CSS selector for the container element (required) */
  dom_id: string;

  /** Pre-parsed MCP Description document object */
  spec?: import('@core/types').McpDescDocument;

  /** URL to fetch a YAML or JSON mcpdesc file from */
  url?: string;

  /** Color theme (default: 'light') */
  theme?: 'light' | 'dark';

  /** Whether <details> sections start expanded (default: true) */
  defaultOpen?: boolean;

  /** Show validation panel at the bottom (default: true if errors/warnings exist) */
  showValidation?: boolean;
}

export interface McpDescUIInstance {
  /** Update the displayed document */
  updateSpec(spec: import('@core/types').McpDescDocument): void;

  /** Re-fetch from the configured URL */
  reload(): Promise<void>;

  /** Unmount and clean up */
  destroy(): void;
}
