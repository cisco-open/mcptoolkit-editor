import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { defaultSpecifications, specificationProvenance } from '@mcpdesc/validator';

// Follow the validator's maintained 0.9.0 default (an approved RC until 0.9.0 is final).
const selector = defaultSpecifications['0.9.0'].selector;
const source = new URL(`./snapshots/${selector}/schema.json`, import.meta.resolve('@mcpdesc/validator'));
const schema = await readFile(source);
const provenance = specificationProvenance[selector];
if (createHash('sha256').update(schema).digest('hex') !== provenance.schemaSha256) {
  throw new Error(`${selector} schema does not match the published validator provenance`);
}
if (JSON.parse(schema.toString()).$id !== provenance.schemaUri) {
  throw new Error(`${selector} schema identifier does not match the selector provenance`);
}
await writeFile(new URL('../src/core/mcpdesc-schema.json', import.meta.url), schema);
console.log(`Wrote src/core/mcpdesc-schema.json for ${selector}`);
