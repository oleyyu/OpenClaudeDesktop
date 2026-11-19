// Simplified Chinese. One file per UI area (merged here) so areas can be
// translated independently; keys are the exact English source strings.
import surfaces from './surfaces.mjs';
import common from './common.mjs';
import app from './app.mjs';
import session from './session.mjs';
import sidebar from './sidebar.mjs';
import customize from './customize.mjs';
import settings from './settings.mjs';
import panes from './panes.mjs';
import models from './models.mjs';
import menus from './menus.mjs';
import windows from './windows.mjs';
import terminal from './terminal.mjs';
import preview from './preview.mjs';
import workflows from './workflows.mjs';
import agentTools from './agent-tools.mjs';
import computerUse from './computer-use.mjs';
import codeTranscript from './code-transcript.mjs'; // W14-code renderer-core: the Code transcript renderer's copy
import transcriptRest from './transcript-rest.mjs'; // W14-code transcript-rest: the Code transcript's remaining rows
import chatImport from './import.mjs'; // Import history (source-import-history.jsx, chat-import)
import dictation from './dictation.mjs'; // Composer dictation (source-composer-dictation.jsx)
import officialV4 from './official-v4.mjs'; // U-15: the official 4.16336.0 copy no area file carried (merged first)
import persona from './persona.mjs'; // U-14 / U-18: the assistant / app name sentences (electron/i18n/persona-copy.mjs), bundled pack copy

// common.mjs is merged last: its wording wins where areas disagree.
export default Object.freeze({ ...officialV4, ...persona, ...codeTranscript,...transcriptRest, ...app, ...session, ...sidebar, ...customize, ...settings, ...panes, ...models, ...menus, ...terminal, ...windows, ...preview, ...workflows, ...agentTools, ...computerUse, ...chatImport, ...dictation, ...surfaces, ...common });
