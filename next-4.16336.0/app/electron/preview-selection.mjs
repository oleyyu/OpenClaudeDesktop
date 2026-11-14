// Source Gci generation gate, adapted to a tab-owned native CDP transport.
// Serialize inspect/capture teardown so an old cancellation cannot turn off a
// newer picker, and discard captures after navigation, tab switch or disposal.
export function createPreviewSelection({ inspector, isCurrent, onState, onSelected, onError = () => {} }) {
  let generation = 0, enabled = false, busy = false, disposed = false, serial = Promise.resolve();
  const publish = () => onState({ enabled, busy });
  const current = token => !disposed && token === generation && enabled && isCurrent();
  const enqueue = operation => {
    const result = serial.then(operation);
    serial = result.catch(onError);
    return result;
  };
  const arm = token => inspector.enableInspectMode(nodeId => {
    if (!current(token) || busy) return;
    busy = true;publish();
    void enqueue(async () => {
      try {
        if (!current(token)) return;
        await inspector.disableInspectMode();
        const context = await inspector.captureElementContext(nodeId);
        if (!current(token)) return;
        if (context) {
          enabled = false;busy = false;publish();
          await onSelected(context);
        } else await arm(token);
      } finally {
        if (token === generation) { busy = false;publish(); }
      }
    }).catch(() => {});
  });
  return {
    setEnabled(next) {
      const token = ++generation;
      enabled = !disposed && next === true;busy = false;publish();
      inspector.inspectModeCallback = null;
      return enqueue(async () => {
        if (token !== generation || disposed) return false;
        if (enabled && isCurrent()) {
          try { await arm(token);return true; }
          catch (error) { if (token === generation) { enabled = false;publish(); } throw error; }
        }
        enabled = false;publish();await inspector.disableInspectMode();return true;
      });
    },
    dispose() {
      if (disposed) return serial;
      disposed = true;generation++;enabled = false;busy = false;inspector.inspectModeCallback = null;publish();
      return enqueue(() => inspector.disableInspectMode());
    },
    whenIdle: () => serial,
  };
}
