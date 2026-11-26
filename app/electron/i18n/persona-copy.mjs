// U-14 (E83, assistant / app name): official copy that the host shows verbatim, whose "Claude" is either the running
// assistant or this app. t() reads each whole English sentence below as its replacement before any lookup, so every
// path that formats it (host t() calls, the official slices' react-intl over createStartIntl / createHostIntl) shows
// the same words in every locale:
//   - the assistant acting ("Claude wants to use …") is written "DeepSeek …", which named() swaps for the running
//     core's assistant (Codex, Kimi, …); the zh-CN catalog keys the DeepSeek sentence;
//   - this app ("Show Claude in the menu bar.") is written "OpenClaude Desktop", as the host's own copy names it.
// Whole sentences only (exact match), never a word replacement: product names (Claude Code) and every other "Claude"
// keep the official text. The mode switch's "Claude" (D11) is a mode name and is not listed.
export const PERSONA_COPY = Object.freeze({
  // the assistant (named() swaps DeepSeek for the running core's assistant)
  'Reply to Claude…': 'Reply to DeepSeek…', // chat composer placeholder (shared-8 XI replyToClaude)
  'Claude is AI and can make mistakes.': 'DeepSeek is AI and can make mistakes.', // chat-messages-v4 disclaimer GjG77Kioid
  'Claude is AI and can make mistakes. Please double-check cited sources.': 'DeepSeek is AI and can make mistakes. Please double-check cited sources.', // FGmLea0H7Z
  'Claude is AI and can make mistakes. Please double-check responses. {giveFeedback}': 'DeepSeek is AI and can make mistakes. Please double-check responses. {giveFeedback}', // JyEEg0ExZX
  'Claude is AI and can make mistakes. Please double-check responses.': 'DeepSeek is AI and can make mistakes. Please double-check responses.',
  'Claude wants to use {toolName}': 'DeepSeek wants to use {toolName}', // cowork-approval-v4 ZNLjFNb5bD
  'Claude wants to use {toolName} from {integrationName}': 'DeepSeek wants to use {toolName} from {integrationName}', // wPBSjwhfE4
  'Auto-open files Claude writes': 'Auto-open files DeepSeek writes', // Preview settings menu, Settings › Code
  'HTML, images, PDFs, and videos Claude writes open in the Preview pane.': 'HTML, images, PDFs, and videos DeepSeek writes open in the Preview pane.',
  'Tell Claude what to change': 'Tell DeepSeek what to change', // pierre-changes K15bjS+2Xf
  'Claude keeps its existing memory but won’t use memory or make new memories.': 'DeepSeek keeps its existing memory but won’t use memory or make new memories.', // Your Claude › Turn off memory
  'Claude couldn’t process that message': 'DeepSeek couldn’t process that message', // code-transcript L1 turn-error headline (source-turn-error.jsx)
  'Add instructions for Claude to follow in all Cowork sessions...': 'Add instructions for DeepSeek to follow in all Cowork sessions...', // cowork-settings-v4 rEz5yyruud
  'Claude is waiting in {count, plural, one {# session} other {# sessions}}': 'DeepSeek is waiting in {count, plural, one {# session} other {# sessions}}', // code-start-v4 umMTo8rxHY
  'Claude is waiting in {count, plural, one {# more session} other {# more sessions}}': 'DeepSeek is waiting in {count, plural, one {# more session} other {# more sessions}}', // S2KZFZjbFN
  'Write your prompt to Claude': 'Write your prompt to DeepSeek', // Chat / Cowork editor aria-label, shared-9 BD uxkiTeN6WU (chat-home-r3-05)
  'Ask on the side without touching the main chat. Claude sees the full context, and nothing here is added to it.': 'Ask on the side without touching the main chat. DeepSeek sees the full context, and nothing here is added to it.', // chat side chat
  // this app
  'Show Claude in the menu bar.': 'Show OpenClaude Desktop in the menu bar.', // settings-desktop-v4 eMLhMHxe7n
  'Show Claude in the system tray.': 'Show OpenClaude Desktop in the system tray.', // ilfk95/I4Z
  'Space Claude uses on this computer.': 'Space OpenClaude Desktop uses on this computer.', // Storage dialog
  'See how much space Claude uses on this computer.': 'See how much space OpenClaude Desktop uses on this computer.', // Desktop app › Storage row
});
