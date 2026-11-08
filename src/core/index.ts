// Copyright 2026 Cisco Systems, Inc. and its affiliates
//
// SPDX-License-Identifier: Apache-2.0

export {
  MCPDESC_FORMAT_VERSION,
  MCPDESC_SCHEMA_URI,
  MCPDESC_SPECIFICATION,
  LAST_0_8_EDITOR_RELEASE,
  McpDescValidator,
  legacySourceFindings,
  toPointer,
  unsupportedFormatMessage,
} from './validator';
export { McpDescRenderer } from './renderer';
export { diagnosticMessage } from './diagnosticMessage';
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
  ValidationRelatedLocation,
} from './types';
