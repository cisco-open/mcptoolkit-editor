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
 * YAML files live below /examples/ at the project root and are eagerly
 * imported as raw strings via Vite's `import.meta.glob`.
 */
import { parse } from 'yaml';
import menuConfigRaw from '../../examples/config.yaml?raw';

// Eagerly import every .yaml in examples/ as raw text (except the menu config)
const yamlModules = import.meta.glob<string>(
  ['../../examples/**/*.yaml', '!../../examples/config.yaml'],
  { query: '?raw', eager: true, import: 'default' },
);

// Build a path relative to examples/ → content map for fast lookup
const fileContents: Record<string, string> = {};
const examplesPrefix = '../../examples/';
for (const [path, raw] of Object.entries(yamlModules)) {
  fileContents[path.slice(examplesPrefix.length)] = raw;
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
const menuConfig: { default: string; sections: MenuSection[] } = parse(menuConfigRaw);

function getExampleContent(file: string): string {
  const content = fileContents[file];
  if (!content) {
    throw new Error(`Example "${file}" from examples/config.yaml was not found below examples/`);
  }
  return content;
}

/** Grouped examples for the toolbar dropdown (sections with no entries are hidden). */
export const exampleGroups: ExampleGroup[] = menuConfig.sections
  .filter((s) => s.entries && s.entries.length > 0)
  .map((s) => ({
    label: s.label,
    entries: s.entries!
      .map((e) => ({
        name: e.file.replace(/\.yaml$/, ''),
        label: e.label,
        content: getExampleContent(e.file),
      })),
  }))
  .filter((g) => g.entries.length > 0);

/** Flat list for lookup by name. */
export const examples: ExampleEntry[] = exampleGroups.flatMap((g) => g.entries);

/** Initial document loaded when no editor content has been saved. */
export const defaultExample = getExampleContent(menuConfig.default);
