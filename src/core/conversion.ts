import {
  convertMcpDescriptionVersion,
  type CoreDiagnostic,
  type McpDescriptionConversionFix,
  type McpDescriptionConversionFixKind,
  type McpDescriptionConversionResult,
} from '@mcpdesc/core';
import { MCPDESC_SCHEMA_URI, MCPDESC_SPECIFICATION } from './validator';

/**
 * Convert a 0.8 document to stable 0.9.0. The result always declares the final
 * `$schema` identity; core only rewrites a `$schema` the source already declares.
 */
export function convertTo09(
  document: unknown,
  fixes: readonly McpDescriptionConversionFix[] = [],
): McpDescriptionConversionResult {
  const result = convertMcpDescriptionVersion(document, {
    from: '0.8.0',
    to: '0.9.0',
    selector: MCPDESC_SPECIFICATION,
    fixes,
  });
  if (!result.ok || result.value.$schema === MCPDESC_SCHEMA_URI) return result;
  return {
    ...result,
    value: { ...result.value, $schema: MCPDESC_SCHEMA_URI },
    patch: [...result.patch, { op: 'add', path: '/$schema', value: MCPDESC_SCHEMA_URI }],
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
