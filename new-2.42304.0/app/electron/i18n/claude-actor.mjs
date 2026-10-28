// Copy carried over from Claude Desktop where "Claude" is the assistant doing the work ("Claude is working…",
// "Tell Claude what to change"): the source strings stay as shipped (the generated chunks and the fidelity tests
// hold them), and t() shows them with "DeepSeek" instead, which then follows the running core's assistant like the
// rest of the copy. One line is about the app itself and names it. Mentions of Claude the model or Claude Code
// (core taglines, workflow parity notes) are not listed and keep their wording.
export const CLAUDE_ACTOR = Object.freeze({
  "Claude thinks longer with Max effort and uses your limits faster than High.": "DeepSeek thinks longer with Max effort and uses your limits faster than High.",
  "Starts as Claude proposed": "Starts as DeepSeek proposed",
  "This task starts with the options Claude proposed. You can’t change them in this version of the desktop app.": "This task starts with the options DeepSeek proposed. You can’t change them in this version of the desktop app.",
  "Claude pauses so you can approve each action.": "DeepSeek pauses so you can approve each action.",
  "Claude handles permission decisions": "DeepSeek handles permission decisions",
  "Claude runs on its own and pauses to ask if anything looks unsafe.": "DeepSeek runs on its own and pauses to ask if anything looks unsafe.",
  "Claude never pauses, even for unsafe actions.": "DeepSeek never pauses, even for unsafe actions.",
  "Claude asks before using new tools or opening new sites.": "DeepSeek asks before using new tools or opening new sites.",
  "Unhide apps when Claude finishes": "Unhide apps when DeepSeek finishes",
  "When Claude has full control of your screen, apps hidden during a task are restored when Claude stops.": "When DeepSeek has full control of your screen, apps hidden during a task are restored when DeepSeek stops.",
  "How Claude uses the apps you allow": "How DeepSeek uses the apps you allow",
  "Background: Claude works inside the apps you allow while you keep using your computer, and asks your permission before taking full control of your screen. Full control: Claude takes control of your screen, mouse, and keyboard by default whenever Claude uses an app you allow, without asking again.": "Background: DeepSeek works inside the apps you allow while you keep using your computer, and asks your permission before taking full control of your screen. Full control: DeepSeek takes control of your screen, mouse, and keyboard by default whenever DeepSeek uses an app you allow, without asking again.",
  "Claude makes its changes in a separate copy of this repository, so your folder stays as it is.": "DeepSeek makes its changes in a separate copy of this repository, so your folder stays as it is.",
  "Claude is blocked in {count, plural, one {# session} other {# sessions}}": "DeepSeek is blocked in {count, plural, one {# session} other {# sessions}}",
  "Claude is blocked in {count, plural, one {# more session} other {# more sessions}}": "DeepSeek is blocked in {count, plural, one {# more session} other {# more sessions}}",
  "Claude is working — wait for the turn to finish": "DeepSeek is working — wait for the turn to finish",
  "You’re leaving Claude to visit an external link:": "You’re leaving OpenClaude Desktop to visit an external link:",
  "Tell Claude what to change": "Tell DeepSeek what to change",
  "It can’t be created from here. Ask Claude to create it.": "It can’t be created from here. Ask DeepSeek to create it.",
  "Couldn’t create {name}. You can select Create file again or ask Claude to create it.": "Couldn’t create {name}. You can select Create file again or ask DeepSeek to create it.",
  "Add {folder} to open this file. Claude can then use that folder in this session.": "Add {folder} to open this file. DeepSeek can then use that folder in this session.",
  "This file is outside this session’s folders. You can ask Claude to copy it into one of them, then download the copy.": "This file is outside this session’s folders. You can ask DeepSeek to copy it into one of them, then download the copy.",
  "Opens beside the chat. Claude can see and act on the page.": "Opens beside the chat. DeepSeek can see and act on the page.",
  "{n, plural, one {# more selected element was sent to Claude, not shown here} other {# more selected elements were sent to Claude, not shown here}}": "{n, plural, one {# more selected element was sent to DeepSeek, not shown here} other {# more selected elements were sent to DeepSeek, not shown here}}",
  "Sends Claude a screenshot plus the element’s HTML, styles, selector and any React component details.": "Sends DeepSeek a screenshot plus the element’s HTML, styles, selector and any React component details.",
  "Scroll through what Claude sent to allow it.": "Scroll through what DeepSeek sent to allow it.",
});
