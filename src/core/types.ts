// Copyright 2026 Cisco Systems, Inc. and its affiliates
//
// SPDX-License-Identifier: Apache-2.0

/**
 * MCP Description types — browser-compatible subset adapted from mcp-contract.
 *
 * These types model the MCP Description specification v0.6.0 document structure.
 * They are intentionally decoupled from Node.js so they can be shared between
 * a future @mcpcontract/core package, the CLI, and this editor.
 */

// ============================================================================
// MCP Description Document (top-level)
// ============================================================================

export interface McpDescDocument {
  $schema?: string;
  mcpdesc: string;
  info: McpDescInfo;
  transports: McpDescTransport[];
  security?: McpDescSecurityScheme[];
  capabilities?: McpDescCapabilities;
  tools?: McpDescTool[];
  resources?: McpDescResource[];
  resourceTemplates?: McpDescResourceTemplate[];
  prompts?: McpDescPrompt[];
  tags?: McpDescTag[];
  [key: string]: unknown; // allow x-* extensions
}

// ============================================================================
// Info
// ============================================================================

export interface McpDescInfo {
  name: string;
  title?: string;
  version: string;
  description?: string;
  protocolVersion?: string;
  id?: string;
  websiteUrl?: string;
  contact?: {
    name?: string;
    url?: string;
    email?: string;
  };
  license?: {
    name: string;
    url?: string;
  };
  icons?: McpDescIcon[];
}

export interface McpDescIcon {
  src: string;
  mimeType?: string;
  sizes?: string[];
  theme?: 'light' | 'dark';
}

// ============================================================================
// Transports
// ============================================================================

export interface McpDescTransport {
  type: 'streamable-http' | 'stdio' | 'sse';
  url?: string;
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  security?: McpDescSecurityScheme[];
}

// ============================================================================
// Security
// ============================================================================

export interface McpDescSecurityScheme {
  type: 'http' | 'apiKey' | 'oauth2' | 'openIdConnect';
  scheme?: string;
  bearerFormat?: string;
  name?: string;
  in?: 'header' | 'query' | 'cookie';
  description?: string;
  flows?: {
    implicit?: McpDescOAuthFlow;
    password?: McpDescOAuthFlow;
    clientCredentials?: McpDescOAuthFlow;
    authorizationCode?: McpDescOAuthFlow;
  };
  openIdConnectUrl?: string;
}

export interface McpDescOAuthFlow {
  authorizationUrl?: string;
  tokenUrl?: string;
  refreshUrl?: string;
  scopes?: Record<string, string>;
}

// ============================================================================
// Capabilities
// ============================================================================

export interface McpDescCapabilities {
  tools?: { listChanged?: boolean };
  resources?: { subscribe?: boolean; listChanged?: boolean };
  prompts?: { listChanged?: boolean };
  completions?: Record<string, unknown>;
  logging?: Record<string, unknown>;
  tasks?: Record<string, unknown>;
}

// ============================================================================
// Tools
// ============================================================================

export interface McpDescTool {
  name: string;
  title?: string;
  description?: string;
  inputSchema?: Record<string, unknown>;
  outputSchema?: Record<string, unknown>;
  annotations?: {
    title?: string;
    readOnlyHint?: boolean;
    destructiveHint?: boolean;
    idempotentHint?: boolean;
    openWorldHint?: boolean;
    [key: string]: unknown;
  };
  execution?: {
    taskSupport?: 'forbidden' | 'optional' | 'required';
  };
  icons?: McpDescIcon[];
  tags?: string[];
  deprecated?: boolean;
}

// ============================================================================
// Resources & Resource Templates
// ============================================================================

export interface McpDescResource {
  uri: string;
  name: string;
  title?: string;
  description?: string;
  mimeType?: string;
  size?: number;
  annotations?: Record<string, unknown>;
  icons?: McpDescIcon[];
  tags?: string[];
  deprecated?: boolean;
}

export interface McpDescResourceTemplate {
  uriTemplate: string;
  name: string;
  title?: string;
  description?: string;
  mimeType?: string;
  annotations?: Record<string, unknown>;
  icons?: McpDescIcon[];
  tags?: string[];
  deprecated?: boolean;
}

// ============================================================================
// Prompts
// ============================================================================

export interface McpDescPromptArgument {
  name: string;
  title?: string;
  description?: string;
  required?: boolean;
}

export interface McpDescPrompt {
  name: string;
  title?: string;
  description?: string;
  arguments?: McpDescPromptArgument[];
  icons?: McpDescIcon[];
  tags?: string[];
  deprecated?: boolean;
}

// ============================================================================
// Tags
// ============================================================================

export interface McpDescTag {
  name: string;
  description?: string;
}

// ============================================================================
// Validation types
// ============================================================================

export interface ValidationResult {
  valid: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
}

export interface ValidationIssue {
  path: string;
  message: string;
  keyword?: string;
  params?: Record<string, unknown>;
}
