import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { specificationProvenance } from '@mcpdesc/validator';

const selector = '0.9.0-rc.2';
const source = new URL(`./snapshots/${selector}/schema.json`, import.meta.resolve('@mcpdesc/validator'));
const schema = await readFile(source);
const provenance = specificationProvenance[selector];
if (createHash('sha256').update(schema).digest('hex') !== provenance.schemaSha256) {
  throw new Error('RC schema does not match the published validator provenance');
}
if (JSON.parse(schema.toString()).$id !== provenance.schemaUri) {
  throw new Error('RC schema identifier does not match the pinned selector');
}
await writeFile(new URL('../src/core/mcpdesc-schema-0.9.0-rc.2.json', import.meta.url), schema);