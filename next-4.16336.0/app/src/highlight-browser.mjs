import { createHighlightService } from "./highlight-service.mjs";
import { createStreamHighlightClient } from "./highlight-stream-client.mjs";
let shared = null, sharedStream = null;
export function getHighlightService() {
  if (!shared) shared = createHighlightService({
    createWorker: () => new Worker(new URL("./highlight-worker.mjs", import.meta.url), { type: "module", name: "code-fence-highlight" }),
  });
  return shared;
}
// The stream worker is a second long-lived instance: the settled service
// terminates its worker on a 1.5s deadline, which cannot host a growing fence.
export function getStreamHighlightClient() {
  if (!sharedStream) sharedStream = createStreamHighlightClient({
    createWorker: () => new Worker(new URL("./highlight-stream-worker.mjs", import.meta.url), { type: "module", name: "code-fence-stream-highlight" }),
  });
  return sharedStream;
}
export function disposeHighlightService() { shared?.dispose(); shared = null; sharedStream?.dispose(); sharedStream = null; }
// BrowserWindow destruction automatically destroys its workers. pagehide also
// handles renderer navigation. Explicit disposal is available to app teardown.
if (typeof window !== "undefined") window.addEventListener("pagehide", disposeHighlightService);
