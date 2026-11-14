// Async clipboard completion may arrive after content replacement or unmount.
// In-flight OS writes cannot be canceled; this guards the visible feedback.
export function createClipboardFeedback({ writeText, onState, schedule = setTimeout, cancel = clearTimeout, timeout = 1200 }) {
  let active = true;
  let version = 0;
  let request = 0;
  let text = "";
  let timer = null;
  const clear = () => { if (timer !== null) { cancel(timer); timer = null; } };
  const publish = (state) => { if (active) onState(state); };
  return {
    setText(nextText) {
      version += 1;
      text = nextText;
      clear();
      publish("idle");
    },
    async copy() {
      if (!active) return false;
      const revision = version;
      const id = ++request;
      const payload = text;
      const current = () => active && revision === version && id === request;
      clear();
      publish("pending");
      try {
        await writeText(payload);
        if (!current()) return false;
        publish("copied");
        timer = schedule(() => {
          timer = null;
          if (current()) publish("idle");
        }, timeout);
        return true;
      } catch {
        if (current()) publish("error");
        return false;
      }
    },
    dispose() {
      active = false;
      version += 1;
      clear();
    },
  };
}
