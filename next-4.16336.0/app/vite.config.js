import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { relative, resolve } from "node:path";
import fs from 'node:fs/promises';
import { createHash } from "node:crypto";
import { gzipSync } from "node:zlib";
import { CODE_THEMES } from "./electron/code-theme-catalog.mjs";
import { BUNDLED_LANGUAGES } from "./src/highlight-languages.mjs";

// Record the actual production worker graph rather than inferring shipped
// grammars from source imports. Keep evidence deterministic across packaging.
const highlightWorkers = new Map();
// Every bundled grammar of the original table (c5a058668, 235 ids) ships as a
// lazy chunk; embedded grammars they import (e.g. html -> javascript, css) may
// add modules but never replace one of these.
const EXPECTED_GRAMMARS = BUNDLED_LANGUAGES.map(([id]) => `${id}.mjs`);
const isGrammarModule = id => /@shikijs\/langs\/dist\//.test(id);
// The 24 third-party catalog ids (electron/code-theme-catalog.mjs minus the two built-in Claude themes).
const CATALOG_THEMES = CODE_THEMES.map(entry => entry.value).filter(value => !value.startsWith("claude-"));
const recordHighlightWorker = () => ({
  name: "record-highlight-worker",
  generateBundle(_options, bundle) {
    const chunks = Object.values(bundle).filter(output => output.type === "chunk");
    const modules = [...new Set(chunks.flatMap(output => Object.keys(output.modules)
      .map(id => relative(import.meta.dirname, id))))].sort();
    const grammars = modules.filter(id => /@shikijs\/langs\/dist\//.test(id));
    const names = grammars.map(id => id.split("/").at(-1));
    const entry = chunks.find(output => output.isEntry);
    const entryName = entry ? relative(import.meta.dirname, entry.facadeModuleId ?? entry.fileName) : null;
    if (entryName === 'src/word-diff-worker.mjs') {
      if (JSON.stringify(modules) !== JSON.stringify(['src/word-diff-model.mjs', 'src/word-diff-worker.mjs']))
        throw new Error(`Unexpected word diff worker dependency graph: ${modules.join(', ')}`);
      const files = chunks.map(output => ({ file: output.fileName, bytes: Buffer.byteLength(output.code), sha256: createHash('sha256').update(output.code).digest('hex') }));
      if (files.reduce((sum, file) => sum + file.bytes, 0) >= 64_000) throw new Error('Word diff worker exceeded its reviewed bundle budget');
      highlightWorkers.set(entryName, { entry: entryName, entryFile: entry.fileName, modules, files });
      return;
    }
    // Both the settled worker and the stream worker share highlight-engine.mjs:
    // every bundled grammar as its own lazy chunk, JavaScript regex engine, no
    // WASM or theme directory.
    if (!["src/highlight-worker.mjs", "src/highlight-stream-worker.mjs"].includes(entryName)) return;
    const missing = EXPECTED_GRAMMARS.filter(name => !names.includes(name));
    if (missing.length) throw new Error(`Inspect the production syntax grammar graph of ${entryName}: missing ${missing.join(", ")}`);
    // Grammars load on demand (code-language-current.js:62-81): none may sit in
    // the worker entry chunk, and no chunk may bundle grammars with the engine.
    if (Object.keys(entry.modules).some(isGrammarModule)) throw new Error(`${entryName} entry chunk must not contain grammar modules`);
    const grammarChunks = chunks.filter(output => Object.keys(output.modules).some(isGrammarModule));
    if (grammarChunks.some(output => output.isEntry || !Object.keys(output.modules).every(isGrammarModule)))
      throw new Error(`${entryName} grammar chunks must contain grammar modules only`);
    // Themes: the settled worker may lazily import exactly the catalog's
    // @shikijs/themes modules (one file per theme, no barrel/index); the stream
    // worker keeps the two built-in stream palettes and imports no theme files.
    const themeModules = modules.filter(id => /\/themes\//.test(id));
    const allowedThemes = entryName === "src/highlight-worker.mjs" ? CATALOG_THEMES.map(name => `${name}.mjs`) : [];
    if (modules.some(id => /engine-oniguruma|oniguruma\//.test(id)) || Object.keys(bundle).some(name => name.endsWith(".wasm")))
      throw new Error(`Unexpected WASM dependency in ${entryName}`);
    if (themeModules.some(id => !/node_modules\/@shikijs\/themes\/dist\/[a-z0-9-]+\.mjs$/.test(id) || !allowedThemes.includes(id.split("/").at(-1))))
      throw new Error(`Unexpected theme dependency in ${entryName}: ${themeModules.join(", ")}`);
    if (entryName === "src/highlight-worker.mjs" && themeModules.length !== allowedThemes.length)
      throw new Error(`Settled worker theme graph must contain exactly the catalog's ${allowedThemes.length} lazy theme modules`);
    if (!modules.includes("src/highlight-engine.mjs")) throw new Error(`${entryName} must use the shared highlight engine module`);
    const describe = output => ({ file: output.fileName, bytes: Buffer.byteLength(output.code),
      gzipBytes: gzipSync(output.code).length, sha256: createHash("sha256").update(output.code).digest("hex") });
    const files = chunks.filter(output => !grammarChunks.includes(output)).map(describe);
    const grammarFiles = grammarChunks.map(describe);
    // The reviewed budget covers the engine (entry, shared and theme chunks);
    // each lazy grammar chunk has its own ceiling (the largest, emacs-lisp, is ~0.8 MB).
    const rawBytes = files.reduce((sum, file) => sum + file.bytes, 0);
    const gzipBytes = files.reduce((sum, file) => sum + file.gzipBytes, 0);
    if (rawBytes >= 1_200_000 || gzipBytes >= 250_000) throw new Error(`Syntax worker ${entryName} exceeded the reviewed bundle budget`);
    if (grammarFiles.some(file => file.bytes >= 1_000_000)) throw new Error(`A grammar chunk of ${entryName} exceeded 1 MB`);
    highlightWorkers.set(entryName, { entry: entryName, entryFile: entry.fileName, grammars, themes: themeModules.map(id => id.split("/").at(-1).replace(/\.mjs$/, "")), modules, files, grammarFiles, rawBytes, gzipBytes,
      grammarBytes: grammarFiles.reduce((sum, file) => sum + file.bytes, 0), largestGrammarChunk: Math.max(...grammarFiles.map(file => file.bytes)) });
  },
});
function highlightEvidence() {
  const settled = highlightWorkers.get("src/highlight-worker.mjs");
  const stream = highlightWorkers.get("src/highlight-stream-worker.mjs");
  if (!settled || !stream) throw new Error("Both syntax worker production graphs must be observed");
  // Chunks with identical content share one output file; count each file once.
  const unique = list => [...new Map(list.map(file => [file.file, file])).values()];
  const files = unique([settled, stream].flatMap(worker => worker.files));
  const grammarFiles = unique([settled, stream].flatMap(worker => worker.grammarFiles));
  const rawBytes = files.reduce((sum, file) => sum + file.bytes, 0);
  const gzipBytes = files.reduce((sum, file) => sum + file.gzipBytes, 0);
  if (rawBytes >= 2_400_000 || gzipBytes >= 500_000) throw new Error("Combined syntax workers exceeded the reviewed bundle budget");
  return { engine: "shiki-javascript", shiki: "4.4.3", languages: BUNDLED_LANGUAGES.map(([id]) => id), grammars: settled.grammars, themes: settled.themes, modules: settled.modules,
    files: [...files, ...grammarFiles], engineFiles: files.map(file => file.file), rawBytes, gzipBytes,
    grammarBytes: grammarFiles.reduce((sum, file) => sum + file.bytes, 0), largestGrammarChunk: Math.max(...grammarFiles.map(file => file.bytes)),
    workers: { settled, stream }, sharedFiles: settled.files.filter(file => stream.files.some(other => other.file === file.file)).map(file => file.file),
    // A grammar that imports an embedded grammar also imports the bundler's
    // module-init helper from its worker entry, so that chunk differs per worker.
    sharedGrammarFiles: settled.grammarFiles.filter(file => stream.grammarFiles.some(other => other.file === file.file)).length };
}
export default defineConfig({
  base: "./",
  plugins: [react(), {
    name: 'emit-response-math-evidence',
    async writeBundle(options, bundle) {
      const chunks = Object.values(bundle).filter(output => output.type === 'chunk' && Object.keys(output.modules).some(id => id.endsWith('/node_modules/katex/dist/katex.mjs')));
      if (chunks.length !== 1 || !chunks[0].isDynamicEntry) throw Error('KaTeX must remain a single on-demand renderer chunk: '+JSON.stringify(chunks.map(c=>({file:c.fileName,dynamic:c.isDynamicEntry,modules:Object.keys(c.modules)}))));
      const assets = Object.values(bundle).filter(output => output.type === 'asset' && /(?:KaTeX_.*\.(?:woff2?|ttf)|katex.*\.css)$/.test(output.fileName));
      if (!assets.some(output => output.fileName.endsWith('.css')) || !assets.some(output => output.fileName.endsWith('.woff2'))) throw Error('KaTeX CSS and local fonts must ship');
      // Vite rewrites CSS URLs after generateBundle. Hash the actual shipped
      // bytes, once those final transformations and disk writes are complete.
      const files = await Promise.all([...chunks, ...assets].map(async output => {
        const bytes = await fs.readFile(resolve(options.dir, output.fileName));
        return { file: output.fileName, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') };
      }));
      await fs.writeFile(resolve(options.dir,'response-math-build.json'),JSON.stringify({katex:'0.16.47',entry:chunks[0].fileName,files},null,2)+'\n');
    },
  }, {
    name: "emit-highlight-evidence",
    generateBundle() {
      this.emitFile({ type: "asset", fileName: "highlight-build.json", source: JSON.stringify(highlightEvidence(), null, 2) + "\n" });
      const wordDiff = highlightWorkers.get('src/word-diff-worker.mjs');
      if (!wordDiff) throw new Error('Word diff production worker graph must be observed');
      this.emitFile({ type: 'asset', fileName: 'word-diff-build.json', source: JSON.stringify(wordDiff, null, 2) + '\n' });
    },
  }],
  worker: { format: "es", plugins: () => [recordHighlightWorker()] },
  build: { outDir: "dist" },
  server: { port: 4319, strictPort: true },
});
