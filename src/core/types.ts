// Copyright 2026 Cisco Systems, Inc. and its affiliates
//
// SPDX-License-Identifier: Apache-2.0

export type McpProtocolVersion =
  | '2024-11-05'
  | '2025-03-26'
  | '2025-06-18'
  | '2025-11-25'
  | '2026-07-28';

export type McpDescSchema = Record<string, unknown>;
export type McpDescSecurityRequirement = Record<string, string[]>;

interface ProtocolScoped {
  protocolVersions?: McpProtocolVersion[];
  security?: McpDescSecurityRequirement[];
  clientRequirements?: Record<string, unknown>;
  _meta?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface McpDescDocument {
  $schema?: string;
  mcpdesc: '0.8.0' | string;
  info: McpDescInfo;
  protocolVersions: McpProtocolVersion[];
  instructions?: string;
  transports?: McpDescTransport[];
  securitySchemes?: Record<string, McpDescSecurityScheme>;
  security?: McpDescSecurityRequirement[];
  capabilities?: McpDescCapabilities[];
  tools?: McpDescTool[];
  resources?: McpDescResource[];
  resourceTemplates?: McpDescResourceTemplate[];
  prompts?: McpDescPrompt[];
  tags?: McpDescTag[];
  components?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface McpDescInfo {
  name: string;
  title?: string;
  version: string;
  description?: string;
  id?: string;
  websiteUrl?: string;
  contact?: { name?: string; url?: string; email?: string };
  license?: { name: string; url?: string };
  icons?: McpDescIcon[];
  [key: string]: unknown;
}

export interface McpDescIcon {
  src: string;
  mimeType?: string;
  sizes?: string[];
  theme?: 'light' | 'dark';
  [key: string]: unknown;
}

export interface McpDescTransport extends ProtocolScoped {
  type: 'streamable-http' | 'stdio' | 'sse';
  url?: string;
  command?: string;
  args?: string[];
  env?: Record<string, string>;
}

export type McpDescSecurityScheme =
  | { type: 'http'; scheme: string; bearerFormat?: string; description?: string; [key: string]: unknown }
  | { type: 'apiKey'; name: string; in: 'header' | 'query' | 'cookie'; description?: string; [key: string]: unknown }
  | { type: 'oauth2'; flows: Record<string, McpDescOAuthFlow>; description?: string; [key: string]: unknown }
  | { type: 'openIdConnect'; openIdConnectUrl: string; description?: string; [key: string]: unknown };

export interface McpDescOAuthFlow {
  authorizationUrl?: string;
  tokenUrl?: string;
  refreshUrl?: string;
  scopes: Record<string, string>;
  [key: string]: unknown;
}

export interface McpDescCapabilities extends ProtocolScoped {
  tools?: { listChanged?: boolean; [key: string]: unknown };
  resources?: { subscribe?: boolean; listChanged?: boolean; [key: string]: unknown };
  prompts?: { listChanged?: boolean; [key: string]: unknown };
  completions?: Record<string, unknown>;
  logging?: Record<string, unknown>;
  tasks?: Record<string, unknown>;
  extensions?: Record<string, Record<string, unknown>>;
}

export interface McpDescElicitation extends ProtocolScoped {
  name: string;
  mode: 'form' | 'url';
  message: string;
  when?: string;
  requestedSchema?: McpDescSchema | { $componentRef: string };
  url?: string;
  onDecline?: string;
  onCancel?: string;
  [key: string]: unknown;
}

export interface McpDescTool extends ProtocolScoped {
  name: string;
  title?: string;
  description?: string;
  inputSchema: McpDescSchema;
  outputSchema?: McpDescSchema;
  annotations?: {
    title?: string;
    readOnlyHint?: boolean;
    destructiveHint?: boolean;
    idempotentHint?: boolean;
    openWorldHint?: boolean;
    [key: string]: unknown;
  };
  execution?: { taskSupport?: 'forbidden' | 'optional' | 'required'; [key: string]: unknown };
  examples?: Record<string, unknown>;
  interactionExamples?: Record<string, unknown>;
  elicitations?: McpDescElicitation[];
  icons?: McpDescIcon[];
  tags?: string[];
  deprecated?: boolean;
}

export interface McpDescResource extends ProtocolScoped {
  uri: string;
  name: string;
  title?: string;
  description?: string;
  mimeType?: string;
  size?: number;
  annotations?: Record<string, unknown>;
  examples?: Record<string, unknown>;
  elicitations?: McpDescElicitation[];
  icons?: McpDescIcon[];
  tags?: string[];
  deprecated?: boolean;
}

export interface McpDescResourceTemplate extends ProtocolScoped {
  uriTemplate: string;
  name: string;
  title?: string;
  description?: string;
  mimeType?: string;
  annotations?: Record<string, unknown>;
  examples?: Record<string, unknown>;
  completionExamples?: Record<string, unknown>;
  elicitations?: McpDescElicitation[];
  icons?: McpDescIcon[];
  tags?: string[];
  deprecated?: boolean;
}

export interface McpDescPromptArgument {
  name: string;
  title?: string;
  description?: string;
  required?: boolean;
  [key: string]: unknown;
}

export interface McpDescPrompt extends ProtocolScoped {
  name: string;
  title?: string;
  description?: string;
  arguments?: McpDescPromptArgument[];
  examples?: Record<string, unknown>;
  completionExamples?: Record<string, unknown>;
  elicitations?: McpDescElicitation[];
  icons?: McpDescIcon[];
  tags?: string[];
  deprecated?: boolean;
}

export interface McpDescTag {
  name: string;
  description?: string;
  [key: string]: unknown;
}

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
  line?: number;
  column?: number;
}
