export const MATH_SOURCE_LIMIT = 20000;
export const hasMathSyntax = value => /[\\^{}=<>+*/()|!]/.test(value);
const ambiguous = value => /[$`]|\\\(|\\[|.+*?0-9]/.test(value)
  || /(^|\s)-{1,2}[A-Za-z]/.test(value) && !/\\[a-zA-Z]|\^/.test(value);

// Source guards disambiguate TeX delimiters from prose, regex and CLI syntax.
export function acceptsBackslashMath(value, prefix = '', display = false) {
  if (value.length > 1024) return false;
  const plain = value.replaceAll('\uE000', '');
  if (ambiguous(plain)) return false;
  if (display) return !prefix.trim() && hasMathSyntax(plain);
  let index = prefix.length - 1, count = 0;
  while (index >= 0 && /[*_~\uE000]/.test(prefix[index]) && count++ < 64) index--;
  if (index >= 0 && !' \t\r\n(['.includes(prefix[index])) return false;
  return plain.length <= 60 && /[\\^{}=<>|!+]/.test(plain);
}

export function mathFallback(value, display, open) {
  if (!display) return `$${value}${open ? '' : '$'}`;
  if (open) return value ? `$$\n${value}` : '$$';
  return value.includes('\n') ? `$$\n${value}\n$$` : `$$${value}$$`;
}

export function renderMath(katex, value, display, { open = false, fenced = false } = {}) {
  if (!katex || open || (!fenced && !hasMathSyntax(value)) || value.length > MATH_SOURCE_LIMIT) return null;
  try {
    // Only KaTeX's generated HTML enters the renderer; source never does.
    // Each formula owns its macros. Default trust=false disables HTML/URLs.
    return katex.renderToString(value, {
      displayMode: display, throwOnError: false, errorColor: 'inherit',
      strict: false, output: 'htmlAndMathml', trust: false, maxExpand: 1000,
    }).replace('<span class="katex">', display
      ? '<span class="katex can-focus" role="math" tabindex="0">'
      : '<span class="katex" role="math">');
  } catch { return null; }
}
