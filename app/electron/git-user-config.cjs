'use strict';
// The few system/global Git settings a Windows workspace query must keep (docs/windows-bugs.md R7).
//
// git-status.cjs and file-name-search-worker.cjs run Git with GIT_CONFIG_NOSYSTEM=1 and GIT_CONFIG_GLOBAL=/dev/null:
// a read-only query must not run programs or change its output format because of the user's or the machine's
// configuration (a global core.fsmonitor / filter.*.process / diff.external / core.pager / status or diff display
// settings that the parsers would trip over). That stays. On Windows, though, two kinds of setting that only live
// there are what makes Git work at all:
//  - Git for Windows' installer writes core.autocrlf=true (and core.fscache) into the system gitconfig, and users
//    set core.longpaths / core.eol globally. Without them a CRLF working tree reads as every line changed.
//  - safe.directory is honoured only in protected configuration (system, global, command line). A repository on
//    a FAT32/exFAT drive, a network share or one made by another account fails with "dubious ownership" until the
//    user adds it there — so the query must see the user's own entries, exactly as their command-line Git does.
// Those keys alone are read once (every TTL_MS, so a `git config --global --add safe.directory …` applies soon),
// from the system and global scopes only, and handed back as `-c` arguments. macOS/Linux: nothing is read.
const { execFile } = require('node:child_process');
const os = require('node:os');

const CORE_KEYS = ['core.autocrlf', 'core.safecrlf', 'core.eol', 'core.longpaths', 'core.fscache'];
const PATTERN = `^(${CORE_KEYS.map((key) => key.replace('.', '\\.')).join('|')}|safe\\.directory)$`;
const KEYS = new RegExp(PATTERN);
const TTL_MS = 30000;
const EMPTY = Object.freeze({ core: Object.freeze({}), safeDirectories: Object.freeze([]) });

/** `git config --show-scope --null --get-regexp` output → { core: {key: value}, safeDirectories: [...] }, system/global only. */
function parseUserGitConfig(output) {
  const core = {}, safeDirectories = [];
  const parts = String(output || '').split('\0');
  // Each record is "scope\0key\nvalue\0"; precedence order (system before global), so a later value wins.
  for (let at = 0; at + 1 < parts.length; at += 2) {
    const scope = parts[at], record = parts[at + 1];
    if (scope !== 'system' && scope !== 'global') continue;
    const newline = record.indexOf('\n');
    const key = (newline < 0 ? record : record.slice(0, newline)).toLowerCase(), value = newline < 0 ? 'true' : record.slice(newline + 1);
    if (!KEYS.test(key)) continue;
    if (key === 'safe.directory') safeDirectories.push(value); // an empty value resets the list: forwarded in order, it still does
    else core[key] = value;
  }
  return { core, safeDirectories };
}

function readEnvironment() {
  // No inherited GIT_* (GIT_CONFIG_PARAMETERS, GIT_DIR…): the user's own system and global files, as a new shell sees them.
  return { ...Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith('GIT_'))), LC_ALL: 'C' };
}

let cached = null;
/**
 * The user's system/global settings for the keys above ({ core, safeDirectories }); EMPTY off Windows, when Git is
 * missing or too old for --show-scope (2.26), or on any error — the query then runs exactly as before.
 * run: test seam (execFile's signature).
 */
function userGitConfig({ platform = process.platform, run = execFile, now = Date.now } = {}) {
  if (platform !== 'win32') return Promise.resolve(EMPTY);
  if (cached && now() - cached.at < TTL_MS) return cached.value;
  const value = new Promise((resolve) => {
    try {
      // cwd: a folder outside any workspace (the scope filter drops repository-local values anyway).
      run('git', ['--no-pager', 'config', '--show-scope', '--null', '--get-regexp', PATTERN], {
        cwd: os.tmpdir(), env: readEnvironment(), encoding: 'utf8', windowsHide: true, timeout: 5000, maxBuffer: 1024 * 1024,
      }, (error, stdout) => {
        // Exit 1: none of the keys is set.
        if (error && error.code !== 1) { resolve(EMPTY); return; }
        try { resolve(parseUserGitConfig(stdout)); } catch { resolve(EMPTY); }
      });
    } catch { resolve(EMPTY); }
  });
  cached = { at: now(), value };
  return value;
}

/** `-c safe.directory=…` for each of the user's entries (they apply before Git opens the repository). */
function safeDirectoryArgs(config) {
  return (config?.safeDirectories || []).flatMap((value) => ['-c', `safe.directory=${value}`]);
}

/**
 * `-c key=value` for the user's core settings the repository does not set itself: `-c` outranks the repository's
 * own .git/config, so a key it sets (localKeys, lower-case names) keeps its value, as in the user's command-line Git.
 */
function coreArgs(config, localKeys = []) {
  const local = new Set([...localKeys].map((key) => String(key).toLowerCase()));
  return Object.entries(config?.core || {}).filter(([key]) => !local.has(key)).flatMap(([key, value]) => ['-c', `${key}=${value}`]);
}

module.exports = { userGitConfig, parseUserGitConfig, safeDirectoryArgs, coreArgs, CORE_KEYS, clearUserGitConfigCache: () => { cached = null; } };
