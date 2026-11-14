// Writes are dispatched immediately in input order. Invalid drafts/IME only
// invalidate feedback, never forget a write which may still change persistence.
export function createImmediateTextSave({ validate, save, onState }) {
  let live = true, generation = 0, request = null;
  const publish = state => { if (live) onState(state); };
  const message = error => error?.message || String(error);
  return {
    submit(value, confirmed) {
      if (!live) return Promise.resolve(false);
      const id = ++generation;
      try { validate(value); }
      catch (error) {
        publish({ saving: false, error: message(error) });
        return Promise.resolve(false);
      }
      // Only the pristine controller can trust a no-op without its own history.
      // After any write, reverting to an old confirmed prop must send a write.
      if (!request && value === confirmed) {
        publish({ saving: false, error: '' }); return Promise.resolve(true);
      }
      if (!request || request.value !== value || request.failed || (!request.pending && value !== confirmed)) {
        const next = { value, pending: true, failed: false, error: '' };
        let response;
        try { response = save(value); } catch (error) { response = Promise.reject(error); }
        next.promise = Promise.resolve(response).then(
          () => { next.pending = false; return true; },
          error => { next.pending = false; next.failed = true; next.error = message(error); return false; },
        );
        request = next;
      }
      const observed = request;
      publish({ saving: observed.pending, error: '' });
      return observed.promise.then(ok => {
        if (live && id === generation) publish({ saving: false, error: observed.error });
        return ok;
      });
    },
    invalidate() { if (live) { generation++; publish({ saving: false, error: '' }); } },
    dispose() { live = false; generation++; },
  };
}
