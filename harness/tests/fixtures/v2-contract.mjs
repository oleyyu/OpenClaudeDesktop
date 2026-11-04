// OpenCode 2.x's route contract for the v2 tests: v2/openapi-routes.json (make-routes.mjs, from 2.2.5's
// packages/protocol/openapi.json). Every request the bridge sends must name a route of it, only query parameters it
// declares, and only body keys its schema has (the schemas are additionalProperties:false).
import fs from 'node:fs'

export const CONTRACT = JSON.parse(fs.readFileSync(new URL('./v2/openapi-routes.json', import.meta.url), 'utf8'))

const templates = Object.keys(CONTRACT.routes).map((key) => {
  const [method, route] = key.split(' ')
  const names = []
  const pattern = new RegExp('^' + route.replace(/[.*+?^$()|[\]\\]/g, '\\$&').replace(/\{([^}]+)\}/g, (_, name) => { names.push(name); return '([^/]+)' }) + '$')
  // Literal segments win over parameters (/api/session/active before /api/session/{sessionID}).
  return { key, method, pattern, names, literal: route.replace(/\{[^}]+\}/g, '').length }
}).sort((a, b) => b.literal - a.literal)

/** The contract route of a request ({key, params}), or null. */
export function matchRoute(method, pathname) {
  for (const entry of templates) {
    if (entry.method !== method) continue
    const match = entry.pattern.exec(pathname)
    if (match) return { key: entry.key, params: Object.fromEntries(entry.names.map((name, index) => [name, decodeURIComponent(match[index + 1])])) }
  }
  return null
}

/** What a request does that the contract does not allow (empty when it is fine). */
export function contractViolations(method, url, body) {
  const target = new URL(url)
  const route = matchRoute(method, target.pathname)
  if (!route) return [`no route ${method} ${target.pathname}`]
  const spec = CONTRACT.routes[route.key]
  const out = []
  for (const name of new Set([...target.searchParams.keys()].map((key) => key.replace(/\[.*$/, '')))) {
    if (!spec.query.includes(name)) out.push(`${route.key}: query ${name} is not declared`)
  }
  if (target.searchParams.has('types')) out.push(`${route.key}: never send ?types=`)
  if (body === undefined) {
    if (spec.body && spec.required?.length) out.push(`${route.key}: body required`)
    return out
  }
  if (spec.body === null) { out.push(`${route.key}: takes no body`); return out }
  if (spec.body === '*') return out
  if (!body || typeof body !== 'object' || Array.isArray(body)) { out.push(`${route.key}: body is not an object`); return out }
  for (const key of Object.keys(body)) if (!spec.body.includes(key)) out.push(`${route.key}: body key ${key} is not in the schema`)
  for (const key of spec.required ?? []) if (!Object.hasOwn(body, key)) out.push(`${route.key}: body key ${key} is required`)
  return out
}
