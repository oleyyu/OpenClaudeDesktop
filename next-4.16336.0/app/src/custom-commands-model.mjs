import { parseDocument } from 'yaml';
import { t } from '../electron/i18n/index.mjs';

// Custom slash commands (C3): Markdown prompt templates with optional frontmatter
//   ---
//   description: Review the staged diff
//   argument-hint: [focus]
//   ---
//   Review my staged changes. Focus on $ARGUMENTS.
// The main process (electron/custom-commands.cjs) lists the raw files; everything here is pure.

export const COMMAND_NAME = /^[a-z0-9][a-z0-9_-]{0,63}$/i;
export const MAX_COMMAND_BYTES = 64 * 1024;
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const scalar = value => value == null || object(value) || Array.isArray(value) ? '' : String(value).replace(/\s+/g, ' ').trim();
// An unquoted `argument-hint: [pr-number]` is a YAML flow sequence; show it as written.
const hint = value => Array.isArray(value) && value.every(item => item == null || !object(item) && !Array.isArray(item)) ? `[${value.join(', ')}]` : scalar(value);
const FRONTMATTER = /^﻿?---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)([\s\S]*)$/;
const EMPTY_FRONTMATTER = /^﻿?---[ \t]*\r?\n---[ \t]*(?:\r?\n|$)([\s\S]*)$/;

// Lenient `key: value` reader for a header that is not valid YAML (an unquoted ': ' in a description).
function looseFields(header) {
  const fields = {};
  for (const line of header.split(/\r?\n/)) {
    const match = /^([A-Za-z][\w-]*)\s*:\s*(.*)$/.exec(line);
    if (!match) continue;
    let value = match[2].trim();
    if (/^(["']).*\1$/.test(value)) value = value.slice(1, -1);
    fields[match[1]] = value;
  }
  return fields;
}

export function parseCommandFile(text) {
  const source = String(text ?? '').replace(/\r\n/g, '\n');
  let fields = {}, body = source.replace(/^﻿/, '');
  const empty = EMPTY_FRONTMATTER.exec(source), header = empty ? null : FRONTMATTER.exec(source);
  if (empty) body = empty[1];
  else if (header) {
    body = header[2];
    try {
      const document = parseDocument(header[1], { prettyErrors: false });
      const data = document.errors.length ? null : document.toJS({ maxAliasCount: 10 });
      fields = object(data) ? data : looseFields(header[1]);
    } catch { fields = looseFields(header[1]); }
  }
  return {
    description: scalar(fields.description).slice(0, 300),
    argumentHint: hint(fields['argument-hint'] ?? fields.argumentHint ?? fields.argument_hint).slice(0, 120),
    body: body.replace(/^\s*\n/, '').replace(/\s+$/, ''),
  };
}

// The description shown in '/' and Settings: the frontmatter one, else the body's first line.
export function commandSummary(parsed) {
  if (parsed?.description) return parsed.description;
  const line = String(parsed?.body || '').split('\n').map(value => value.replace(/^#+\s*/, '').trim()).find(Boolean) || '';
  return line.length > 100 ? `${line.slice(0, 99)}…` : line;
}

const yamlValue = value => {
  const text = scalar(value);
  return /[:#]|^[\s'"\[\]{}>|*&!%@`,?-]|\s$/.test(text) ? JSON.stringify(text) : text;
};
export function serializeCommandFile({ description = '', argumentHint = '', body = '' } = {}) {
  const lines = [];
  if (scalar(description)) lines.push(`description: ${yamlValue(description)}`);
  if (scalar(argumentHint)) lines.push(`argument-hint: ${yamlValue(argumentHint)}`);
  const text = String(body ?? '').replace(/\r\n/g, '\n').replace(/\s+$/, '');
  return (lines.length ? `---\n${lines.join('\n')}\n---\n\n` : '') + text + '\n';
}

const PLACEHOLDER = /\$ARGUMENTS\b|\{\{\s*args\s*\}\}/g;
export function hasArgumentsPlaceholder(body) {
  return new RegExp(PLACEHOLDER.source).test(String(body ?? ''));
}
// Every $ARGUMENTS / {{args}} / {{ args }} becomes the typed arguments. A template without a
// placeholder gets non-empty arguments appended after a blank line.
export function expandCommand(body, args = '') {
  const template = String(body ?? ''), value = String(args ?? '').trim();
  if (hasArgumentsPlaceholder(template)) return template.replace(PLACEHOLDER, () => value);
  return value ? `${template}\n\n${value}` : template;
}

export function validateCommandName(name) {
  if (typeof name !== 'string' || !name) return t('Enter a command name.');
  if (!COMMAND_NAME.test(name)) return t('Use letters, numbers, - or _ (up to 64 characters), starting with a letter or number.');
  return '';
}

const filesOf = value => Array.isArray(value) ? value : Array.isArray(value?.files) ? value.files : [];
// Rows for '/' and Settings. Precedence: built-in commands > project > global > skills. A shadowed
// row stays in the result with shadowedBy ('built-in' | 'project') so Settings can badge it; '/'
// shows only rows without shadowedBy. hidesSkill marks a command that hides a same-name skill.
export function mergeCommands({ global, project, builtinIds = [], skillNames = [] } = {}) {
  const builtins = new Set([...builtinIds].map(id => String(id).toLowerCase()));
  const skills = new Set([...skillNames].map(id => String(id).toLowerCase()));
  const taken = new Map(), rows = [];
  for (const [scope, list] of [['project', filesOf(project)], ['global', filesOf(global)]]) {
    for (const file of list) {
      if (typeof file?.name !== 'string' || !COMMAND_NAME.test(file.name)) continue;
      const key = file.name.toLowerCase(), parsed = parseCommandFile(file.text);
      const row = { name: file.name, description: commandSummary(parsed), argumentHint: parsed.argumentHint, body: parsed.body,
        scope, path: typeof file.path === 'string' ? file.path : '', text: String(file.text ?? '') };
      if (builtins.has(key)) row.shadowedBy = 'built-in';
      else if (taken.has(key)) row.shadowedBy = taken.get(key);
      else { taken.set(key, scope); if (skills.has(key)) row.hidesSkill = true; }
      rows.push(row);
    }
  }
  return rows;
}
