import {
  convertMcpDescriptionVersion,
  V0_9_RC_1_SCHEMA_URI,
  V0_9_RC_1_SPECIFICATION,
  type CoreDiagnostic,
  type McpDescriptionConversionFix,
  type McpDescriptionConversionFixKind,
  type McpDescriptionConversionResult,
} from '@mcpdesc/core';

export function convertToReleaseCandidate(
  document: unknown,
  fixes: readonly McpDescriptionConversionFix[] = [],
): McpDescriptionConversionResult {
  const result = convertMcpDescriptionVersion(document, {
    from: '0.8.0',
    to: '0.9.0',
    selector: V0_9_RC_1_SPECIFICATION,
    fixes,
  });
  if (!result.ok || result.value.$schema === V0_9_RC_1_SCHEMA_URI) return result;
  return {
    ...result,
    value: { ...result.value, $schema: V0_9_RC_1_SCHEMA_URI },
    patch: [...result.patch, { op: 'add', path: '/$schema', value: V0_9_RC_1_SCHEMA_URI }],
  };
}

export function conversionFixes(diagnostic: CoreDiagnostic): readonly McpDescriptionConversionFixKind[] {
  if (diagnostic.severity !== 'error') return [];
  switch (diagnostic.rule) {
    case 'mcpdesc.conversion.0-8-to-0-9.tool-annotations-closed':
    case 'mcpdesc.conversion.0-8-to-0-9.annotations-closed':
    case 'mcpdesc.conversion.0-8-to-0-9.completion-result-closed':
      return ['remove-property'];
    case 'mcpdesc.conversion.0-8-to-0-9.client-requirements-closed':
      return ['remove-property', 'move-to-experimental'];
    default:
      return [];
  }
}