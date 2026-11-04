#!/usr/bin/env node
// Writes openapi-routes.json (next to this file) from OpenCode 2.x's route contract, so the v2 tests check every
// request the bridge sends without depending on the OpenCode source tree:
//
//   node tests/fixtures/v2/make-routes.mjs <opencode>/packages/protocol/openapi.json [version]
//
// Per route ("METHOD /path/{param}"): its query parameter names, and its JSON body's top-level keys (null: no body;
// "*": a body of any shape), required ones apart. Zero dependencies.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const source = process.argv[2]
// The release the file came from (the document itself says 0.0.1).
const version = process.argv[3] ?? null
if (!source) { process.stderr.write('usage: make-routes.mjs <openapi.json>\n'); process.exit(2) }
const doc = JSON.parse(fs.readFileSync(source, 'utf8'))
const schemas = doc.components?.schemas ?? {}

const resolve = (schema, depth = 0) => {
  if (!schema || depth > 20) return schema
  if (schema.$ref) return resolve(schemas[schema.$ref.replace('#/components/schemas/', '')], depth + 1)
  return schema
}

/** {keys, required} of an object schema (anyOf / oneOf: the union; allOf: merged), or null when it has no fixed keys. */
function bodyKeys(schema, depth = 0) {
  schema = resolve(schema)
  if (!schema || depth > 20) return null
  const parts = schema.anyOf ?? schema.oneOf
  if (parts) {
    const all = parts.map((part) => resolve(part)).filter((part) => part?.type !== 'null').map((part) => bodyKeys(part, depth + 1))
    if (!all.length || all.some((entry) => entry === null)) return null
    return { keys: [...new Set(all.flatMap((entry) => entry.keys))].sort(), required: all.map((entry) => entry.required).reduce((a, b) => a.filter((key) => b.includes(key))) }
  }
  if (schema.allOf) {
    const all = schema.allOf.map((part) => bodyKeys(part, depth + 1))
    if (all.some((entry) => entry === null)) return null
    return { keys: [...new Set(all.flatMap((entry) => entry.keys))].sort(), required: [...new Set(all.flatMap((entry) => entry.required))].sort() }
  }
  if (schema.type === 'object' && schema.properties) return { keys: Object.keys(schema.properties).sort(), required: [...(schema.required ?? [])].sort() }
  return null
}

const routes = {}
for (const [route, item] of Object.entries(doc.paths ?? {})) {
  for (const [method, operation] of Object.entries(item)) {
    if (!['get', 'post', 'put', 'patch', 'delete'].includes(method)) continue
    const query = (operation.parameters ?? []).filter((param) => param.in === 'query').map((param) => param.name).sort()
    const content = operation.requestBody?.content?.['application/json']
    const keys = content ? bodyKeys(content.schema) : null
    routes[`${method.toUpperCase()} ${route}`] = {
      query,
      body: content ? (keys ? keys.keys : '*') : null,
      ...(keys?.required?.length ? { required: keys.required } : {}),
      responses: Object.keys(operation.responses ?? {}).sort(),
    }
  }
}
const out = path.join(path.dirname(fileURLToPath(import.meta.url)), 'openapi-routes.json')
fs.writeFileSync(out, JSON.stringify({ source: `opencode ${version ?? doc.info?.version ?? '?'} packages/protocol/openapi.json`, routes }, null, 1) + '\n')
process.stdout.write(`${Object.keys(routes).length} routes → ${out}\n`)
