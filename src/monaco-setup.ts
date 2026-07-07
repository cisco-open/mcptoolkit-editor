// Copyright 2026 Cisco Systems, Inc. and its affiliates
//
// SPDX-License-Identifier: Apache-2.0

import * as monaco from 'monaco-editor';
import { loader } from '@monaco-editor/react';
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker';

// Serve Monaco's web workers from our own origin (no CDN).
// The editor only edits JSON and YAML; JSON Schema autocomplete/validation
// uses the JSON worker, everything else uses the base editor worker.
self.MonacoEnvironment = {
  getWorker(_id, label) {
    if (label === 'json') return new jsonWorker();
    return new editorWorker();
  },
};

// Use the bundled monaco instead of @monaco-editor/loader's default CDN.
loader.config({ monaco });
