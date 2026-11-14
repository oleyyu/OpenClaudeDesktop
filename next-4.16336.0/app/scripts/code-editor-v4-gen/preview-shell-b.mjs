// Area "preview-shell-b", 4.16336.0 contract (round 2 unit code-editor:d): Preview settings menu, pane menu, link
// destination chooser, radio card and Allowed sites dialog. Same adapter file names as the 3.6556.2 area
// (scripts/code-editor-gen/preview-shell-b.mjs). Location, pins and slicing as in preview-shell-a.mjs.
//
// 4.16336.0 vs 3.6556.2 (the 3.6556.2 factories took host Menu/Button/dialog/radio/intl/stores; those are cds-core now):
//   preview-settings-menu  ce4a0ab47-DBiD0syd H (menu) / U (clear-data dialog) over cf550b864-BHVEoOWt xe (sections hook)
//                          and ve (labels) (3.6556.2 c224804cc U / W / ae / B). The section rows now include dev server
//                          logs, allowed sites, cookie import and local network access; the pane menu is
//                          preview-pane-menu.mjs (sibling link).
//   preview-pane-menu      ca5db7aaf-C8dMH-IH H / U (3.6556.2 ca5db7aaf-qq5selW3 H / U).
//   preview-link-chooser   cf700d36e-U9ZMcolN f (3.6556.2 cf700d36e-BRuz1Q_U p) and its arming delay cebf5596d-DbqiNViv n
//                          (n). Host part: the modal presence hook c03935b01 kt (Xf), whose desktop store reaches a
//                          dynamic import (a factory parameter, as in 3.6556.2). The two preference stores (ce61829b3) and
//                          the default-browser label (c8ae173c6) are official copies now.
//   preview-link-radio     the radio card is CdsRadioGroup.Card (shared-frame zW, cds-core public name CdsRadioGroup), the
//                          one the chooser itself renders; no copy (3.6556.2 sliced shared-frame cV).
//   preview-allowed-sites  c36734a81-C0mWvktR M / v / y (3.6556.2 c36734a81-CAUg1TAj P / b / x) with the title class
//                          c4e7cbfa9 e (t).
import { ion, part, member, emitAdapter, pins, header } from './preview-shell-common.mjs';

const area = 'preview-shell-b';
const NAV = 'ce4a0ab47-DBiD0syd.js', ADDRESS = 'cf550b864-BHVEoOWt.js', PANE = 'ca5db7aaf-C8dMH-IH.js', CHOOSER = 'cf700d36e-U9ZMcolN.js';
const ARM = 'cebf5596d-DbqiNViv.js', FRAME = 'shared-frame-CJdE5Ria.js', SITES = 'c36734a81-C0mWvktR.js';

export const rootPins = {
  [NAV]: {
    PreviewSettingsMenu: { probe: 'let{sections:a}=j(n)', alias: 'r', sha256: '141adab5363c5b2bdc35ea7e145ca22f9c66dce54aed680f81275aa4d9aee75f', previous: 'c224804cc-Ct9XIdre U' },
    ClearPreviewDataDialog: { probe: 'previewStorage:r,onClose:i,onConfirm:a', alias: 'n', sha256: '4d9ed82641734c1b1b64266fc54230ebc51069bba9a4cdeb52af652d9eb418b5', previous: 'c224804cc-Ct9XIdre W' },
  },
  [ADDRESS]: {
    usePreviewSettingsSections: { probe: 'onShowSessionLogs:t', alias: 's', sha256: '16155bbcc9624ca2b651aab806c32943641cf994e4406d00081689d7a5013bcf', previous: 'c224804cc-Ct9XIdre ae' },
    previewSettingsLabels: { probe: 'showSessionLogs:"Show dev server logs"', alias: null, sha256: 'dac73e647aecbf0dcc62992468fd258fdcf415ed821cb8fe66b52b7c6c02386f', previous: 'c224804cc-Ct9XIdre B' },
  },
  [PANE]: {
    PreviewPaneMenu: { probe: 'paneName:o,unroll:s,triggerRef:u', alias: 'i', sha256: 'ce4b3f541a6abacd8e83b01182397c5855bccd34850e33a0f83619edfd7334ed', previous: 'ca5db7aaf-qq5selW3 H' },
    PreviewPaneMenuSections: { probe: '!n.noSeparator', alias: 'n', sha256: 'c92e932cc8bc08eb2aad05333858c79098e3a106254d8783f7b734063c40baed', previous: 'ca5db7aaf-qq5selW3 U' },
  },
  [CHOOSER]: {
    PreviewLinkChooser: { probe: 'opensPullRequest:h,claudeInPane:g', alias: 't', sha256: 'afc88972a588eabb10489ab5d14e7cf3621e587a9032fd44fbf26de63a3ba223', previous: 'cf700d36e-BRuz1Q_U p' },
  },
  [ARM]: {
    useInputArming: { probe: 'active:n,key:i', alias: 't', sha256: 'cff59abee732ced8ab3f503331f1ac73b201e65ccb3eb860b376e31a9abc7c63', previous: 'cebf5596d-q9cCbs9l n' },
  },
  [FRAME]: {
    radioCard: { probe: 'Q(LW,l)', alias: null, sha256: '434f912bf8af03f3f6bb3808d5776b7f85c1fc57b024552c52bb62fde169cc8c', previous: 'shared-frame-6jtSkIit cV' },
    radioGroup: { pattern: /^[\w$]{2}=Object\.assign\([\w$]{2},\{Root:[\w$]{2},Item:[\w$]{2},Card:[\w$]{2}\}\)$/, alias: 'Kt', sha256: '31fabdd3fc6759bdb8910a21fe1628f484ad19da6d5bbbccec024fe5140baf89', previous: 'CdsRadioGroup' },
  },
  [SITES]: {
    PreviewAllowedSitesDialog: { probe: 'n.pendingOrigin!==null', alias: 't', sha256: '7b4234fa78a3801dc346c13f8ec2aed90af7df49bdf2e7b8dc284b019e92a4e0', previous: 'c36734a81-CAUg1TAj P' },
    focusAllowedSitesFallback: { probe: 'matches(":disabled")', alias: 'n', sha256: '2677c92a9cbdda993ccda450fa42d6c17265ae22fb9f23aa5ec8cc342c18c63a', previous: 'c36734a81-CAUg1TAj b' },
    allowedSiteHost: { probe: '"*."', alias: null, sha256: '278facf5662644a016e222e1e6e8acac3f20ea01997db3bfe8a39937a7bcc8c5', previous: 'c36734a81-CAUg1TAj x' },
  },
};

const paneMenu = { 'ca5db7aaf-C8dMH-IH.js:i': { module: './preview-pane-menu.mjs', name: 'PreviewPaneMenu', features: ['paneName:o,unroll:s,triggerRef:u'] } };
// The modal presence hook: c03935b01 kt is `function Xf(e){Ve(e,Wf())}` over the desktop store (Wf -> Q(Gf) -> the host
// store context and its lazily imported default store).
const modalPresence = { 'c03935b01-BylKMWqe.js:kt': { param: 'useModalPresence', features: ['(e){Ve(e,Wf())}'], also: { Wf: ['return Q(Gf)'] } } };

export async function emit(ctx) {
  const r = {};
  for (const [file, table] of Object.entries(rootPins)) {
    if (file === FRAME) continue;
    Object.assign(r, pins(ctx, file, table));
  }
  const local = name => r[name].local;
  const pick = (...names) => Object.fromEntries(names.map(n => [n, r[n]]));

  // ---- settings menu + clear-data dialog (sections hook and labels of the address-field chunk)
  {
    const settings = await part(NAV, [local('PreviewSettingsMenu'), local('ClearPreviewDataDialog')], { hosts: paneMenu });
    for (const feature of ['autoOpenFiles:"Auto-open files Claude writes"', 'showAnnotationTools:"Show annotation tools"'])
      if (!settings.text.includes(feature)) throw Error(`${ADDRESS}: settings label ${feature} changed`);
    // The labels table is private to its chunk (xe reads it); its own closure, scoped.
    const labels = await part(ADDRESS, [local('previewSettingsLabels')], { scoped: true });
    await emitAdapter(ctx, 'preview-settings-menu.mjs', {
      header: header(area, `Preview settings menu (${NAV} H), clear-data dialog (U), sections hook (${ADDRESS} xe) and labels (ve)`),
      parts: [settings, labels],
      exports: {
        PreviewSettingsMenu: local('PreviewSettingsMenu'), ClearPreviewDataDialog: local('ClearPreviewDataDialog'),
        usePreviewSettingsSections: member(settings, ADDRESS, local('usePreviewSettingsSections')), previewSettingsLabels: member(labels, ADDRESS, local('previewSettingsLabels')),
      },
      roots: pick('PreviewSettingsMenu', 'ClearPreviewDataDialog', 'usePreviewSettingsSections', 'previewSettingsLabels'), previous: 'c224804cc-Ct9XIdre.js',
    });
  }
  // ---- pane menu
  {
    const pane = await part(PANE, [local('PreviewPaneMenu'), local('PreviewPaneMenuSections')]);
    await emitAdapter(ctx, 'preview-pane-menu.mjs', {
      header: header(area, `pane menu trigger (${PANE} H) and sections (U)`),
      parts: [pane], exports: { PreviewPaneMenu: local('PreviewPaneMenu'), PreviewPaneMenuSections: local('PreviewPaneMenuSections') },
      roots: pick('PreviewPaneMenu', 'PreviewPaneMenuSections'), previous: 'ca5db7aaf-qq5selW3.js',
    });
  }
  // ---- link destination chooser + input arming delay
  {
    const chooser = await part(CHOOSER, [local('PreviewLinkChooser')], { hosts: modalPresence });
    await emitAdapter(ctx, 'preview-link-chooser.mjs', {
      header: header(area, `link destination chooser (${CHOOSER} f) and input arming delay (${ARM} n); the host supplies the modal presence hook`),
      parts: [chooser], factory: 'createPreviewLinkChooser',
      exports: { PreviewLinkChooser: local('PreviewLinkChooser'), useInputArming: member(chooser, ARM, local('useInputArming')) },
      roots: pick('PreviewLinkChooser', 'useInputArming'), previous: 'cf700d36e-BRuz1Q_U.js',
    });
  }
  // ---- radio card: CdsRadioGroup.Card of cds-core (no copy)
  {
    const card = ctx.locatePinned(FRAME, ion, rootPins[FRAME].radioCard);
    const groupLocal = ctx.locatePinned(FRAME, ion, rootPins[FRAME].radioGroup);
    if (!new RegExp(`Card:${card.replace(/\$/g, '\\$')}\\}\\)$`).test(ctx.chunk(FRAME, ion).top.get(groupLocal).text)) throw Error(`${FRAME}#${groupLocal} no longer carries ${card} as Card`);
    const { published } = await import('./preview-graph.mjs').then(m => m.cdsCore());
    const pub = published.get(`${FRAME}#${groupLocal}`);
    if (pub?.name !== 'CdsRadioGroup') throw Error(`cds-core no longer publishes ${FRAME}#${groupLocal} as CdsRadioGroup`);
    const text = `${header(area, `CDS radio card: CdsRadioGroup.Card (${FRAME} ${groupLocal}.Card = ${card}), the card the link chooser renders`)}
import {CdsRadioGroup as $cds_CdsRadioGroup} from ${JSON.stringify(pub.module)};
export const PreviewLinkRadioCard=$cds_CdsRadioGroup.Card;`;
    await ctx.adapter('preview-link-radio.mjs', text, {
      sources: [ctx.chunk(FRAME, ion).source], bindings: [], realm: 'renderer', productionRealms: ['renderer'], previous: 'shared-frame-6jtSkIit.js',
      roots: { PreviewLinkRadioCard: { file: FRAME, local: card, sha256: rootPins[FRAME].radioCard.sha256, via: `${groupLocal}.Card`, previous: 'cV' },
        CdsRadioGroup: { file: FRAME, local: groupLocal, sha256: rootPins[FRAME].radioGroup.sha256 },
        $links: [{ binding: `${FRAME}#${groupLocal}`, module: pub.module, name: 'CdsRadioGroup', kind: 'cds-core' }] },
    });
  }
  // ---- Allowed sites dialog
  {
    const sites = await part(SITES, [local('PreviewAllowedSitesDialog'), local('focusAllowedSitesFallback'), local('allowedSiteHost')]);
    if (!sites.text.includes('title:"Allowed sites"')) throw Error(`${SITES}: dialog labels changed`);
    await emitAdapter(ctx, 'preview-allowed-sites.mjs', {
      header: header(area, `Allowed sites dialog (${SITES} M over b / A), focus fallback (v) and host label (y)`),
      parts: [sites],
      exports: { PreviewAllowedSitesDialog: local('PreviewAllowedSitesDialog'), focusAllowedSitesFallback: local('focusAllowedSitesFallback'), allowedSiteHost: local('allowedSiteHost') },
      roots: pick('PreviewAllowedSitesDialog', 'focusAllowedSitesFallback', 'allowedSiteHost'), previous: 'c36734a81-CAUg1TAj.js',
    });
  }
}
