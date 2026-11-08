// Copyright 2026 Cisco Systems, Inc. and its affiliates
//
// SPDX-License-Identifier: Apache-2.0

/**
 * The editor ships under `script-src 'self'`, so component resolution must not
 * reach for runtime code generation — not even while its modules initialise.
 */

import { describe, expect, it, vi } from 'vitest';
import fixture from './__fixtures__/components/valid/all-registries.yaml?raw';

describe('strict CSP', () => {
  it('resolves without code generation', async () => {
    vi.resetModules();

    const realFunction = globalThis.Function;
    const realEval = globalThis.eval;
    let attempts = 0;

    globalThis.Function = new Proxy(realFunction, {
      construct() { attempts += 1; throw new Error('blocked by CSP'); },
      apply(target, thisArg, args) {
        if (args.length) { attempts += 1; throw new Error('blocked by CSP'); }
        return Reflect.apply(target, thisArg, args as []);
      },
    });
    globalThis.eval = () => { attempts += 1; throw new Error('blocked by CSP'); };

    try {
      const { parseMcpDescriptionSource } = await import('@mcpdesc/core/documents');
      const { resolveMcpDescriptionComponentReferences } = await import('@mcpdesc/core/components');
      const { projectMcpNativeValue } = await import('@mcpdesc/core');
      const { convertTo09 } = await import('./conversion');
      const { McpDescValidator } = await import('./validator');

      const parsed = parseMcpDescriptionSource(fixture);
      expect(parsed.ok).toBe(true);
      if (!parsed.ok) return;

      const converted = convertTo09({
        ...(parsed.value as Record<string, unknown>), mcpdesc: '0.8.0', $schema: 'https://mcpdesc.org/schema/mcp-description/0.8.0.json',
      });
      expect(converted.ok).toBe(true);
      if (!converted.ok) return;
      expect(resolveMcpDescriptionComponentReferences(converted.value).ok).toBe(true);
      expect(new McpDescValidator().validateDocument(converted.value).valid).toBe(true);
      const invalid = new McpDescValidator().validateDocument({
        ...converted.value, transports: [{ type: 'stdio', command: 'server', arg: ['serve'] }],
      });
      expect(invalid.errors).toHaveLength(1);
      expect(invalid.errors[0].path).toBe('/transports/0/arg');
      const native = projectMcpNativeValue(converted.value, {
        protocolVersion: (converted.value.protocolVersions as ['2025-11-25'])[0],
        kind: 'tool',
        keyOrder: 'document',
      });
      expect(native.ok).toBe(true);
    } finally {
      globalThis.Function = realFunction;
      globalThis.eval = realEval;
    }

    expect(attempts).toBe(0);
  });
});
