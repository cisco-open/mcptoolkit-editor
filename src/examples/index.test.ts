import { describe, expect, it } from 'vitest';
import { projectEffectiveProtocolView } from '@mcpdesc/core';
import { parse } from 'yaml';
import resultTypeExample from '../../examples/features/multi-version-resultType.yaml?raw';
import { isComponentReference, type McpDescDocument } from '../core/types';
import { MCPDESC_SPECIFICATION, McpDescValidator } from '../core/validator';
import { defaultExample, exampleGroups, examples, getExampleFromSearch } from '.';

function hasSuccessfulResult(example: unknown): boolean {
  if (typeof example !== 'object' || example === null || Array.isArray(example)) return false;
  const result = (example as Record<string, unknown>).result;
  if (typeof result !== 'object' || result === null || Array.isArray(result)) return false;
  const response = result as Record<string, unknown>;
  return response.isError !== true
    && (Array.isArray(response.content) || Object.hasOwn(response, 'structuredContent'));
}

describe('bundled examples', () => {
  it('loads configured examples from nested relative paths', () => {
    expect(exampleGroups.map(({ label }) => label)).toEqual([
      'Features Demonstration',
      'Official Servers',
      'Migrations',
    ]);
    expect(examples.map(({ id }) => id)).toContain('basic');
    expect(examples.map(({ id }) => id)).toContain('devnet');
    expect(examples.map(({ id }) => id)).toContain('miro');
    expect(examples.map(({ id }) => id)).toContain('microsoft-learn');
    expect(examples.every(({ content }) => content.length > 0)).toBe(true);
  });

  it('uses the configured default example', () => {
    expect(defaultExample).toBe(
      examples.find(({ id }) => id === 'basic')?.content,
    );
  });

  it('keeps current vendor examples separate from versioned migration examples', () => {
    const vendors = exampleGroups.find(({ label }) => label === 'Official Servers');
    const migrations = exampleGroups.find(({ label }) => label === 'Migrations');
    expect(vendors?.entries.map(({ id }) => id)).toEqual(['devnet', 'microsoft-learn', 'miro']);
    expect(vendors?.entries.map(({ content }) => parse(content).mcpdesc)).toEqual(['0.9.0', '0.9.0', '0.9.0']);
    expect(migrations?.entries.map(({ id, content }) => [id, parse(content).mcpdesc])).toEqual([
      ['basic-v0-8', '0.8.0'],
      ['basic-v0-7', '0.7.0'],
    ]);
    for (const id of ['basic-v0-8', 'basic-v0-7']) {
      expect(getExampleFromSearch(`?example=${id}`)).toBe(migrations?.entries.find((entry) => entry.id === id));
    }
  });

  it('documents output schemas and successful results for feature tools, except the shared Tasks evaluator', () => {
    const featureGroup = exampleGroups.find(({ label }) => label === 'Features Demonstration');
    expect(featureGroup).toBeDefined();

    for (const example of featureGroup!.entries) {
      const doc: McpDescDocument = parse(example.content);
      expect(new McpDescValidator().validateDocument(doc), `${example.id} validation`).toMatchObject({
        valid: true,
        errors: [],
      });
      for (const tool of doc.tools ?? []) {
        expect(tool.outputSchema, `${example.id}/${tool.name} outputSchema`).toBeDefined();
        if (example.id === 'multi-version' && tool.name === 'get_position_evaluation') continue;

        const toolExamples = Object.values(tool.examples ?? {}).map((toolExample) => {
          if (!isComponentReference(toolExample)) return toolExample;
          const parts = toolExample.$componentRef.split('/');
          return parts.length === 4 && parts[1] === 'components' && parts[2] === 'toolExamples'
            ? doc.components?.toolExamples?.[parts[3]]
            : undefined;
        });
        const interactions = Object.values(tool.interactionExamples ?? {});
        expect(
          [...toolExamples, ...interactions].some(hasSuccessfulResult),
          `${example.id}/${tool.name} successful result example`,
        ).toBe(true);
      }
    }
  });

  it('keeps the Tasks evaluator shared and demonstrates resultType separately', () => {
    const tasks: McpDescDocument = parse(getExampleFromSearch('?example=multi-version')!.content);
    const evaluators = tasks.tools?.filter(tool => tool.name === 'get_position_evaluation');
    expect(evaluators).toHaveLength(1);
    expect(evaluators?.[0]?.protocolVersions).toBeUndefined();
    expect(evaluators?.[0]?.examples).toBeUndefined();

    expect(getExampleFromSearch('?example=multi-version-result-type')).toBeUndefined();
    const resultTypeDoc = parse(resultTypeExample);
    expect(new McpDescValidator().validateDocument(resultTypeDoc)).toMatchObject({ valid: true, errors: [] });
    const { tools } = resultTypeDoc;
    expect(tools).toHaveLength(2);
    expect(tools[0].protocolVersions).toEqual(['2025-11-25']);
    expect(tools[1].protocolVersions).toEqual(['2026-07-28']);
    const olderResult = tools[0].examples['starting-position'].result;
    expect(olderResult).not.toHaveProperty('resultType');
    expect(tools[1].examples['starting-position'].result).toEqual({ ...olderResult, resultType: 'complete' });
  });

  it('uses MCP 2026 with a direct integer FIDE rating in the minimal example', () => {
    const doc: McpDescDocument = parse(defaultExample);
    expect(doc.protocolVersions).toEqual(['2026-07-28']);
    expect(doc.tools).toHaveLength(1);
    expect(doc.tools?.[0]).toMatchObject({
      name: 'get_player_rating',
      description: 'Get the current FIDE standard rating for a chess player',
      outputSchema: {
        type: 'integer',
        description: 'Current FIDE standard rating',
      },
      examples: {
        'fide-rating': {
          input: { player_id: 'planchaman' },
          result: {
            resultType: 'complete',
            content: [{ type: 'text', text: "The player's FIDE rating is 1701" }],
            structuredContent: 1701,
          },
        },
      },
    });
    expect(new McpDescValidator().validateDocument(doc)).toMatchObject({
      valid: true, errors: [],
    });
  });

  it('loads the output-schema example with one rating tool per protocol view', () => {
    const example = getExampleFromSearch('?example=output-schema');
    expect(example?.label).toBe('Output Schema');
    const doc: McpDescDocument = parse(example!.content);
    expect(new McpDescValidator().validateDocument(doc)).toMatchObject({
      valid: true, errors: [],
    });
    expect(doc.protocolVersions).toEqual(['2025-11-25', '2026-07-28']);
    expect(doc.tools).toHaveLength(2);

    for (const protocolVersion of doc.protocolVersions) {
      const projection = projectEffectiveProtocolView(doc, {
        specification: MCPDESC_SPECIFICATION,
        protocolVersion,
      });
      if (!projection.ok) throw new Error('Expected output-schema projection to succeed');
      const view = projection.value as McpDescDocument;
      expect(view.tools).toHaveLength(1);
      expect(view.tools?.[0]?.name).toBe('get_player_rating');
      expect(view.tools?.[0]?.outputSchema).toEqual(
        protocolVersion === '2025-11-25'
          ? {
            type: 'object',
            properties: {
              rating: { type: 'integer', description: 'Current FIDE standard rating' },
            },
            required: ['rating'],
            additionalProperties: false,
          }
          : { type: 'integer', description: 'Current FIDE standard rating' },
      );
      expect(view.tools?.[0]?.examples).toMatchObject({
        'fide-rating': {
          input: {
            player_id: protocolVersion === '2025-11-25' ? 'planchaman' : 'planchaman',
          },
          result: {
            structuredContent: protocolVersion === '2025-11-25'
              ? { rating: 1701 }
              : 1701,
          },
        },
      });
    }
  });

  it('looks up examples by their explicit URL ID', () => {
    expect(getExampleFromSearch('?example=full-featured')?.id).toBe('full-featured');
    expect(getExampleFromSearch('?example=features%2Ffull-featured')).toBeUndefined();
    expect(getExampleFromSearch('?example=unknown')).toBeUndefined();
  });
});