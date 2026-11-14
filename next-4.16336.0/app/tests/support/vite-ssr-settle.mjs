// Close a test's Vite SSR server only once the module runner has nothing in flight.
//
// `server.ssrLoadModule(url)` resolves when `url` and its static imports have evaluated, but a module in that graph may
// start a dynamic `import()` while it evaluates (e.g. a deferred load that breaks an import cycle). That import keeps
// calling the runner's `fetchModule` after the test's own work is done; if `after()` closes the server first, the call
// rejects with "transport was disconnected, cannot call \"fetchModule\"" and node:test fails the whole file
// ("generated asynchronous activity after the test ended"), how often depending on machine load.
//
// `closeWhenSettled(server)` waits until no runner module is mid-evaluation (an importer awaiting a fetch stays
// `promise && !evaluated` for the whole chain) and the evaluated module count has not changed over `quiet`
// consecutive `step` ms checks (covering the fetch of a chain's first module), capped at `cap` ms, then closes.
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));

export async function settleSsr(server, { quiet = 3, step = 50, cap = 15000 } = {}) {
  if (!server) return;
  const graph = server.environments?.ssr?.moduleGraph?.idToModuleMap;
  const runner = () => server._ssrCompatModuleRunner?.evaluatedModules?.idToModuleMap;
  const evaluated = () => graph ? [...graph.values()].filter(mod => mod.ssrModule || mod.ssrError).length : 0;
  const busy = () => [...(runner()?.values() ?? [])].some(mod => mod.promise && !mod.evaluated);
  for (let last = -1, still = 0, start = Date.now(); still < quiet && Date.now() - start < cap;) {
    await pause(step);
    const now = evaluated();
    still = !busy() && now === last ? still + 1 : 0;
    last = now;
  }
}

export async function closeWhenSettled(server, options) {
  if (!server) return;
  await settleSsr(server, options);
  await server.close();
}
