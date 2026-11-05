import { projectMcpNativeValue, type McpNativeKind } from '@mcpdesc/core';
import type { McpDescDocument, McpProtocolVersion } from './core/types';
import { MCPDESC_RC_SPECIFICATION } from './core/validator';

export const nativeExportKinds = [
  { kind: 'tool', collection: 'tools', identity: 'name', label: 'Tools' },
  { kind: 'resource', collection: 'resources', identity: 'uri', label: 'Resources' },
  { kind: 'resourceTemplate', collection: 'resourceTemplates', identity: 'uriTemplate', label: 'Resource Templates' },
  { kind: 'prompt', collection: 'prompts', identity: 'name', label: 'Prompts' },
] as const;

export interface NativeExportRequest {
  kind: McpNativeKind;
  identifier?: string;
  protocolVersions?: readonly McpProtocolVersion[];
}

function filenamePart(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^[.-]+|[.-]+$/g, '').slice(0, 100) || 'unnamed';
}

export function nativeExportFilename(server: string, request: NativeExportRequest, protocolVersion: McpProtocolVersion): string {
  const config = nativeExportKinds.find(({ kind }) => kind === request.kind)!;
  const scope = request.identifier === undefined
    ? config.collection
    : `${request.kind}.${filenamePart(request.identifier)}`;
  return `${filenamePart(server)}.mcp.${scope}.${protocolVersion}.json`;
}

export function projectNativeExport(doc: McpDescDocument, request: NativeExportRequest, protocolVersion: McpProtocolVersion) {
  return projectMcpNativeValue(doc, {
    selector: MCPDESC_RC_SPECIFICATION, protocolVersion,
    kind: request.kind, identifier: request.identifier,
  });
}

export function downloadFile(content: string, filename: string, mime = 'application/json'): void {
  const url = URL.createObjectURL(new Blob([content], { type: mime }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}