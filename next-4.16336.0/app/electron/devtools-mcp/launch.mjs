// Starts chrome-devtools-mcp under the app's own binary (ELECTRON_RUN_AS_NODE) without a Dock icon.
//
// chrome-devtools-mcp's bin sets `process.title = 'chrome-devtools-mcp'`. On macOS, renaming a process whose binary
// sits in an .app bundle checks it in with LaunchServices as a Foreground app, so every running server showed up in the
// Dock as a generic "exec" tile. Here process.title only keeps the value; the process name is never changed.
//   argv: [binary, launch.mjs, <chrome-devtools-mcp.js>, ...its arguments]
import { pathToFileURL } from "node:url";

let title = process.title;
Object.defineProperty(process, "title", {
  configurable: true,
  enumerable: true,
  get: () => title,
  set: (value) => { title = String(value); },
});
process.argv.splice(1, 1);
await import(pathToFileURL(process.argv[1]).href);
