// Claude 2.31226.0 c03935b01: ho/go/focusFilesTreeFilter. Peek is a
// pane-lifetime state, separate from the user's persistent tree preference.
export function fileTreeVisible({ hasFile, canFit, shown, peek, hiddenWhileEmpty, hasTabs }) {
  return hasFile ? canFit && (shown || peek) : !(hiddenWhileEmpty && !hasTabs);
}

export function peekOnFileOpen({ hasFile, canFit, shown, peek, hiddenWhileEmpty }) {
  return !hasFile && canFit && !hiddenWhileEmpty && !shown && !peek;
}
