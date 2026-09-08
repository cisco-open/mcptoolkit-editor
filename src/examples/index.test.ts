import { describe, expect, it } from 'vitest';
import { defaultExample, exampleGroups, examples, getExampleFromSearch } from '.';

describe('bundled examples', () => {
  it('loads configured examples from nested relative paths', () => {
    expect(exampleGroups.map(({ label }) => label)).toEqual([
      'Features Demonstration',
      'Public Servers',
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

  it('looks up examples by their explicit URL ID', () => {
    expect(getExampleFromSearch('?example=full-featured')?.id).toBe('full-featured');
    expect(getExampleFromSearch('?example=features%2Ffull-featured')).toBeUndefined();
    expect(getExampleFromSearch('?example=unknown')).toBeUndefined();
  });
});