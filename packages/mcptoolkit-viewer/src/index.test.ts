// Copyright 2026 Cisco Systems, Inc. and its affiliates
//
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';
import { parseYaml } from './index';

describe('parseYaml', () => {
  it('parses the examples menu configuration shape', () => {
    const config = parseYaml(`
default: basic
sections:
  - label: Features Demonstration
    entries:
      - label: Basic
        id: basic
        file: features/minimal.yaml
`) as {
      default: string;
      sections: Array<{ entries: Array<{ id: string }> }>;
    };

    expect(config.default).toBe('basic');
    expect(config.sections.flatMap((section) => section.entries).map((entry) => entry.id))
      .toContain(config.default);
  });
});