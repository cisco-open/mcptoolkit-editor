// Copyright 2026 Cisco Systems, Inc. and its affiliates
//
// SPDX-License-Identifier: Apache-2.0

import { useMemo } from 'react';
import { McpDescRenderer } from '../../core/renderer';
import { mcpdescMarkdownTemplate } from '../../core/template';
import type { McpDescDocument } from '../../core/types';

const renderer = new McpDescRenderer();

export default function MarkdownView({ doc }: { doc: McpDescDocument }) {
  const markdown = useMemo(() => {
    try {
      return renderer.render(doc, mcpdescMarkdownTemplate);
    } catch (e) {
      return `<!-- Render error: ${(e as Error).message} -->`;
    }
  }, [doc]);

  return (
    <pre className="text-xs text-gray-700 whitespace-pre-wrap font-mono leading-relaxed p-1">
      {markdown}
    </pre>
  );
}
