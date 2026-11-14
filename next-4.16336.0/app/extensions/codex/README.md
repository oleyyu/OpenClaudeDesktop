# Codex extension pack

OpenAI's Codex as an OpenClaude Desktop core. OpenClaude Desktop's only built-in core is DeepSeek Harness; Codex is added from
this pack (Settings › Cores › Extension packs › Codex › Add), which the app ships in `extensions/codex`.

Codex is a native core: its own `codex app-server --stdio` speaks the protocol, so the pack has no bridge. Choosing
it downloads the pinned Codex release named in `manifest.json` (checked against its sha256), or uses a Codex already
installed at one of `agent.systemPaths`.

`manifest.json` is also the app's description of the Codex app-server protocol itself (`electron/cores/codex.mjs`):
a server that reports no engine is read as Codex, installed or not.
