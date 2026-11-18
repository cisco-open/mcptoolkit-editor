import { createHash } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { defaultSpecifications } from '@mcpdesc/validator';

// Follow the validator's maintained stable 0.9.0 default.
const selector = defaultSpecifications['0.9.0'].selector;
const manifestUrl = `https://mcpdesc.org/validation/catalogs/${selector}/manifest.json`;
async function fetchBytes(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch ${url}: ${response.status}`);
  return Buffer.from(await response.arrayBuffer());
}
const manifest = JSON.parse((await fetchBytes(manifestUrl)).toString());
if (manifest.snapshot !== selector || manifest.source.tag !== `v${selector}`) {
  throw new Error(`Rule catalog manifest does not match the ${selector} snapshot`);
}
const bytes = await fetchBytes(manifest.catalog.url);
if (createHash('sha256').update(bytes).digest('hex') !== manifest.catalog.sha256) {
  throw new Error('Rule catalog does not match its published SHA-256 digest');
}
const catalog = JSON.parse(bytes.toString());
const titles = Object.fromEntries(catalog.rules.map((rule) => {
  if (typeof rule.id !== 'string' || typeof rule.title !== 'string' || !rule.title.trim()) {
    throw new Error('Rule catalog contains an invalid identifier or title');
  }
  return [rule.id, rule.title];
}));
if (Object.keys(titles).length !== manifest.ruleCount) throw new Error('Rule catalog count mismatch');
await writeFile(new URL('../src/core/rule-titles.generated.json', import.meta.url), `${JSON.stringify({
  selector, manifestUrl, catalogSha256: manifest.catalog.sha256, titles,
}, null, 2)}\n`);