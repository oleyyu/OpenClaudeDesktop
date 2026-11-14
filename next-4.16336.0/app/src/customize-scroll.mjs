// Each mounted settings page owns its memory. Store only observed positions;
// cleanup must not overwrite them after new content has clamped scrollTop.
export function bindCustomizeScroll(element, memory, key) {
  let active = true;
  const saved = memory.get(key);
  element.scrollTop = Number.isFinite(saved) && saved >= 0 ? saved : 0;
  const record = () => {
    if (active && Number.isFinite(element.scrollTop) && element.scrollTop >= 0) memory.set(key, element.scrollTop);
  };
  element.addEventListener('scroll', record, { passive: true });
  return () => { active = false; element.removeEventListener('scroll', record); };
}
