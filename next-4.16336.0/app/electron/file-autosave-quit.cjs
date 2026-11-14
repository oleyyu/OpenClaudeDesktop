// Flush renderer-owned autosaves before the existing file/work quit guards run.
function createFileAutosaveQuitGate({ needsFlush, flush, quit, onError = () => {} }) {
  let waiting = false, retry = false;
  return { handle(event) {
    if (retry) { retry = false; return false; }
    if (!waiting && !needsFlush()) return false;
    event.preventDefault();
    if (!waiting) {
      waiting = true;
      Promise.resolve().then(flush).catch(onError).finally(() => { waiting = false; retry = true; quit(); });
    }
    return true;
  } };
}
module.exports = { createFileAutosaveQuitGate };
