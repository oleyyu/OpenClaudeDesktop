// shared-0 PO (`globalThis["claude.web"]?.CoworkSpaces`) for the 4.16336.0 projects graph (src/generated/chat-projects-v4,
// scripts/extract-chat-projects-v4.mjs HOST_ADAPTERS; library-pages r2-02): the host's local projects (main
// "local-projects") answer the official cowork spaces bridge.
//
// Offered: updateSpace(id, { name?, description? }) — the sliced shared-19 FI ("Edit details", opened by NI) saves only
// the changed fields through `je?.updateSpace?.(id, patch)` and needs a truthy answer (PI throws "updateSpace returned
// falsy" otherwise; a rejection shows FI's own "Failed to update project. You can try again." toast). The page that lists
// or shows the projects installs its main call and its repaint (installProjectSpacesHost; the last installed one answers).
// Not offered: every other CoworkSpaces member (getAllSpaces, deleteSpace, …) reads undefined, as the official `?.` reads
// of an absent member expect.
const hosts = [];

export function installProjectSpacesHost(host) {
  hosts.push(host);
  return () => {
    const index = hosts.lastIndexOf(host);
    if (index >= 0) hosts.splice(index, 1);
  };
}

export const CoworkSpaces = Object.freeze({
  async updateSpace(id, patch) {
    const host = hosts[hosts.length - 1];
    if (!host) return false;
    const fields = {};
    if (typeof patch?.name === 'string') fields.name = patch.name;
    if (typeof patch?.description === 'string') fields.description = patch.description;
    const project = await host.call('local-projects', { action: 'update', id, ...fields });
    host.onUpdated?.(project);
    return true;
  },
});
