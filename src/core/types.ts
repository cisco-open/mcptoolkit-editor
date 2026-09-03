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

export type McpDescComponentNamespace =
  | 'schemas'
  | 'toolExamples'
  | 'resourceExamples'
  | 'resourceTemplateExamples'
  | 'promptExamples';

export interface McpDescComponentReference {
  $componentRef: `#/components/${McpDescComponentNamespace}/${string}`;
}

/** An authored value that may be inlined or replaced by a local component reference. */
export type InlineOrRef<T> = T | McpDescComponentReference;

export type McpDescExample = Record<string, unknown>;

export interface McpDescComponents {
  schemas?: Record<string, InlineOrRef<McpDescSchema>>;
  toolExamples?: Record<string, InlineOrRef<McpDescExample>>;
  resourceExamples?: Record<string, InlineOrRef<McpDescExample>>;
  resourceTemplateExamples?: Record<string, InlineOrRef<McpDescExample>>;
  promptExamples?: Record<string, InlineOrRef<McpDescExample>>;
  [key: string]: unknown;
}

export function isComponentReference(value: unknown): value is McpDescComponentReference {
  return typeof value === 'object'
    && value !== null
    && !Array.isArray(value)
    && typeof (value as { $componentRef?: unknown }).$componentRef === 'string';
}

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
  components?: McpDescComponents;
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

export interface McpDescTool extends ProtocolScoped {
  name: string;
  title?: string;
  description?: string;
  inputSchema: InlineOrRef<McpDescSchema>;
  outputSchema?: InlineOrRef<McpDescSchema>;
  annotations?: {
    title?: string;
    readOnlyHint?: boolean;
    destructiveHint?: boolean;
    idempotentHint?: boolean;
    openWorldHint?: boolean;
    [key: string]: unknown;
  };
  execution?: { taskSupport?: 'forbidden' | 'optional' | 'required'; [key: string]: unknown };
  examples?: Record<string, InlineOrRef<McpDescExample>>;
  interactionExamples?: Record<string, unknown>;
  elicitations?: Record<string, unknown>[];
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
  examples?: Record<string, InlineOrRef<McpDescExample>>;
  elicitations?: Record<string, unknown>[];
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
  examples?: Record<string, InlineOrRef<McpDescExample>>;
  completionExamples?: Record<string, unknown>;
  elicitations?: Record<string, unknown>[];
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
  examples?: Record<string, InlineOrRef<McpDescExample>>;
  completionExamples?: Record<string, unknown>;
  elicitations?: Record<string, unknown>[];
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
