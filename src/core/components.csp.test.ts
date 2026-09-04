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

      const parsed = parseMcpDescriptionSource(fixture);
      expect(parsed.ok).toBe(true);
      if (!parsed.ok) return;

      const result = resolveMcpDescriptionComponentReferences(parsed.value, {
        specification: '0.8.0-rc.1',
      });
      expect(result.ok).toBe(true);
    } finally {
      globalThis.Function = realFunction;
      globalThis.eval = realEval;
    }

    expect(attempts).toBe(0);
  });
});
