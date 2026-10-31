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

// common.mjs is merged last: its wording wins where areas disagree.
export default Object.freeze({ ...app, ...session, ...sidebar, ...customize, ...settings, ...panes, ...models, ...menus, ...terminal, ...windows, ...preview, ...workflows, ...agentTools, ...computerUse, ...surfaces, ...common });
