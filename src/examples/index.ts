// Copyright 2026 Cisco Systems, Inc. and its affiliates
//
// SPDX-License-Identifier: Apache-2.0

/**
 * Bundled MCP Description examples.
 *
 * The menu structure (sections & entries) is defined in
 * `examples/config.yaml` — edit that file to add/remove/reorder
 * examples without touching code.
 *
 * YAML files live in /examples/ at the project root and are eagerly imported
 * as raw strings via Vite's `import.meta.glob`.
 */
import { parse } from 'yaml';
import menuConfigRaw from '../../examples/config.yaml?raw';

// Eagerly import every .yaml in examples/ as raw text (except the menu config)
const yamlModules = import.meta.glob<string>(
  ['../../examples/*.yaml', '!../../examples/config.yaml'],
  { query: '?raw', eager: true, import: 'default' },
);

// Build a filename → content map for fast lookup
const fileContents: Record<string, string> = {};
for (const [path, raw] of Object.entries(yamlModules)) {
  const filename = path.split('/').pop()!;
  fileContents[filename] = raw;
}

export interface ExampleEntry {
  name: string;
  label: string;
  content: string;
}

export interface ExampleGroup {
  label: string;
  entries: ExampleEntry[];
}

// Parse the menu config
interface MenuEntry { file: string; label: string }
interface MenuSection { label: string; entries?: MenuEntry[] }
const menuConfig: { sections: MenuSection[] } = parse(menuConfigRaw);

/** Grouped examples for the toolbar dropdown (sections with no entries are hidden). */
export const exampleGroups: ExampleGroup[] = menuConfig.sections
  .filter((s) => s.entries && s.entries.length > 0)
  .map((s) => ({
    label: s.label,
    entries: s.entries!
      .filter((e) => fileContents[e.file])
      .map((e) => ({
        name: e.file.replace(/\.yaml$/, ''),
        label: e.label,
        content: fileContents[e.file],
      })),
  }))
  .filter((g) => g.entries.length > 0);

/** Flat list for lookup by name. */
export const examples: ExampleEntry[] = exampleGroups.flatMap((g) => g.entries);
