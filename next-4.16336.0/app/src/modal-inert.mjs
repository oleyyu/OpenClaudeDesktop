// Multiple modal portals may overlap while one is exiting. Restoring each
// portal's observed boolean independently can leave the app permanently inert.
const owners = new WeakMap();
export function holdModalInert(element) {
  if (!element) return () => {};
  let entry = owners.get(element);
  if (!entry) { entry = { count: 0, original: !!element.inert }; owners.set(element, entry); }
  entry.count++;
  element.inert = true;
  let active = true;
  return () => {
    if (!active) return;
    active = false;
    if (--entry.count === 0) { element.inert = entry.original; owners.delete(element); }
  };
}
