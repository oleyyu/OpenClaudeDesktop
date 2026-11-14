import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
// Concrete view-tabs file, not the facade (E41): source-cowork-settings-adapters.jsx renders this dialog for the generated
// cowork-settings graph.
import { CdsLayerProvider } from "./generated/view-tabs/shared-frame-6jtSkIit.js";
import { PreviewAllowedSitesDialog, focusAllowedSitesFallback } from "./generated/code-editor/preview-allowed-sites.mjs";
import { allowedSiteError } from "./preview-allowed-sites-model.mjs";
import { holdModalInert } from "./modal-inert.mjs";
import { assistantName } from "./persona-store.mjs";
import { t } from "../electron/i18n/index.mjs";

// B39 Allowed sites: 3.6556.2 c25b1be4a PreviewAllowedSitesModal (loaded through ce3a18f86 er) over its view, the
// generated c36734a81 P (w12b-terminal-preview-tabs TPT-5: an unstyled CdsDialog popup with the 0.98 scale transition,
// holding the CdsSurface popover card M, the list S with its dir="ltr" field). The list is the main process's saved allow
// list (electron/preview-allowed-origins.mjs through preview-allowed-origins / -add / -remove / -clear), consulted before
// the agent's preview tools ask about a site. This file is c25b1be4a's place: the desktop bridge calls, the generation
// counter that drops late answers, the add/remove/clear flows and the labels.

// c03935b01 bt (c25b1be4a `c(m)`): while open, the page under the dialog is out of reach.
function useModalPresence(open) {
  useEffect(() => (open ? holdModalInert(globalThis.document?.getElementById("root")) : undefined), [open]);
}

/**
 * c25b1be4a m: a reopen drops the draft, the error and the old list (the j generation counter drops late answers); P
 * holds Escape and an outside press while a remove, an add or Clear all is in flight. `layer` (the Settings layer) is
 * the host's: the CDS dialog portals at that base.
 */
export function SourcePreviewAllowedSites({ isOpen, onClose, desktop = globalThis.desktop, layer }) {
  const [entries, setEntries] = useState([]);
  const [pendingOrigin, setPendingOrigin] = useState(null);
  const [draft, setDraft] = useState("");
  const [addPending, setAddPending] = useState(false);
  const [draftError, setDraftError] = useState(null);
  const addInput = useRef(null), generation = useRef(0);
  const call = useCallback((action, params) => (desktop?.call ? desktop.call(action, params ?? {}) : Promise.reject(new Error("unavailable"))), [desktop]);
  const canAdd = !!desktop?.call;
  useModalPresence(!!isOpen);
  useEffect(() => {
    generation.current += 1;
    if (!isOpen) return undefined;
    setDraft(""); setDraftError(null); setAddPending(false); setPendingOrigin(null); setEntries([]);
    let cancelled = false;
    call("preview-allowed-origins").then((list) => { if (!cancelled) setEntries(Array.isArray(list) ? list : []); }, () => {});
    return () => { cancelled = true; };
  }, [isOpen, call]);
  const refresh = useCallback(async () => {
    const at = generation.current, list = await call("preview-allowed-origins");
    if (generation.current === at) setEntries(Array.isArray(list) ? list : []);
  }, [call]);
  // c25b1be4a re / f: the row is pending until the remove and the refresh settle (a late answer leaves a newer one alone).
  const remove = useCallback(async (origin) => {
    const at = generation.current;
    setDraftError(null); setPendingOrigin(origin);
    try { await call("preview-allowed-origin-remove", { origin }); await refresh(); } catch { /* the row stays */ }
    finally { if (generation.current === at) setPendingOrigin((value) => (value === origin ? null : value)); }
  }, [call, refresh]);
  // c25b1be4a I / p: a schemeless entry is tried as https://; Ok clears the draft (if unchanged) and refocuses the field,
  // Declined says nothing, anything else is the field's alert (d).
  const add = useCallback(async () => {
    const value = draft.trim();
    if (!value || addPending) return;
    const at = generation.current;
    setAddPending(true); setDraftError(null);
    const schemeless = !value.includes("://");
    let result;
    try { result = (await call("preview-allowed-origin-add", { origin: schemeless ? `https://${value}` : value, schemeless })) ?? "unavailable"; } catch { result = "unavailable"; }
    if (generation.current !== at) return;
    setAddPending(false);
    if (result === "ok") {
      const typed = draft;
      setDraft((current) => (current === typed ? "" : current));
      await refresh().catch(() => undefined);
      if (generation.current === at) focusAllowedSitesFallback(addInput.current);
    } else {
      if (result !== "declined") setDraftError(allowedSiteError(result, t));
      focusAllowedSitesFallback(addInput.current);
    }
  }, [draft, addPending, call, refresh]);
  // c25b1be4a ie / ee: Clear all, then the list again (M keeps its own pending state and the focus after it).
  const clearAll = useCallback(async () => {
    setDraftError(null);
    try { await call("preview-allowed-origins-clear"); await refresh(); } catch { /* kept */ }
  }, [call, refresh]);
  const labels = useMemo(() => ({
    addUrl: t("Add URL"), addPlaceholder: t("example.com"), add: t("Add"), builtin: t("Built-in"),
    remove: (host) => t("Remove {host}", { host }), empty: t("No allowed sites yet."),
  }), []);
  const cardLabels = useMemo(() => ({
    title: t("Allowed sites"), close: t("Close"), clearAll: t("Clear all"), done: t("Done"),
    description: t("{assistant} can use its Browser tools on these sites without a permission prompt. Remove a site and {assistant} asks again the next time that site needs your approval.", { assistant: assistantName() }),
  }), []);
  const dialog = <PreviewAllowedSitesDialog isOpen={!!isOpen} onClose={() => onClose?.()} onClearAll={clearAll} clearAllDisabled={!entries.some((entry) => !entry.builtin)}
    entries={entries} canAdd={canAdd} draft={draft} onDraftChange={(value) => { setDraft(value); setDraftError(null); }} draftError={draftError}
    addPending={addPending} pendingOrigin={pendingOrigin} onAdd={() => void add()} onRemove={(origin) => void remove(origin)} addInputRef={addInput}
    labels={labels} cardLabels={cardLabels} />;
  return layer ? <CdsLayerProvider base={layer.base}>{dialog}</CdsLayerProvider> : dialog;
}
