import { hunkWordRanges } from './word-diff-model.mjs';
self.onmessage = ({ data }) => {
  try { self.postMessage({ id: data.id, status: 'highlighted', ranges: hunkWordRanges(data.rows) }); }
  catch { self.postMessage({ id: data.id, status: 'plain', reason: 'diff-error' }); }
};
