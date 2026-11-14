// Partial unified patches contain coordinates but not the omitted text. Keep
// their gaps informational until a real historical-content loader exists.
const before = (start, count) => count === 0 ? start : start - 1;
const after = (start, count) => count === 0 ? start : start + count - 1;

export function diffSeparators(hunks) {
  let oldEnd = 0, newEnd = 0;
  return hunks.map((hunk, index) => {
    const oldGap = before(hunk.oldStart, hunk.oldCount) - oldEnd;
    const newGap = before(hunk.newStart, hunk.newCount) - newEnd;
    oldEnd = after(hunk.oldStart, hunk.oldCount);
    newEnd = after(hunk.newStart, hunk.newCount);
    if (oldGap === 0 && newGap === 0) return null;
    if (!Number.isSafeInteger(oldGap) || oldGap < 0 || oldGap !== newGap) {
      return { kind: 'metadata', text: hunk.header, first: index === 0 };
    }
    return { kind: 'line-info', count: oldGap, text: `${oldGap} unmodified line${oldGap === 1 ? '' : 's'}`, first: index === 0 };
  });
}
