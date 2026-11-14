// Stage the target's exact design assets without changing the active application.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { parseAst } from 'rolldown/parseAst';
import * as official from './official-4.16336.0.mjs';
const appRoot = path.resolve(import.meta.dirname, '..');
export const defaultDesignStage = path.resolve(appRoot, '../analysis/claude-4.16336.0-migrate-20261104/design-wave/staging/public');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const safeName = name => {
  if (!/^[\w.-]+$/.test(name) || name === '.' || name === '..') throw Error(`Unexpected asset name: ${name}`);
  return name;
};
const keyOf = node => node.type === 'Identifier' ? node.name : String(node.value);
function numericMap(node) {
  if (node?.type !== 'ObjectExpression') throw Error('Expected a static icon map');
  const result = {};
  for (const property of node.properties) {
    if (property.type !== 'Property' || property.computed || property.value.type !== 'Literal'
        || !Number.isSafeInteger(property.value.value)) throw Error('Non-static icon glyph');
    const key = keyOf(property.key);
    if (Object.hasOwn(result, key)) throw Error(`Duplicate icon: ${key}`);
    result[key] = property.value.value;
  }
  return result;
}
function iconData(code) {
  const matches = [];
  for (const statement of parseAst(code).body) if (statement.type === 'VariableDeclaration') {
    for (const declaration of statement.declarations) {
      if (declaration.id.type !== 'Identifier' || declaration.init?.type !== 'ObjectExpression') continue;
      const properties = new Map(declaration.init.properties.filter(p => p.type === 'Property' && !p.computed).map(p => [keyOf(p.key), p.value]));
      if (!properties.has('icons') || !properties.has('secondary') || !properties.has('next')) continue;
      const icons = numericMap(properties.get('icons'));
      if (icons.Activity !== 57344) continue;
      const secondary = numericMap(properties.get('secondary'));
      const next = properties.get('next');
      if (next.type !== 'Literal' || !Number.isSafeInteger(next.value)) throw Error('Non-static next glyph');
      matches.push({ binding: declaration.id.name, icons, secondary, next: next.value });
    }
  }
  if (matches.length !== 1 || Object.keys(matches[0].icons).length !== 412 || Object.keys(matches[0].secondary).length !== 24)
    throw Error('The pinned 4.16336.0 icon contract changed');
  return matches[0];
}

export async function prepareDesignV4({ output = defaultDesignStage, check = false } = {}) {
  output = path.resolve(output);
  const html = await fs.readFile(path.join(official.snapshotRoot, 'ion-dist/index.html'), 'utf8');
  const links = [...html.matchAll(/<link\b[^>]*>/g)].map(([tag]) => Object.fromEntries([...tag.matchAll(/([\w-]+)="([^"]*)"/g)].map(([, key, value]) => [key, value])));
  const entryStylesheets = links.filter(link => link.rel === 'stylesheet').map(link => safeName(link.href.replace(/^\/assets\/v1\//, '')));
  if (JSON.stringify(entryStylesheets) !== JSON.stringify(['shared-frame-BRemtw6F.css', 'shared-styles-C9nbzN1z.css', 'c6a992d55-_JRfOmTh.css']))
    throw Error('Target entry CSS order changed');
  const preloadedFonts = links.filter(link => link.rel === 'preload' && link.as === 'font').map(link => safeName(link.href.replace(/^\/assets\/v1\//, '')));
  const rootTag = html.match(/<html\b[^>]*>/)?.[0] ?? '';
  const rootAttributes = Object.fromEntries([...rootTag.matchAll(/(data-(?:theme|mode|density|color-version|cds-fizzy-lake))="([^"]*)"/g)].map(([, key, value]) => [key, value]));
  const files = new Map(), records = [];
  const cssNames = (await fs.readdir(official.ionSource)).filter(name => name.endsWith('.css')).sort();
  if (cssNames.length !== 25) throw Error('Target CSS inventory changed');
  const assetNames = new Set(preloadedFonts);
  for (const name of cssNames) {
    const bytes = await fs.readFile(path.join(official.ionSource, name));
    const raw = bytes.toString();
    if (/@import\s/i.test(raw)) throw Error(`Review CSS import in ${name}`);
    const references = [];
    for (const match of raw.matchAll(/url\(\s*(?:"([^"]*)"|'([^']*)'|([^)]*))\s*\)/g)) {
      const url = (match[1] ?? match[2] ?? match[3]).trim();
      if (url.startsWith('data:') || url.startsWith('#')) continue;
      if (!url.startsWith('/assets/v1/')) throw Error(`Review asset URL in ${name}: ${url}`);
      const asset = safeName(url.slice('/assets/v1/'.length));
      assetNames.add(asset); references.push(asset);
    }
    const content = Buffer.from(raw.replaceAll('/assets/v1/', './'));
    const target = `assets/v1/${name}`;
    files.set(target, content);
    records.push({ source: name, target, kind: 'css', sourceSha256: sha(bytes), sha256: sha(content),
      transform: 'Only /assets/v1/ URLs made relative', references: [...new Set(references)].sort() });
  }
  for (const name of [...assetNames].sort()) {
    const bytes = await fs.readFile(path.join(official.ionSource, name));
    const target = `assets/v1/${name}`;
    files.set(target, bytes);
    records.push({ source: name, target, kind: /\.(woff2?|ttf|otf)$/.test(name) ? 'font' : 'asset', sourceSha256: sha(bytes), sha256: sha(bytes) });
  }
  const iconCode = await fs.readFile(path.join(official.ionSource, official.sharedFrame), 'utf8');
  official.assertPinnedSource(official.sharedFrame, iconCode);
  const icons = { referenceVersion: official.referenceVersion, referenceSnapshot: official.referenceSnapshot,
    source: official.sharedFrame, sourceSha256: sha(iconCode), ...iconData(iconCode) };
  const iconTarget = 'reference/anthropicons-v4.json';
  const iconBytes = Buffer.from(JSON.stringify(icons, null, 2) + '\n');
  files.set(iconTarget, iconBytes);
  records.push({ source: official.sharedFrame, target: iconTarget, kind: 'icon-data', sourceSha256: sha(iconCode), sha256: sha(iconBytes), transform: 'Static numeric icon/secondary maps extracted via AST' });
  const manifest = { referenceVersion: official.referenceVersion, referenceSnapshot: official.referenceSnapshot,
    generator: 'scripts/prepare-design-v4.mjs', scope: 'Isolated assets only; no production UI or visual parity claim',
    entryStylesheets, componentStylesheets: cssNames.filter(name => !entryStylesheets.includes(name)),
    preloadedFonts, rootAttributes, iconCount: Object.keys(icons.icons).length, secondaryCount: Object.keys(icons.secondary).length,
    files: records };
  files.set('design-v4-provenance.json', Buffer.from(JSON.stringify(manifest, null, 2) + '\n'));
  if (check) {
    const actual = (await fs.readdir(output, { recursive: true, withFileTypes: true })).filter(entry => entry.isFile())
      .map(entry => path.relative(output, path.join(entry.parentPath, entry.name))).sort();
    if (JSON.stringify(actual) !== JSON.stringify([...files.keys()].sort())) throw Error('Staged design file inventory differs');
    for (const [name, bytes] of files) if (!(await fs.readFile(path.join(output, name))).equals(bytes)) throw Error(`Staged design mismatch: ${name}`);
  } else {
    for (const [name, bytes] of files) { const target = path.join(output, name); await fs.mkdir(path.dirname(target), { recursive: true }); await fs.writeFile(target, bytes); }
  }
  return manifest;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const index = process.argv.indexOf('--output');
  if (index !== -1 && (!process.argv[index + 1] || process.argv[index + 1].startsWith('--'))) throw Error('--output requires a directory');
  const manifest = await prepareDesignV4({ output: index === -1 ? undefined : process.argv[index + 1], check: process.argv.includes('--check') });
  console.log(JSON.stringify({ version: manifest.referenceVersion, css: manifest.entryStylesheets.length + manifest.componentStylesheets.length,
    fonts: manifest.files.filter(file => file.kind === 'font').length, icons: manifest.iconCount, secondary: manifest.secondaryCount, check: process.argv.includes('--check') }));
}
