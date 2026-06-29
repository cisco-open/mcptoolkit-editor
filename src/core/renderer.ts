// Copyright 2026 Cisco Systems, Inc. and its affiliates
//
// SPDX-License-Identifier: Apache-2.0

/**
 * Browser-compatible Handlebars renderer for MCP Description documents.
 *
 * Adapted from mcp-contract's Renderer class — templates are passed as strings
 * instead of loaded from the filesystem.
 */

import Handlebars from 'handlebars';
import type { McpDescDocument } from './types';

export class McpDescRenderer {
  private hbs: typeof Handlebars;

  constructor() {
    this.hbs = Handlebars.create();
    this.registerHelpers();
  }

  /** Render a document using the given Handlebars template string. */
  render(doc: McpDescDocument, templateSource: string): string {
    const template = this.hbs.compile(templateSource);
    return template(doc);
  }

  // -----------------------------------------------------------------------
  // Helpers — ported from mcp-contract renderer.ts
  // -----------------------------------------------------------------------
  private registerHelpers(): void {
    const hbs = this.hbs;

    hbs.registerHelper('join', (array: unknown[], separator: string) => {
      return Array.isArray(array) ? array.join(separator) : '';
    });

    hbs.registerHelper('eq', (a: unknown, b: unknown) => a === b);
    hbs.registerHelper('ne', (a: unknown, b: unknown) => a !== b);
    hbs.registerHelper('gt', (a: unknown, b: unknown) => (a as number) > (b as number));

    hbs.registerHelper('exists', function (this: unknown, value: unknown, options: Handlebars.HelperOptions) {
      return value !== undefined && value !== null ? options.fn(this) : options.inverse(this);
    });

    hbs.registerHelper('count', (array: unknown[]) => (Array.isArray(array) ? array.length : 0));

    hbs.registerHelper('or', function (this: unknown, ...args: unknown[]) {
      const options = args[args.length - 1] as Handlebars.HelperOptions;
      const values = args.slice(0, -1);
      const result = values.some((v) => !!v);
      if (typeof options === 'object' && typeof (options as Handlebars.HelperOptions).fn === 'function') {
        return result ? options.fn(this) : options.inverse(this);
      }
      return result;
    });

    hbs.registerHelper('and', function (this: unknown, ...args: unknown[]) {
      const options = args[args.length - 1] as Handlebars.HelperOptions;
      const values = args.slice(0, -1);
      const result = values.every((v) => !!v);
      if (typeof options === 'object' && typeof (options as Handlebars.HelperOptions).fn === 'function') {
        return result ? options.fn(this) : options.inverse(this);
      }
      return result;
    });

    hbs.registerHelper('json', (obj: unknown, indent?: number) => {
      return new hbs.SafeString(JSON.stringify(obj, null, typeof indent === 'number' ? indent : 2));
    });

    hbs.registerHelper('plural', (count: number, singular: string, plural: string) => {
      return count === 1 ? singular : plural;
    });

    hbs.registerHelper('add', (...args: unknown[]) => {
      const numbers = args.slice(0, -1) as number[];
      return numbers.reduce((sum, n) => sum + n, 0);
    });

    hbs.registerHelper('uppercase', (str: string) => (str ? str.toUpperCase() : ''));
    hbs.registerHelper('capitalize', (str: string) =>
      str ? str.charAt(0).toUpperCase() + str.slice(1) : '',
    );

    hbs.registerHelper('capabilityIcon', (type: string) => {
      const icons: Record<string, string> = {
        tools: '🔧', resources: '📦', prompts: '💬',
        resourceTemplates: '📋', server: '⚙️', serverInfo: '⚙️',
      };
      return icons[type] || '';
    });

    hbs.registerHelper('contains', (array: unknown[], value: unknown) =>
      Array.isArray(array) ? array.includes(value) : false,
    );
  }
}
