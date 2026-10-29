'use strict';
// R4g-mcp MA-1: host adapter for the original 3.6556.2 built-in visualize MCP server
// (electron/generated/visualize/imagine-server.cjs, extracted by scripts/extract-visualize.mjs from asar
// index.chunk-CbnfBP-3.js; 2.42304.0 was index.chunk-BaLvO2wi.js, migrated by w1-routines-a, RC-20). The generated
// module's bindImagineServer(e, t) stands in for the chunk's two module-level imports, and this file supplies them:
//   e = { ert }  index.chunk-jPKPzV-P.js's main-process logger (2.42304.0: e.p5 of index.chunk-muI2IV6k.js); only
//                e.ert.info is called (once, when k refuses).
//   t = { n, t } index.chunk-lgtvJrTy.js (2.42304.0 index.chunk-D89SZXs4.js, same logic):
//                n() = c(): Cowork HIPAA gate || (GrowthBook 2742800629 && inline_visualizations latched off).
//                    The host has no Cowork HIPAA compliance state and no org policy or GrowthBook (D17, D29/D31), so
//                    n() is always false: tool calls, resource reads and listings are never refused.
//                t() = l(): GrowthBook 3444158716 && !c(). D35 (user ruling 2026-10-17) migrates the visualize tool on
//                    its enabled branch; the host decides it with `enabled` (default on). MA-2 ties it to the agent-tools
//                    "visualize" group setting.
// No other official behaviour is replaced; tool definitions, read_me text, the widget template and its CSP / permissions
// come from the generated module unchanged. The 3.6556.2 widget's ui-cards loader (RC-19) runs only when the host
// context carries `_drawCards: true` (data-draw-cards); the host never sends it and serves no
// /libs/imagine/ui-cards-2/ui-cards.mjs, so cards stay undrawn as in 2.42304.0.
const generated = require('./generated/visualize/imagine-server.cjs');

// Host values of the two gates the official server reads (documented for tests and the migration notes).
const HOST_GATES = Object.freeze({
  // main index.chunk-lgtvJrTy.js n="3444158716" (visualize server isEnabled): on by product decision D35.
  visualize: { gate: '3444158716', host: true, basis: 'D35' },
  // main index.chunk-lgtvJrTy.js r="2742800629" + latch, and the Cowork HIPAA gate: no org policy on the host.
  inlineVisualizationsPolicy: { gate: '2742800629', host: false, basis: 'D17' },
});

const silentLogger = Object.freeze({ info() {}, warn() {}, error() {} });

function createVisualizeServer({ enabled = () => true, log = silentLogger } = {}) {
  if (typeof enabled !== 'function') throw TypeError('createVisualizeServer: enabled must be a function');
  const logger = log && typeof log.info === 'function' ? log : silentLogger;
  const e = { ert: logger };
  const t = {
    // c(): withheld by org policy / HIPAA. Never on the host.
    n: () => false,
    // l(): GrowthBook 3444158716 && !c().
    t: () => Boolean(enabled()),
  };
  return generated.bindImagineServer(e, t);
}

module.exports = {
  HOST_GATES,
  createVisualizeServer,
  IMAGINE_SERVER_NAME: generated.IMAGINE_SERVER_NAME,
  WIDGET_RESOURCE_URI: generated.WIDGET_RESOURCE_URI,
  IMAGINE_TOOLS: generated.IMAGINE_TOOLS,
  IMAGINE_RESOURCES: generated.IMAGINE_RESOURCES,
  ResourceUnavailable: generated.ResourceUnavailable,
  handleImagineToolCall: generated.handleImagineToolCall,
  readImagineResource: generated.readImagineResource,
  listImagineResources: generated.listImagineResources,
  widgetHtml: generated.widgetHtml,
};
