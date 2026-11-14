// shared-frame xb/pb: single select, searchable by default above five items.
const fold = text => String(text ?? '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
export function selectOptions(items, query) {
  if (!query.trim()) return items;
  const needle = fold(query);
  return items.filter(item => fold(item.label).includes(needle) || fold(item.value).includes(needle));
}
export function selectHighlight(items, current, key) {
  const enabled = items.map((item, index) => item.disabled ? -1 : index).filter(index => index >= 0);
  if (!enabled.length) return -1;
  if (key === 'Home') return enabled[0];
  if (key === 'End') return enabled.at(-1);
  const at = enabled.indexOf(current);
  if (key === 'ArrowDown') return enabled[(at + 1) % enabled.length];
  if (key === 'ArrowUp') return enabled[(at < 0 ? enabled.length - 1 : at - 1 + enabled.length) % enabled.length];
  return current;
}
