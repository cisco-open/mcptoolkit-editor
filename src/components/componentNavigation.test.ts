import { describe, expect, it } from 'vitest';
import { findComponentDefinitionLine } from './componentNavigation';

describe('component definition navigation', () => {
  it('locates a YAML component while the cursor is on its reference', () => {
    const source = `components:\n  schemas:\n    SearchInput:\n      type: object\ntools:\n  - inputSchema:\n      $componentRef: '#/components/schemas/SearchInput'`;

    expect(findComponentDefinitionLine(source, 7, 30)).toBe(3);
    expect(findComponentDefinitionLine(source, 7, 5)).toBe(0);
  });

  it('locates a component referenced from JSON', () => {
    const source = `{\n  "components": {\n    "schemas": {\n      "SearchInput": { "type": "object" }\n    }\n  },\n  "tools": [{\n    "inputSchema": { "$componentRef": "#/components/schemas/SearchInput" }\n  }]\n}`;

    expect(findComponentDefinitionLine(source, 8, 55)).toBe(4);
  });

  it('returns no definition for a missing component', () => {
    const source = `components:\n  schemas:\n    Present:\n      type: object\ntools:\n  - inputSchema:\n      $componentRef: '#/components/schemas/Missing'`;

    expect(findComponentDefinitionLine(source, 7, 35)).toBe(0);
  });
});