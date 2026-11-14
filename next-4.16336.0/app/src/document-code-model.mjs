// Generic document Markdown has a distinct contract from Code transcript fences.
// Only renderer citation markers containing one or more UUIDs are stripped.
const uuid = '[0-9a-fA-F]{8}(?:-[0-9a-fA-F]{4}){3}-[0-9a-fA-F]{12}';
const citation = new RegExp(`:antCitation\\[\\]\\{citations="${uuid}(?:,${uuid})*"\\}`, 'g');
export const DOCUMENT_CODE_THEMES = Object.freeze({ light: 'claude-light', dark: 'claude-dark' });

export function documentCode(text, className = '') {
  const label = /language-(\w+)/.exec(className)?.[1] ?? '';
  return { text: text.trimEnd().replace(citation, ''), label, language: label.toLowerCase(), wrap: !label };
}
