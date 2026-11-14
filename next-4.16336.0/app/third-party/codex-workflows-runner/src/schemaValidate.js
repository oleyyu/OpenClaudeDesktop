// Local addition (Code Desktop): agent schema admission uses the shared core
// compiler below. The dependency-free value validator is retained only for
// legacy session extensions. It covers —
// type/enum/const, object (properties, required, additionalProperties,
// min/maxProperties), array (items, prefixItems, min/maxItems, uniqueItems),
// string (min/maxLength, pattern), number (minimum/maximum, exclusive*,
// multipleOf), anyOf/oneOf/allOf/not and local $ref (#/$defs/…, #/definitions/…).
// `format` is an annotation. Returns a list of "<path>: <problem>" strings.

import {compileStructuredOutputSchema} from './workflow-schema.js';

const typeOf = v => v === null ? "null" : Array.isArray(v) ? "array" : typeof v;
function matchesType(v, t) {
  if (t === "integer") return typeof v === "number" && Number.isInteger(v);
  if (t === "number") return typeof v === "number" && Number.isFinite(v);
  return typeOf(v) === t;
}
function equal(a, b) {
  if (a === b) return true;
  if (typeOf(a) !== typeOf(b) || typeof a !== "object" || a === null) return false;
  if (Array.isArray(a)) return a.length === b.length && a.every((x, i) => equal(x, b[i]));
  const ka = Object.keys(a), kb = Object.keys(b);
  return ka.length === kb.length && ka.every(k => Object.hasOwn(b, k) && equal(a[k], b[k]));
}
function resolveRef(root, ref) {
  if (typeof ref !== "string" || !ref.startsWith("#")) return undefined;
  let node = root;
  for (const part of ref.slice(1).split("/").filter(Boolean)) {
    const key = decodeURIComponent(part).replace(/~1/g, "/").replace(/~0/g, "~");
    if (!node || typeof node !== "object" || !Object.hasOwn(node, key)) return undefined;
    node = node[key];
  }
  return node;
}

export function validateSchema(value, schema, root = schema, path = "$", errors = [], depth = 0) {
  if (schema === true || schema == null) return errors;
  if (schema === false) { errors.push(`${path}: no value is allowed here`); return errors; }
  if (typeof schema !== "object" || errors.length > 50) return errors;
  if (depth > 64) { errors.push(`${path}: schema nesting too deep`); return errors; }
  if (schema.$ref !== undefined) {
    const target = resolveRef(root, schema.$ref);
    if (target === undefined) errors.push(`${path}: unresolvable $ref ${schema.$ref}`);
    else validateSchema(value, target, root, path, errors, depth + 1);
  }
  const types = schema.type === undefined ? null : Array.isArray(schema.type) ? schema.type : [schema.type];
  if (types && !types.some(t => matchesType(value, t))) {
    errors.push(`${path}: expected ${types.join(" or ")}, got ${typeOf(value)}`);
    return errors;
  }
  if (Array.isArray(schema.enum) && !schema.enum.some(e => equal(e, value))) errors.push(`${path}: must be one of ${JSON.stringify(schema.enum)}`);
  if (Object.hasOwn(schema, "const") && !equal(schema.const, value)) errors.push(`${path}: must equal ${JSON.stringify(schema.const)}`);
  const t = typeOf(value);
  if (t === "object") {
    const props = schema.properties && typeof schema.properties === "object" ? schema.properties : {};
    for (const k of Array.isArray(schema.required) ? schema.required : []) if (!Object.hasOwn(value, k)) errors.push(`${path}: missing required property "${k}"`);
    for (const [k, v] of Object.entries(value)) {
      if (Object.hasOwn(props, k)) validateSchema(v, props[k], root, `${path}.${k}`, errors, depth + 1);
      else if (schema.additionalProperties === false) errors.push(`${path}: unexpected property "${k}"`);
      else if (schema.additionalProperties && typeof schema.additionalProperties === "object") validateSchema(v, schema.additionalProperties, root, `${path}.${k}`, errors, depth + 1);
    }
    const n = Object.keys(value).length;
    if (schema.minProperties != null && n < schema.minProperties) errors.push(`${path}: needs at least ${schema.minProperties} properties`);
    if (schema.maxProperties != null && n > schema.maxProperties) errors.push(`${path}: allows at most ${schema.maxProperties} properties`);
  } else if (t === "array") {
    const prefix = Array.isArray(schema.prefixItems) ? schema.prefixItems : Array.isArray(schema.items) ? schema.items : [];
    value.forEach((v, i) => {
      if (i < prefix.length) validateSchema(v, prefix[i], root, `${path}[${i}]`, errors, depth + 1);
      else if (schema.items && !Array.isArray(schema.items)) validateSchema(v, schema.items, root, `${path}[${i}]`, errors, depth + 1);
    });
    if (schema.minItems != null && value.length < schema.minItems) errors.push(`${path}: needs at least ${schema.minItems} items`);
    if (schema.maxItems != null && value.length > schema.maxItems) errors.push(`${path}: allows at most ${schema.maxItems} items`);
    if (schema.uniqueItems && value.some((v, i) => value.findIndex(w => equal(v, w)) !== i)) errors.push(`${path}: items must be unique`);
  } else if (t === "string") {
    const len = [...value].length;
    if (schema.minLength != null && len < schema.minLength) errors.push(`${path}: shorter than ${schema.minLength} characters`);
    if (schema.maxLength != null && len > schema.maxLength) errors.push(`${path}: longer than ${schema.maxLength} characters`);
    if (typeof schema.pattern === "string") { try { if (!new RegExp(schema.pattern, "u").test(value)) errors.push(`${path}: does not match /${schema.pattern}/`); } catch {} }
  } else if (t === "number") {
    if (schema.minimum != null && value < schema.minimum) errors.push(`${path}: must be >= ${schema.minimum}`);
    if (schema.maximum != null && value > schema.maximum) errors.push(`${path}: must be <= ${schema.maximum}`);
    if (typeof schema.exclusiveMinimum === "number" && value <= schema.exclusiveMinimum) errors.push(`${path}: must be > ${schema.exclusiveMinimum}`);
    if (typeof schema.exclusiveMaximum === "number" && value >= schema.exclusiveMaximum) errors.push(`${path}: must be < ${schema.exclusiveMaximum}`);
    if (schema.multipleOf > 0 && Math.abs(value / schema.multipleOf - Math.round(value / schema.multipleOf)) > 1e-9) errors.push(`${path}: must be a multiple of ${schema.multipleOf}`);
  }
  const sub = s => validateSchema(value, s, root, path, [], depth + 1);
  if (Array.isArray(schema.allOf)) for (const s of schema.allOf) validateSchema(value, s, root, path, errors, depth + 1);
  if (Array.isArray(schema.anyOf)) {
    const results = schema.anyOf.map(sub);
    if (!results.some(r => !r.length)) errors.push(`${path}: matches none of anyOf (${results.map(r => r[0]).filter(Boolean).slice(0, 3).join("; ")})`);
  }
  if (Array.isArray(schema.oneOf)) {
    const results = schema.oneOf.map(sub), ok = results.filter(r => !r.length).length;
    if (ok !== 1) errors.push(ok ? `${path}: matches ${ok} branches of oneOf, expected exactly 1` : `${path}: matches none of oneOf (${results.map(r => r[0]).filter(Boolean).slice(0, 3).join("; ")})`);
  }
  if (schema.not !== undefined && !sub(schema.not).length) errors.push(`${path}: must not match the "not" schema`);
  return errors;
}

// Agent admission uses the same full compiler and bounded contradiction lint as
// the Harness. The legacy value validator above remains for session extensions.
export function schemaProblem(schema) {
  // The workflow boundary already copied guest data; detach its VM prototypes
  // before the host's lossless-JSON check (the guest freezes its constructors).
  try { compileStructuredOutputSchema(structuredClone(schema)); return null; }
  catch (error) { return error.message; }
}
