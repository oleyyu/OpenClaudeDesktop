const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { matchPath, compareMatches, orderFolderQuery } = require('./file-name-matcher.cjs');

const FALLBACK_EXCLUDES = new Set(['.git', 'node_modules', '.DS_Store']);
const vanished = error => ['ENOENT', 'ENOTDIR', 'ELOOP'].includes(error.code);
const inside = (root, candidate) => candidate === root || candidate.startsWith(root + path.sep);
const failure = (code, message) => Object.assign(new Error(message), { code });

function gitEnvironment() {
  return {
    ...Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith('GIT_'))),
    GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: '/dev/null',
    GIT_OPTIONAL_LOCKS: '0', GIT_NO_REPLACE_OBJECTS: '1',
    GIT_LITERAL_PATHSPECS: '1', LC_ALL: 'C',
  };
}

function git(root, args, maxBytes) {
  return new Promise((resolve, reject) => {
    const child = spawn('git', ['--no-pager', '-c', 'core.fsmonitor=false',
      '-c', 'core.untrackedCache=false', '-c', 'core.hooksPath=/dev/null',
      ...args], { cwd: root, env: gitEnvironment(), stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
    const chunks = [];
    let bytes = 0, stderr = '', limited = false;
    child.stdout.on('data', chunk => {
      const remaining = maxBytes - bytes;
      if (remaining > 0) { chunks.push(chunk.subarray(0, remaining)); bytes += Math.min(chunk.length, remaining); }
      if (chunk.length > remaining) { limited = true; child.kill('SIGKILL'); }
    });
    child.stderr.on('data', chunk => {
      // Diagnostic text has its own small cap and is not returned verbatim.
      if (stderr.length < 2048) stderr += chunk.toString('utf8').slice(0, 2048 - stderr.length);
    });
    child.on('error', reject);
    child.on('close', code => resolve({ code, bytes: Buffer.concat(chunks), stderr, limited }));
  });
}

function cleanRelative(value, limits) {
  return !!value && !path.isAbsolute(value) && !value.includes('\0') &&
    Buffer.byteLength(value) <= limits.maxPathBytes &&
    !value.split('/').some(part => part === '' || part === '.' || part === '..' || part === '.git');
}

// B33: a folder row (directory = true) gets the same walk, ending at a real directory instead of a file.
function safeRegularFile(root, relative, identity, limits, directory = false) {
  if (!cleanRelative(relative, limits)) return false;
  const parts = relative.split('/');
  if (parts.length - 1 > limits.maxDepth) return false;
  let current = root;
  try {
    for (let i = 0; i < parts.length; i++) {
      current = path.join(current, parts[i]);
      const info = fs.lstatSync(current);
      if (info.isSymbolicLink() || info.dev !== identity.dev) return false;
      if (i < parts.length - 1 || directory ? !info.isDirectory() : !info.isFile()) return false;
    }
    return inside(root, fs.realpathSync(current));
  } catch (error) { if (vanished(error)) return false; throw error; }
}

async function enumerateGit(root, limits, output, add) {
  let probe;
  try { probe = await git(root, ['rev-parse', '--is-inside-work-tree'], 4096); }
  catch (error) {
    if (error.code === 'ENOENT') { output.warnings.push('git-unavailable-fs-fallback'); return false; }
    throw failure('GIT_FAILED', 'Cannot start Git filename enumeration.');
  }
  if (probe.code !== 0 || probe.bytes.toString('utf8').trim() !== 'true') {
    if (probe.code === 128 && /not a git repository/.test(probe.stderr)) return false;
    if (probe.code === 0 && probe.bytes.toString('utf8').trim() === 'false') return false;
    throw failure('GIT_FAILED', 'Git could not inspect this workspace.');
  }
  output.source = 'git';
  // ls-files reads paths and Git metadata, not candidate file contents. These
  // read-only commands do not invoke filters/hooks or contact a remote. The
  // literal '.' pathspec scopes a subdirectory cwd instead of widening to top.
  const result = await git(root, ['ls-files', '--cached', '--others', '--exclude-standard', '-z', '--', '.'], limits.maxGitBytes);
  if (result.limited) output.truncationReasons.push('git-output-limit');
  else if (result.code !== 0) throw failure('GIT_FAILED', 'Git could not enumerate workspace filenames.');
  const end = result.bytes.lastIndexOf(0);
  if (!result.limited && result.bytes.length && end !== result.bytes.length - 1)
    throw failure('GIT_PROTOCOL', 'Git returned an incomplete filename record.');
  let decoded;
  try { decoded = new TextDecoder('utf-8', { fatal: true }).decode(result.bytes.subarray(0, end + 1)); }
  catch { throw failure('PATH_ENCODING', 'A filename cannot be represented as UTF-8.'); }
  for (const relative of decoded.split('\0')) {
    if (!relative || relative.endsWith('/')) continue; // Nested repository or gitlink, not an openable file.
    if (!cleanRelative(relative, limits)) { output.truncationReasons.push('unsupported-path'); continue; }
    if (relative.split('/').length - 1 > limits.maxDepth) { output.truncationReasons.push('depth-limit'); continue; }
    if (!add(relative)) break;
  }
  return true;
}

function enumerateFilesystem(root, identity, limits, output, add) {
  output.source = 'filesystem';
  output.warnings.push('filesystem-policy-excludes-git-node_modules-ds_store');
  const queue = [{ relative: '', depth: 0 }];
  let cursor = 0, stop = false;
  while (cursor < queue.length && !stop) {
    if (output.scanned.directories >= limits.maxDirectories) {
      output.truncationReasons.push('directory-limit'); break;
    }
    const { relative, depth } = queue[cursor++];
    const directory = path.join(root, relative);
    let handle;
    try {
      const before = fs.lstatSync(directory);
      if (before.isSymbolicLink() || !before.isDirectory() || before.dev !== identity.dev) continue;
      if (fs.realpathSync(directory) !== directory || !inside(root, directory)) continue;
      handle = fs.opendirSync(directory, { bufferSize: 32, encoding: 'buffer' });
      // Detect ordinary concurrent replacements before consuming its entries.
      const after = fs.lstatSync(directory);
      if (after.isSymbolicLink() || before.ino !== after.ino || before.dev !== after.dev || fs.realpathSync(directory) !== directory)
        throw failure('WORKSPACE_CHANGED', 'A workspace directory changed while being enumerated.');
      output.scanned.directories++;
      let entry;
      while ((entry = handle.readSync()) !== null) {
        if (++output.scanned.entries > limits.maxEntries) {
          output.truncationReasons.push('entry-limit'); stop = true; break;
        }
        let name;
        try { name = new TextDecoder('utf-8', { fatal: true }).decode(entry.name); }
        catch { throw failure('PATH_ENCODING', 'A filename cannot be represented as UTF-8.'); }
        if (FALLBACK_EXCLUDES.has(name) || entry.isSymbolicLink()) continue;
        const child = relative ? `${relative}/${name}` : name;
        if (!cleanRelative(child, limits)) { output.truncationReasons.push('unsupported-path'); continue; }
        if (entry.isDirectory()) {
          if (depth >= limits.maxDepth) output.truncationReasons.push('depth-limit');
          else if (queue.length >= limits.maxDirectories) output.truncationReasons.push('directory-limit');
          else queue.push({ relative: child, depth: depth + 1 });
        } else if (entry.isFile() && !add(child)) { stop = true; break; }
      }
    } catch (error) {
      if (!vanished(error)) throw error;
      output.warnings.push('entry-vanished-during-enumeration');
      output.truncationReasons.push('workspace-changed');
    } finally { handle?.closeSync(); }
  }
}

// An empty browse query (the composer's bare '@', like the official provider's empty fetchOptions): every file, the
// shallowest and shortest paths first, with nothing highlighted.
function browseRank(relative) {
  return { rankScore: -(relative.split('/').length * 4096 + relative.length), positions: [] };
}

async function run(request, limits) {
  const output = {
    requestId: request.requestId, scope: request.scope, requestedRoot: request.root,
    root: null, query: request.query, source: null, matches: [], truncated: false,
    complete: false, truncationReasons: [], warnings: [], error: null,
    scanned: { candidates: 0, entries: 0, directories: 0 },
  };
  try {
    const root = fs.realpathSync(request.root), identity = fs.lstatSync(root);
    output.root = root;
    if (!identity.isDirectory()) throw failure('INVALID_ROOT', 'The workspace root is not a directory.');
    if (root === path.parse(root).root) throw failure('ROOT_TOO_BROAD', 'Choose a project directory, not the filesystem root.');
    if (request.mode!=='content'&&request.query.startsWith('?')) throw failure('CONTENT_SEARCH_UNSUPPORTED', 'This API searches filenames only.');
    if (!request.query && !request.browse) { output.complete = true; return output; }
    const candidates = new Set();
    let indexBytes = 0;
    function add(relative) {
      if (candidates.has(relative)) return true;
      if (candidates.size >= limits.maxCandidates) { output.truncationReasons.push('candidate-limit'); return false; }
      indexBytes += Buffer.byteLength(relative);
      if (indexBytes > limits.maxIndexBytes) { output.truncationReasons.push('index-byte-limit'); return false; }
      candidates.add(relative);
      return true;
    }
    if (!(await enumerateGit(root, limits, output, add))) enumerateFilesystem(root, identity, limits, output, add);
    output.scanned.candidates = candidates.size;
    if(request.mode==='content'){
      await require('./file-content-search.cjs').searchContents({root,identity,candidates,request,limits,output,safeRegularFile});
    }else{
    const ranked = [];
    for (const relative of candidates) {
      const matched = request.query ? matchPath(relative, request.query) : browseRank(relative);
      if (matched) ranked.push({ path: relative, name: path.basename(relative), directory: false, ...matched });
    }
    // B33 (cccc2cf0a Re queryFn :4384-4395): a Files pane filter ending in '/' also lists folders (the folders that
    // hold the enumerated files), ordered by Fv; any other filter lists files only.
    const folders = request.folders === true && request.query.endsWith('/');
    if (folders) {
      const directories = new Set();
      for (const relative of candidates) {
        for (let at = relative.lastIndexOf('/'); at > 0; at = relative.lastIndexOf('/', at - 1)) {
          const directory = relative.slice(0, at);
          if (directories.has(directory)) break;
          directories.add(directory);
        }
      }
      for (const relative of directories) {
        const matched = matchPath(relative, request.query);
        if (matched) ranked.push({ path: relative, name: path.basename(relative), directory: true, ...matched });
      }
    }
    ranked.sort(compareMatches);
    let responseBytes = Buffer.byteLength(JSON.stringify({ ...output, warnings: [...new Set(output.warnings)], truncationReasons: [...new Set(output.truncationReasons)] })) + 2048;
    for (const match of folders ? orderFolderQuery(ranked, request.query) : ranked) {
      if (!safeRegularFile(root, match.path, identity, limits, match.directory)) continue;
      if (output.matches.length >= limits.maxResults) { output.truncationReasons.push('result-limit'); break; }
      responseBytes += Buffer.byteLength(JSON.stringify(match));
      if (responseBytes > limits.maxResultBytes) { output.truncationReasons.push('result-output-limit'); break; }
      output.matches.push(match);
    }
    }
    const finalRoot = fs.lstatSync(root);
    if (finalRoot.isSymbolicLink() || finalRoot.ino !== identity.ino || finalRoot.dev !== identity.dev || fs.realpathSync(request.root) !== root)
      throw failure('WORKSPACE_CHANGED', 'The workspace root changed during filename search.');
    output.truncationReasons = [...new Set(output.truncationReasons)];
    output.warnings = [...new Set(output.warnings)];
    output.truncated = output.truncationReasons.length > 0;
    output.complete = !output.truncated;
  } catch (error) {
    output.matches = [];
    output.complete = false;
    const known = ['INVALID_ROOT', 'ROOT_TOO_BROAD', 'CONTENT_SEARCH_UNSUPPORTED', 'INVALID_PATTERN', 'GIT_FAILED', 'GIT_PROTOCOL', 'PATH_ENCODING', 'WORKSPACE_CHANGED'];
    output.error = {
      code: known.includes(error.code) ? error.code : error.code === 'ENOENT' ? 'ROOT_NOT_FOUND' : 'FILESYSTEM_ERROR',
      message: known.includes(error.code) ? error.message : error.code === 'ENOENT' ? 'The workspace root no longer exists.' : 'Cannot read the workspace filename index.',
    };
  }
  output.truncationReasons = [...new Set(output.truncationReasons)];
  output.warnings = [...new Set(output.warnings)];
  output.truncated = output.truncationReasons.length > 0;
  return output;
}

process.once('message', async ({ request, limits }) => {
  const result = await run(request, limits);
  if (process.connected) process.send(result, () => process.exit(0));
  else process.exit(0);
});
