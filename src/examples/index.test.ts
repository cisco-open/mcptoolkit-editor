import { describe, expect, it } from 'vitest';
import { defaultExample, exampleGroups, examples } from '.';

describe('bundled examples', () => {
  it('loads configured examples from nested relative paths', () => {
    expect(exampleGroups.map(({ label }) => label)).toEqual([
      'Features Demonstration',
      'vendors',
    ]);
    expect(examples.map(({ name }) => name)).toContain('features/minimal');
    expect(examples.map(({ name }) => name)).toContain('vendors/miro.mcpdesc');
    expect(examples.every(({ content }) => content.length > 0)).toBe(true);
  });

  it('uses the configured default example', () => {
    expect(defaultExample).toBe(
      examples.find(({ name }) => name === 'features/minimal')?.content,
    );
  });
});