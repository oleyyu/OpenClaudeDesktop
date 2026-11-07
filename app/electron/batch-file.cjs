'use strict';
// Batch files (.cmd) this app writes on Windows (core-manager.cjs terminal shims, browser/install.cjs Chrome host).
//
// cmd.exe decodes a batch file line by line in the console's code page (936 on Chinese Windows, 437/850/1252…
// elsewhere), never as UTF-8 unless that code page is 65001. A path with a non-ASCII character written as UTF-8 text —
// C:\Users\张三\AppData\Roaming\…, a folder the portable app was unpacked into — is garbled, and cmd reports "The
// system cannot find the path specified" (docs/windows-bugs.md R10). Variables are Unicode, so:
//  - batchValue / batchPath: a non-ASCII path under the user's profile is written as %LOCALAPPDATA% / %APPDATA% /
//    %USERPROFILE% plus the rest (cmd expands those at run time). An ASCII path stays literal, as before.
//  - batchFile: whatever is still non-ASCII after that runs under `chcp 65001` (the file is UTF-8), the console's own
//    code page restored afterwards and the program's exit code kept. An all-ASCII file is unchanged.
// `%` in a literal is doubled so cmd doesn't expand it.

const PROFILE_VARIABLES = ['LOCALAPPDATA', 'APPDATA', 'USERPROFILE'];
const ASCII = /^[\x00-\x7f]*$/;

/** A path for a batch line, unquoted: literal when ASCII, else the longest profile variable it starts with + the rest. */
function batchValue(value, env = process.env) {
  const text = String(value);
  if (ASCII.test(text)) return text.replace(/%/g, '%%');
  let best = null;
  for (const name of PROFILE_VARIABLES) {
    const root = typeof env?.[name] === 'string' ? env[name].replace(/[\\/]+$/, '') : '';
    // A drive root alone ("C:") is no prefix worth naming; the next character must start a path component.
    // Windows paths: case-insensitive, "/" and "\\" alike.
    const fold = (part) => part.replace(/\//g, '\\').toLowerCase();
    if (root.length < 3 || fold(text.slice(0, root.length)) !== fold(root)) continue;
    const next = text.charAt(root.length);
    if (next && next !== '\\' && next !== '/') continue;
    if (!best || root.length > best.root.length) best = { name, root };
  }
  return best ? `%${best.name}%${text.slice(best.root.length).replace(/%/g, '%%')}` : text.replace(/%/g, '%%');
}

/** batchValue in double quotes (a path never contains `"`). */
const batchPath = (value, env = process.env) => `"${batchValue(value, env)}"`;

/**
 * The file's text (CRLF lines, a trailing CRLF). `lines` start with `@echo off`; the code page switch goes after their
 * `setlocal` (added when missing), so CODE_DESKTOP_CP/EXIT stay in the batch file.
 */
function batchFile(lines) {
  const text = lines.join('\r\n') + '\r\n';
  if (ASCII.test(text)) return text;
  const at = lines.findIndex((line) => /^setlocal\b/i.test(line));
  const head = at >= 0 ? lines.slice(0, at + 1) : [lines[0], 'setlocal'];
  const body = at >= 0 ? lines.slice(at + 1) : lines.slice(1);
  if (!head.every((line) => ASCII.test(line))) throw new Error('A batch file header must be ASCII.');
  return [
    ...head,
    // "Active code page: 936" / "Aktive Codepage: 850." — the number after the colon.
    'for /f "tokens=2 delims=:." %%c in (\'chcp\') do set "CODE_DESKTOP_CP=%%c"',
    'chcp 65001 >nul',
    ...body,
    'set "CODE_DESKTOP_EXIT=%ERRORLEVEL%"',
    'if defined CODE_DESKTOP_CP chcp %CODE_DESKTOP_CP% >nul',
    'exit /b %CODE_DESKTOP_EXIT%',
  ].join('\r\n') + '\r\n';
}

module.exports = { batchValue, batchPath, batchFile, PROFILE_VARIABLES };
