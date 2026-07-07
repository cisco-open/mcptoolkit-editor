// Copyright 2026 Cisco Systems, Inc. and its affiliates
//
// SPDX-License-Identifier: Apache-2.0

// Precompiles src/core/mcpdesc-schema.json into a standalone AJV validator
// module (src/core/validator.generated.js). This removes AJV's runtime use of
// `new Function()`, so the app-level validator runs under a strict
// Content-Security-Policy (script-src 'self', no 'unsafe-eval').
//
// Run via `npm run build:validator`. It is also invoked automatically before
// `npm run dev` and `npm run build`.

import Ajv from 'ajv';
import standaloneCode from 'ajv/dist/standalone/index.js';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const schemaPath = resolve(root, 'src/core/mcpdesc-schema.json');
const outPath = resolve(root, 'src/core/validator.generated.js');

const schema = JSON.parse(readFileSync(schemaPath, 'utf8'));

// Mirror the runtime options previously passed to `new Ajv(...)` in
// src/core/validator.ts. `code.esm` emits ESM so Vite can bundle the runtime
// helpers; `code.source` enables standalone code generation.
const ajv = new Ajv({
  allErrors: true,
  verbose: true,
  strict: false,
  validateFormats: false,
  code: { source: true, esm: true },
});

const validate = ajv.compile(schema);
let moduleCode = standaloneCode(ajv, validate);

// AJV's standalone output — even with `code.esm` — emits a few CommonJS
// `require("ajv/dist/runtime/…")` calls for shared runtime helpers. `require`
// is undefined in a browser ESM module, so hoist those into ESM imports.
const runtimeImports = new Map();
moduleCode = moduleCode.replace(
  /require\((["'])(ajv\/[^"']+)\1\)(\.default)?/g,
  (_match, _quote, modulePath, isDefault) => {
    const key = `${modulePath}${isDefault ? '#default' : '#namespace'}`;
    if (!runtimeImports.has(key)) {
      runtimeImports.set(key, {
        name: `__ajvRuntime${runtimeImports.size}`,
        modulePath,
        isDefault: Boolean(isDefault),
      });
    }
    return runtimeImports.get(key).name;
  },
);

const importLines = [...runtimeImports.values()]
  .map(({ name, modulePath, isDefault }) =>
    isDefault
      ? `import ${name} from ${JSON.stringify(modulePath)};`
      : `import * as ${name} from ${JSON.stringify(modulePath)};`,
  )
  .join('\n');

if (importLines) {
  moduleCode = `${importLines}\n${moduleCode}`;
}

const header = `// Copyright 2026 Cisco Systems, Inc. and its affiliates
//
// SPDX-License-Identifier: Apache-2.0
//
// GENERATED FILE — do not edit by hand. Produced by scripts/build-validator.mjs
// from src/core/mcpdesc-schema.json. Run \`npm run build:validator\` to regenerate.
`;

writeFileSync(outPath, header + moduleCode);
console.log(`Wrote precompiled validator -> ${outPath}`);
