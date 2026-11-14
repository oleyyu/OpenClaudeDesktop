// IPC persistence is ordered in main. Replies may arrive after a later edit;
// the revision guards both successful replies and failure reconciliation reads.
export async function saveConfirmedPreferences({ revision, patch, call, apply }) {
  const mine = ++revision.current;
  let saved;
  try { saved = await call('settings', patch); }
  catch (error) {
    if (mine === revision.current) {
      try {
        const latest = await call('init');
        if (mine === revision.current && latest?.config) apply(latest.config);
      } catch { /* Keep the original save error if the read also fails. */ }
    }
    throw error;
  }
  if (mine === revision.current) apply(saved);
  return saved;
}
