// Code transcript renderer (W14-code renderer-core, plan-w14-code.md E86): the 3.6556.2 CodeTranscriptRenderer the
// desktop draws a Code session with — GrowthBook 3413676205 code_unified_renderer, `always: !0` in the desktop main
// process' Uon table (E81) — sliced without executing any desktop runtime (decision D0: own generator, own output folder
// src/generated/code-transcript, own scripts/verify-gen-code-transcript.mjs). The machinery is the working line's
// runSlicer (scripts/extract-working-line.mjs: a closure of original top-level declarations across chunks, one module
// per chunk, host adapters at the service boundaries).
//
// Where it sits in the desktop (pinned below as call sites):
//   cf74bc599 uw   the Code session's transcript: `transcriptRenderer: p` offered (`T = p !== void 0`), the live text
//                  held (`w = ve(Wc)`, 2714218019 code_stream_live_text), then dw.
//   cf74bc599 dw   `{entries, liveTexts, liveTextStore} = Ml(Ge, Pe)` (c96d752d0 LSe) under `pl` (S2e), the feed Zs
//                  (c96d752d0 Lat = bat) with the renderer props.
//   c96d752d0 bat  the feed: the renderer host `Ye` (sessionId, sessionRef, intl, seedKeys lit, codesOwn, showThinking,
//                  hiddenChapterIds, the U0 value stores, …), the fragments `I(E4e)`, `Xe = {baseEntries: X3(rat(s)),
//                  hasEarlier, isResponding}`, then `Zit({spec, fragments, host, write, proseSize, streaming, children})`
//                  around its list, whose rows draw a turn through R3's context (l3 / e7e).
//   c96d752d0 R3   CodeTranscriptRenderer (r9e): the spec E3 (parts code-core f8e, code-dots-mark X7e,
//                  code-step-pictures y8e — 101380594 — registered by `nf(…)` at module load), the transcript model of
//                  c4a9ee384 / c80ec48f8 (fragments, turns, groups, steps, notices), the alluvium reply prose of
//                  c19e90103 (3019411446 alluviumFixes).
//
// What the host does instead (src/source-code-transcript.jsx): its engine items become the desktop's entries
// (src/code-transcript-entries.mjs), and its rows (one l3 per entry, the host's own rows in place) go through the feed's
// list: W14-code r4 ct-feed R4T-09 slices the list Code's feed Fat (Aat) draws through (c4a9ee384 ba: virtualized,
// scroll-anchored, keyboard rows; the hold place Zp → cb264bc23 createHoldPlace under transcript_hold_place 4175257006)
// and Aat's keyboard map Cat (src/source-code-feed.jsx; transcript_hold_place off: the host's own scroller only); W14-code
// r5 R5T-04 adds Aat's row model for the entries (d7's lP with the renderer options: a long reply split into rendererItem
// rows). W14-code r6 review fix R6T-01 = gates-r6-01: the Code transcript scrolls in Aat's scroller ooe (c4a9ee384 Hp, its
// follow engine c7f8992b4 `x`) with Aat's keepsFollow (i7 / a7) and classifyKeyScroll (c227f4d5e S2); Aat's restore and
// paging hooks over R7's row model (z7 / Tat / B7 / V7 / W7 / k5) are not sliced: the host keeps its reading-position
// anchors, jump chip and keyed scrolls on top of ooe's follow (source-code-feed.jsx useOfficialFeedScroll).
//
// What is not the original, and why (adapters in src/source-code-transcript-adapters.jsx, which re-exports the
// transcript rows' adapters for the services both read; each pinned by features):
//   - the transcript rows' boundary (extract-transcript-rows.mjs: intl, GrowthBook flags, the request store, the tool
//     scope, telemetry, the desktop-only cards), except the two originals this renderer draws itself: the reply prose
//     (c19e90103 Ux) and the error card (cb1a6e506 j);
//   - the claude.ai API client (shared-0 y3 / _3 / Q3 / a1 / q3 / z3 / d6 / e6), the bootstrap (shared-25 kB), the
//     account (shared-25 Z), the boot configuration (shared-0 AQ), GrowthBook's client and evaluation (vendor-growthbook
//     Ht, shared-25 Ho: host-growthbook.mjs), the router (vendor-router Ar / Kn), the session engine store (c06cf64bb
//     iD), the pane store (c03935b01 Q / fu): E59, no account, no API — the original's "nothing" branch;
//   - telemetry (shared-0 iO / Fj / CE, shared-25 Jv / Db): D17;
//   - lazily loaded feature chunks the host does not serve (the loaders below): their failure / empty branch.
//
// Linked, not sliced again (D1): transcript-rows and chat-renderer export what this area reaches in them
// (scripts/code-transcript-links.json `linkExports`, read by both generators); working-line, session-rail, turn-plan,
// turn-box, chat-markdown, r3b-settings, session-rail-sections, cowork-approval, files-changes' TanStack Query; the small
// rest those areas slice without exporting is copied (`copies`, each pure or module-local). W14-code r7 (R7DC-03, r7c-01):
// this area in turn exports what the sidebar hover card, the sidebar routines and the queued message bar reach in its
// chunks (`linkExports['code-transcript']`), so they link it instead of slicing it again.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as v3 from './official-3.6556.2.mjs';
import { runSlicer } from './extract-working-line.mjs';
import { TRANSCRIPT_ROWS } from './extract-transcript-rows.mjs';

const root = path.resolve(import.meta.dirname, '..');
const C96 = 'c96d752d0-CWv_7-n9.js';
// Every chunk the closure enters besides c96d752d0, one module each (named after the chunk).
const CHUNKS = [
  'c011fa014-0wE6Q2Gy.js', 'c03935b01-yhcY34vt.js', 'c05a0e978-W4TnfZKy.js', 'c05b96c7f-MPVkefMW.js', 'c06cf64bb-CdJdJuVd.js',
  'c0787cb16-q4B0DIZj.js', 'c0cdf4a08-C69Ng1c8.js', 'c0ebb27c3-CRBeuSDW.js', 'c0fbbe82d-COsmfHJY.js', 'c11d4055e-BkpIgHYF.js',
  'c1277e726-CzDSXnjg.js', 'c1427ca47-K3WcDTlF.js', 'c155b6b71-66pw54FW.js', 'c16f659b9-Lmh4bP4f.js', 'c17c9c40b-D6Z0BgG0.js',
  'c18ab0d94-CR4fjHN-.js', 'c19e90103-BQFzF8EA.js', 'c1de660bb-CHZKPdIk.js', 'c1e715a58-5bxKK3Qu.js', 'c219730b0-DGG9iA8k.js',
  'c225c65b8--eicdJPn.js', 'c227f4d5e-B-FYKrwT.js', 'c24100247-CbA6l3eo.js', 'c24703190-DCixliHt.js', 'c24951e9f-JzS5EfmT.js',
  'c261da744-qOYw9vlH.js', 'c26f8455e-YuRMuTDz.js', 'c26fb8b6b-B7Friu61.js', 'c27343114-BFUYD1CO.js', 'c280f9bbb-CutcMso2.js',
  'c2846895d-9JATxnIw.js', 'c289d7154-Bezhd5si.js', 'c28b569d3-Cz90mWvn.js', 'c28ee0d82-dbmybvja.js', 'c2934b6b4-VNp3DE8P.js',
  'c2be7acad-osJJxw6e.js', 'c2c1ed18b-BGGmHSxk.js', 'c2d03a751-C4G8e7-8.js', 'c2d1aeb56-BwMYdDs2.js', 'c2d611398-Y2NVtf8_.js',
  'c2de0b058-BSd7X2HR.js', 'c2e206bf5-DgMgGvm4.js', 'c2f6611a3-DBT6B0Bq.js', 'c2fd10b8d-DB1Sgoyz.js', 'c30c42d34-B0SRB643.js',
  'c3320899b-CLmJTxEg.js', 'c36b66c16-Cc0B7BBJ.js', 'c376f4ef5-u-tE-_6Z.js', 'c383e945c-22-PnMU6.js', 'c389a02dd-8DAFcbV_.js',
  'c3a5e7571-D7yLPcDH.js', 'c3b7e7434-tBI61b1P.js', 'c3d503148-ChT-g3v_.js', 'c3e34355f-ChC9vKYq.js', 'c41c62ef4-Bw76O-Eu.js',
  'c425fb3cf-B-SGR6Na.js', 'c43a91f1b-CesFpWUA.js', 'c43d98448-DsGw0AUi.js', 'c4491d238-Dld3rfnp.js', 'c458e7dd9-YoA5hSs6.js',
  'c4a9ee384-RLCjceOL.js', 'c4acc1503-CtuKkx7L.js', 'c4aef5f87-zVl6Fx7S.js', 'c4b054ed5-CtSZ4e7r.js', 'c4d199b75-D3cQB-UP.js',
  'c4f1094ee-BmHjXHKq.js', 'c4fb3322a-BQK6nIqm.js', 'c4fe8412a-GnRwsJ21.js', 'c51596d2b-Dy8p_zYF.js', 'c5259f582-Drp5wXDV.js',
  'c52b02f3f-BejopSz8.js', 'c5304ebdb-C8vzSQK_.js', 'c53a94863-9HC3yAe9.js', 'c55cfb801-S2ROJln-.js', 'c57ac0f6d-DKb8cnJQ.js',
  'c59a315b1-C1sSC1tg.js', 'c5c200279-Dm8fXrtI.js', 'c5cd1b4dc-BTRy7mYR.js', 'c5da7eb42-XijZdwf1.js', 'c60636ac6-xYOM0GQX.js',
  'c60c4c863-BOpEHc3I.js', 'c6171d9bd-r7_4dqMm.js', 'c63c52947-vEHZCxml.js', 'c64576bc5-CC3tB4Xp.js', 'c65f1db98-BGzHCtce.js',
  'c664865b0-DjURtuVc.js', 'c67f0033f-Oz5m3oZs.js', 'c68c4283d-CWbOoVxS.js', 'c6b8adeaf-bLEQVSWL.js', 'c6d21d103-JCKleZiK.js',
  'c6dc54e94-E5GA6ry5.js', 'c6e873f5b-C0uM0mr8.js', 'c6fe30891-DfHqmikG.js', 'c70db48e3-DVXxzomO.js', 'c7146e7f4-CrJX0VkU.js',
  'c719f6bd7-BRsYoatL.js', 'c7340db78-D2JXKaXr.js', 'c74045701-0sFwdkS-.js', 'c74139e0c-Ddz2otEP.js', 'c76f98194-TpmhBB1i.js',
  'c776108c1-C8CXa6ZL.js', 'c77e464d3-B6HExtAy.js', 'c78205843-CtmOrj4s.js', 'c78c8eb97-DZPjq0yA.js', 'c7b19a753-Damdv4oQ.js',
  'c7bad7a49-CiGeivpO.js', 'c7dac0248-CeBgQdWa.js', 'c7e2266d1-Al3VZvsI.js', 'c7e626c72-j6Qi6Eqk.js', 'c7fb5ec3d-B51eEW6X.js',
  'c80ec48f8-D2IVcRNS.js', 'c821f3328-DISmfodb.js', 'c82987833-DrZ3-TXl.js', 'c82b159c8-MfuQdCaQ.js', 'c82eca2bd-CImI7zNG.js',
  'c845b7e54-BCqCHGQ3.js', 'c851b27a8-BxvTOAx3.js', 'c856385e2-aEyDzrcK.js', 'c86240138-Cq_NwsO0.js', 'c89adca3c-Bl1nxtpo.js',
  'c8ae173c6-DhxlbTId.js', 'c8b5c2821-DD689DWh.js', 'c8ba53634-Qe339QHm.js', 'c8f38bf1f-Ba2QaQov.js', 'c8f9ee329-D0ntUGee.js',
  'c9081d688-d6gSB2Ai.js', 'c91b6e9db-0Cdn02JS.js', 'c961a74d9-BqHu821p.js', 'c9688d71c-aZVTLSsX.js', 'c97f58e7c-DyJy2DJt.js',
  'c9c0413df-IGmtINHW.js', 'c9c48b8d6-0RhWg1wM.js', 'c9d32e900-BA_ZQs0V.js', 'c9ddef367-CXesgOWg.js', 'ca288e1f2-Bh3_g2mG.js',
  'ca3dcfb8a-BfxvMwc5.js', 'ca5db7aaf-qq5selW3.js', 'caa0fadae-BBittArl.js', 'cae93ec19-cd2omKol.js', 'caec9f4ef-CeVo4Zpj.js',
  'cafc2a89b-CLdxe4l9.js', 'cb0295ca3-D1ZiCgSj.js', 'cb0636f7b-jouCT0V2.js', 'cb1a6e506-CGO9mb0Y.js', 'cb27dab29-B4WyL7_M.js',
  'cb2e92b23-C2n2xpEZ.js', 'cb3bebb62-mje-KXA9.js', 'cb6930dae-Dw_4c1QI.js', 'cb8005e21-GUiHJFuO.js', 'cb8c5a88f-h6ooJ7Al.js',
  'cb979c293-C8lcC4Ky.js', 'cbae96566-Bid4C15Q.js', 'cbe8e060f-D1ntUCbQ.js', 'cbf215181-B-Z3x9eP.js', 'cc183b3ab-hP35rWpv.js',
  'cc1fe53e2-CC5cQt5s.js', 'cc5c56f5c-BoRtnbt1.js', 'cc5e7bf96-DhK4eFoi.js', 'cc61628a5-8L_GCwUH.js', 'cc6e65d4b-D0J5j7gV.js',
  'cc6e9624e-CoHywWvV.js', 'cc8df1cf9-CP9i5B98.js', 'ccc1bd976-C7PJRloq.js', 'ccd4c05b4-D6NGJKbe.js', 'ccd826b4b-DBMSNLXR.js',
  'ccdfebff6-BKPtxzql.js', 'cce2a382f-CejE_O_V.js', 'ccfbc4be8-CvsLklGE.js', 'cd159c29a-D2UyWshi.js', 'cd2efac6e-Be7wcc4w.js',
  'cd4f82e77-CAMIsQ30.js', 'cd5136de8-i56MUoIo.js', 'cd535dee8-BJQrxxqK.js', 'cd59309dc-BZMawR8Y.js', 'cd65bbf13-DNvSc1Pc.js',
  'cd8aaaf0e-uoqFmWIk.js', 'cd96b5fdc-B3bjGiE4.js', 'cdc2e8a7b-CaETfZ7y.js', 'cdf1f82f6-DKXF-DDI.js', 'cdf3a1410-BfWk8lZJ.js',
  'ce044ea01-D3lzOTP_.js', 'ce2cf86ad-DV2C6-s-.js', 'ce2d07062-uz1KiKuV.js', 'ce311b43f-pp3Qdi66.js', 'ce61829b3-DZ5WodUS.js',
  'ce660512f-BUC2eeZ7.js', 'ce7ba0094-D8aPOHDC.js', 'ce8202212-BBYeHXBi.js', 'ce9d127d4-BfDN9n85.js', 'cea7057eb-De2BQu3K.js',
  'cebf5e0b3-aQDHpNB1.js', 'cedad586d-Bu3Z3bi9.js', 'cee540db4-j-g9uKSp.js', 'cef1e6037-C9OZ_iaL.js', 'cefe23fc3-B9-ajwDE.js',
  'cf0157f76-BbNXl09O.js', 'cf53e1812-CX9VqRuk.js', 'cf565644b-DvngbabV.js', 'cf6524bd5-0fIL9m-2.js', 'cf7614ed4-CFmzrsqq.js',
  'cf790d7f8-xYEccUK6.js', 'cf7bdecc3-BUyPZ0iR.js', 'cf97b43fb-D15FhRmS.js', 'cfb0234e3-CAtk05RE.js', 'cfc0d8c26-3yV9R5YA.js',
  'cfca6870a-Dn2eYjs8.js', 'cfe74fa24-CTK54dfF.js', 'cffc62ebf-DydmXY2Z.js', 'preload-helper-D0dM6GpB.js', 'shared-0-DDOOdL6P.js',
  'shared-1-BJhqMmkf.js', 'shared-10-D6FXWZph.js', 'shared-104-CTONUSaz.js', 'shared-11-_AVGLHEz.js', 'shared-130-dWztbTO1.js',
  'shared-14-BP8q-CX5.js', 'shared-156-BLTosN8U.js', 'shared-16-ByfgAyLr.js', 'shared-18-D3y8YMFN.js', 'shared-182-BI1KJccu.js',
  'shared-19-DIKJVT7c.js', 'shared-2-TF8v67kg.js', 'shared-20-mUr7IqZY.js', 'shared-25-DOWZRSlq.js', 'shared-26-CGuBxVt9.js',
  'shared-28-DNYlf4wu.js', 'shared-3-BCEbd8Fv.js', 'shared-4-DUB1Oi0O.js', 'shared-46-BIbZBGFq.js', 'shared-5-Bg6ZMqvt.js',
  'shared-52-uHFNjl7C.js', 'shared-6-sd9jbJqs.js', 'shared-7-DBAgAi5H.js', 'shared-78-D5Fw2h0a.js', 'shared-8-Db1QN4mf.js',
  'shared-9-CM21XrJw.js', 'shared-frame-6jtSkIit.js', 'shared-frame-boot-Drp5VUjq.js', 'shared-styles-WTvdnI3p.js', 'vendor-all-0-DXM0MGjZ.js',
  'vendor-frame-CnSY1sxv.js', 'vendor-growthbook-DeN2x3Sf.js', 'vendor-icons-BplZ6UOJ.js', 'vendor-intl-DYfox5Co.js', 'vendor-markdown-CTRWgQFt.js',
  'vendor-query-DVJ0goAF.js', 'vendor-router-DBB8RO9T.js', 'vendor-utils-h7KXFLrg.js', 'vendor-zod-fszujTq6.js',
  // W14-code r2 R2T-07 / gates-r2-03: the chunks c96d752d0 DI (the user entry row) adds — @everyone mentions
  // (c68102b21), the seeded-summon parser entry (cb231ff8d), markdown-to-plain (cd4fb5ac7), the tool lookup / overflow
  // probe (cd88c7de7), the RTL arrow swap (c7037f09e).
  'c68102b21-WcjvV8zG.js', 'c7037f09e-DXK8RSre.js', 'cb231ff8d-C3NUlIOY.js', 'cd4fb5ac7-BD73PU5C.js', 'cd88c7de7-CxhZBHoC.js',
  // W14-code r2 R2T-TS8: the chunks cb6930dae Xu (the sent files' block under SendUserFile) adds.
  'c31294248-BzL4uuzK.js', 'c56477982-DE-zkfDH.js', 'c650084fd-BlejO2XR.js', 'shared-12-Dro5Rhl0.js',
  // W14-code r4 R4T-08b: the chunks the Workflow tool row F$ and the workflow card N$ add — the workflow progress model
  // (c62da1b56: agent states, phase groups, counts) and the panel flag context k1e reads (shared-15 bn).
  'c62da1b56-Dx0Af4Pv.js', 'shared-15-BvlV43cI.js',
  // F$'s title of a Workflow call's input (c7226f7ba t: the input's name, the script's meta name, else the script file).
  // W14-code r4 ct-feed R4T-09 (E95, E90 done): the chunks the desktop's feed list adds — c4a9ee384 ba (the shared list
  // c96d752d0 Aat draws through, `loe`), its keyboard map Cat and the hold place Zp: the follow / key-scroll helpers
  // (c7f8992b4, cb670556a), the focus landing (cb50b3202) and the scroll ease (c99ca27a0).
  'c7f8992b4-DUZwS58e.js', 'c99ca27a0-DVQoBCK_.js', 'cb50b3202-Be3mtbm0.js', 'cb670556a-bP33vPac.js',
  'c7226f7ba-2M9cy1xX.js',
];
const adapters = structuredClone(TRANSCRIPT_ROWS.adapters);
// The legacy rows hand two originals to the host that this renderer draws itself (one-to-one, E84): the reply prose
// (c19e90103 Ux, EpitaxyAlluviumMarkdown: the transcript's markdown, alluvium, 3019411446 alluviumFixes) and the error
// card (cb1a6e506 j). Both are sliced here.
delete adapters['c19e90103-BQFzF8EA.js'].t;
delete adapters['cb1a6e506-CGO9mb0Y.js'].t;
// W14-code r2 R2T-TS8: cb6930dae Xu (exported `a`), the sent files' block c96d752d0 W1 draws for SendUserFile (`placement:
// "own-block"`: the caption as prose, a tile per file), is sliced here, not the transcript rows' ToolAttachedFiles
// (the host's deliverables through scope.renderAttachedFiles), which the legacy rows keep.
delete adapters['cb6930dae-Dw_4c1QI.js'].a;
// W14-code r2 R2T-07 / gates-r2-03: c96d752d0 kI (the user entry row: kI → OI → DI) is sliced here, not the transcript
// rows' empty EventEntryRow. The renderer's o2 draws `code.user.bash / event / watch_record / …` through it, and the
// host's list draws through it what the desktop's feed draws outside the renderer (bat's i9 `case "user"` with no
// rendererSlotKey → gat → kI / mat): a failed send (DI `failedSend`, "epitaxy-failed-send") and a message waiting to be
// picked up by the running turn (DI `awaitingPickup` / `waitingLane: "steer"`, hd() presets, E92).
const TRANSCRIPT_ROWS_LOCAL_ADAPTERS = { ...TRANSCRIPT_ROWS.localAdapters };
delete TRANSCRIPT_ROWS_LOCAL_ADAPTERS[`${C96}#kI`];
// W14-code r2 R2T-11: c96d752d0 fX (the task_event card's chips: one event sXe, several CU / uX, the button dX) is sliced
// here, not the transcript rows' empty TaskEventChips: R3 `case "task_event"` → KW(…, "code.task_events", …) → J4e → fX
// draws a background task's settled event inside the reply. dX's click (Kg = c227f4d5e mQ) is the host's (below).
delete TRANSCRIPT_ROWS_LOCAL_ADAPTERS[`${C96}#fX`];
// W14-code r4 R4T-08b (E95): c96d752d0 F$, the Workflow tool row, is sliced here (a root: WorkflowToolRow, below), not the
// transcript rows' WorkflowToolCard; n1 (the tool group's member rows) draws it as the desktop does.
delete TRANSCRIPT_ROWS_LOCAL_ADAPTERS[`${C96}#F$`];

// Lazily loaded feature chunks the closure reaches (each a dynamic import the slicer does not follow): the host serves
// none of them, so each loader answers the original's own failure / empty branch.
const lazyAdapters = {
  'shared-6-sd9jbJqs.js#bL': { name: 'loadTurnOutcomeClassifier', features: ['tag: "turn_outcome_classifier"', 'import("./c3d91e0d6-DXXlSIxY.js")', '() => ((yL = !0), null)'] },
  'c91b6e9db-0Cdn02JS.js#M': { name: 'loadStackedMeterReadout', features: ['"cds_stacked_meter_readout"', 'import("./c6b47b88e-C-bftS07.js")', '() => ({ default: j })'] },
  'c2d03a751-C4G8e7-8.js#s': { name: 'loadEmojiTable', features: ['import("./ce8a22563-BSphFNt4.js")', 'EMOJI_TABLE: e'] },
  'cd2efac6e-Be7wcc4w.js#cu': { name: 'ProjectSkillFileMenuControls', features: ['id: "project_skill_save"', 'import("./c6ac9a71a-BfYvaxsZ.js")', 'pick: (e) => e.ProjectSkillFileMenuControls,'] },
  'shared-78-D5Fw2h0a.js#go': { name: 'loadPublicSuffixList', features: ['tag: "psl"', 'import("./cd668e25e-Cwg50oia.js")', '(so = e.parseHostIcann), (oo = e.parseHost)'] },
  'shared-20-mUr7IqZY.js#Fw': { name: 'CODE_SIDEBAR_ACTIONS_ENTRY', features: ['id: "code_sidebar_actions",', 'import("./c39a247c4--WbIrj9D.js")'] },
  'shared-20-mUr7IqZY.js#Dw': { name: 'CodeSessionMenuItems', features: ['id: "code_session_menu",', 'import("./ce4f4374c-BhSG0KEl.js")', 'pick: (e) => e.EpitaxyCodeSessionMenuItems,'] },
  'shared-16-ByfgAyLr.js#em': { name: 'EmojiShortcodeFieldEnhancer', features: ['id: "emoji_shortcode_field",', 'import("./cabdf1401-Biq2gNJT.js")', 'pick: (e) => e.EmojiShortcodeFieldEnhancer,'] },
  'shared-2-TF8v67kg.js#Ky': { name: 'READ_ALOUD_ENGINE_ENTRY', features: ['id: "read_aloud_engine",', 'import("./cb17312fe-Ce0HOTL7.js")'] },
  'shared-10-D6FXWZph.js#qo': { name: 'CONNECTOR_SUGGESTION_ENTRY', features: ['id: "tool_cell_connector_suggestion",', 'import("./cbadf45a4-Bf2ghaLV.js")'] },
  // W14-code r6 R6T-02: shared-10 jT (`Z({entry: {id: "image_preview_modal", …}, pick: (e) => e.ImagePreviewModal})`,
  // `MT = jT.Component`, read by c19e90103 ub / the zoomable reply image and c289d7154) is no longer an adapter: a plain
  // function has no `.Component`, so MT was undefined and the first zoom threw. The lazy handle is the original, and the
  // chunk it loads (cb1b78cfa, the CDS image preview dialog) is a module of this area (below).
  // W14-code r2 R2T-TS8: Xu's lazy pieces — the file save controls (`ba`) and the "As Claude sent it" sent copy body
  // (`ga`, for a file the desktop uploaded: file_uuid, needs the claude.ai account). Not served: nothing drawn.
  'cb6930dae-Dw_4c1QI.js#ba': { name: 'CodeSessionFileSaveControls', features: ['id: "code_session_file_save",', 'pick: (e) => e.CodeSessionFileSaveControls,'] },
  'cb6930dae-Dw_4c1QI.js#ga': { name: 'CodeSessionSentCopyBody', features: ['id: "code_session_sent_copy",', 'pick: (e) => e.CodeSessionSentCopyBody,'] },
  // W14-code r2 R2T-07: DI's seeded-summon parser (Boe → cb231ff8d f / d over the entry c): not served, so the entry is
  // failed and a raw turn reads `{status: "unparsed"}` (d's `c.state === "failed"` branch).
  'cb231ff8d-C3NUlIOY.js#c': { name: 'SEEDED_SUMMON_PARSER_ENTRY', features: ['id: "epitaxy_seeded_summon_parser",', 'import("./ce4ced852-eaAM37m5.js")'] },
  // DI's reaction picker body (the CDS emoji picker, reached through the reaction affordances): not served, the loader's
  // failure branch (`() => null`).
  // W14-code r4 ct-feed R4T-09: the tab-entry landing (c4a9ee384 Kp, chat_tab_entry_landing; Cat's y8 attaches it only
  // with tabLandsInView, which the Code feed does not pass): not served, the loader's failure branch (`() => null`).
  'c4a9ee384-RLCjceOL.js#Kp': { name: 'loadTabEntryLanding', features: ['tag: "chat_tab_entry_landing"', 'import("./cf61361f2-C_6hpWfb.js")', '(e) => e?.attachTabEntryLanding,'] },
  [`${C96}#Kk`]: { name: 'loadEmojiPickerBody', features: ['"cds_emoji_picker_body"', 'import("./c841a2d68-DpTKi8KJ.js")', '(Gk = e?.EmojiPickerBody ?? null)'] },
};
// Services of the desktop this host does not have (E59: no claude.ai account, no API, no telemetry), each answering the
// original's own "nothing" branch; local adapters, so every reference is replaced, imported or in-chunk.
const S0 = 'shared-0-DDOOdL6P.js';
const serviceAdapters = {
  // The claude.ai API client (shared-0): the fetchers (y3 "Query error" / _3 / Q3 / a1) reject, the query options (q3)
  // are disabled, the mutation (z3), account-checked query (d6) and paged query (e6) hooks answer idle / empty.
  [`${S0}#y3`]: { name: 'useApiFetcher', features: ['{ applicationType: l } = AQ(),', 'f = _3(),'] },
  [`${S0}#_3`]: { name: 'useApiFetch', features: ['{ applicationType: e } = AQ(),', 'replayable: i,', 'resendAfterStepUp: a,'] },
  [`${S0}#Q3`]: { name: 'useApiGetter', features: ['y3("Query error", e)', 'i?.method ?? "GET"'] },
  [`${S0}#a1`]: { name: 'fetchAsDocumentAccount', features: ['"fetchAsDocumentAccount takes a string or a URL"'] },
  [`${S0}#q3`]: { name: 'useApiQueryOptions', features: ['y3("Query error"', 'custom3pCompatible: c,', 'strongReadWhenInvalidated: g,'] },
  [`${S0}#z3`]: { name: 'useApiMutation', features: ['"Mutation error"', 'rawFetchOverride: l,', 'skipActionVerification: f,'] },
  [`${S0}#d6`]: { name: 'useAccountQuery', features: ['reaskCancelledAccountRead: l,', 'onSettled: s,'] },
  [`${S0}#e6`]: { name: 'useApiInfiniteQuery', features: ['"Query error"', 'pageParamName', '"next_page"'] },
  // The desktop's session engine store (c06cf64bb iD, exported Et: per-session buckets with the live message stream,
  // protocol handlers, eviction timers, persisted to IndexedDB). The host's sessions are its own engine items (bridged
  // into the renderer's entries), so this store is the empty one: no bucket for any session.
  ['c06cf64bb-CdJdJuVd.js#iD']: { name: 'sessionBucketsStore', features: ['protocolHandlers', 'evictTimer', 'historyIngested:'] },
  // The session pane store (c03935b01 Q / fu / gu: side panes, tiles, the main pane host). The host lays its panes out
  // itself (main.jsx tiles), so the renderer reads the original's fallback outside a pane host: an empty pane state.
  // W14-code r7 R7T-02: shared-52 _z, the desktop's "open in the browser" (`desktopBehavior: r = "open-in-browser"` →
  // `window.open(vz(e), "_blank", t)`), which DA's "Open in {browser}" calls (`oi({href: e, features:
  // "noopener,noreferrer"})`). This host's windows deny window.open (electron/main.cjs setWindowOpenHandler), so the
  // URL goes to the host's external opener (window.desktop.call("external"): the system browser), as the host's message
  // menu opened it.
  ['shared-52-uHFNjl7C.js#_z']: { name: 'openDesktopHref', features: ['desktopBehavior: r = "open-in-browser",', 'window.open(vz(e), "_blank", t)'] },
  ['c03935b01-yhcY34vt.js#Q']: { name: 'usePaneStore', features: ['return Ye(t ?? su, e);'] },
  ['c03935b01-yhcY34vt.js#fu']: { name: 'usePaneStoreContext', features: ['return f(Z);'] },
  ['c03935b01-yhcY34vt.js#gu']: { name: 'useMainPaneHost', features: ['return pu() && e;'] },
  // The claude.ai bootstrap (shared-25 kB: account, org feature flags, GrowthBook payload, server localizations): there
  // is no account here, so it answers no data (the host's flags come from host-growthbook.mjs through the flag hooks).
  ['shared-25-DOWZRSlq.js#kB']: { name: 'useBootstrap', features: ['bootstrapApiPrefix: a = DB,', 'orgScopedFetchUuid: x,'] },
  // Soft-navigation timing (shared-25 Jv / Db, the spa_nav measurement): telemetry, nothing is measured.
  ['shared-25-DOWZRSlq.js#Jv']: { name: 'startNavigationTiming', features: ['navigationType: "spa_nav",', 'armedForPath:'] },
  ['shared-25-DOWZRSlq.js#Db']: { name: 'releaseNavigationTiming', features: ['t.armedForPath === null', '"released"'] },
  // W14-code r5 R5T-01: shared-25 Ki, the DesktopInfo preload (`globalThis["claude.settings"]?.DesktopInfo`) shared-26 LD
  // reads for the Session info card's Desktop app row (getSystemInfo) and c8ae173c6 for the default browser's name. The
  // host has no preload: its own answer (source-code-transcript-adapters.jsx desktopInfo, the app version and host facts).
  ['shared-25-DOWZRSlq.js#Ki']: { name: 'desktopInfo', features: ['globalThis["claude.settings"]?.DesktopInfo'] },
  // decode-named-character-reference's DOM build (vendor-markdown T: `document.createElement("i")` at module load): the
  // npm package itself, as chat-renderer's adapter answers (the same function; source-chat-renderer-adapters.jsx).
  ['vendor-markdown-CTRWgQFt.js#T']: { name: 'decodeNamedCharacterReference', features: ['let t = "&" + e + ";";', 'w.innerHTML = t;'] },
  // GrowthBook's React client (vendor-growthbook Ht, `useGrowthBook()`): the host has no GrowthBook client (its flags are
  // host-growthbook.mjs, answered through the flag hooks); null, the no-payload state readers check with `?.`.
  ['vendor-growthbook-DeN2x3Sf.js#Ht']: { name: 'useGrowthBookClient', features: ['"Missing or invalid GrowthBookProvider"'] },
  // shared-25 Ho: a GrowthBook feature's evaluation (`e.growthbook.evalFeature(t)`, every flag hook of this chunk reads
  // it: fs / ms / us / ps / Rs / zs). The host has no GrowthBook client: the evaluation is the host's answer
  // (host-growthbook.mjs: the desktop's Uon defaults the host follows, E81).
  ['shared-25-DOWZRSlq.js#Ho']: { name: 'evaluateHostFeature', features: ['"Missing or invalid GrowthBookProvider"', 'n.evalFeature(t)'] },
  // shared-25 Z: the CurrentAccountProvider value (throws outside one). No claude.ai account here (E59): the value of a
  // provider with no account, as routines-shared answers.
  ['shared-25-DOWZRSlq.js#Z']: { name: 'useCurrentAccount', features: ['Error("Must call inside CurrentAccountProvider"),'] },
  // TanStack Router (vendor-router Ar useRouterState / Kn useNavigate): the desktop's web routes; the host has no router
  // (its panes and sessions are its own state), so the state is the app root and a navigation goes nowhere.
  ['vendor-router-DBB8RO9T.js#Ar']: { name: 'useRouterState', features: ['n.stores.__store'] },
  ['vendor-router-DBB8RO9T.js#Kn']: { name: 'useNavigate', features: ['t.navigate({ ...n, from: n.from ?? e?.from })'] },
  // shared-0 AQ: the web app's boot configuration (ConfigurationProvider). The desktop's is the claude.ai app's
  // (`applicationType: "claude-dot"`, c121d00d7 / shared-50); nothing else is configured here (no API prefix, no
  // server gate names).
  ['shared-0-DDOOdL6P.js#AQ']: { name: 'useAppConfiguration', features: ['"useConfiguration must be called from within ConfigurationProvider"'] },
  // Telemetry and diagnostics (D17): a handled-error report (iO), the health metric event (Fj), the frame-rate probe (CE).
  [`${S0}#iO`]: { name: 'reportHandledError', features: ['F.O11Y_INTERNALS'] },
  [`${S0}#Fj`]: { name: 'recordHealthMetric', features: ['event_type: "HealthMetricEvent",'] },
  [`${S0}#CE`]: { name: 'probeFrameRate', features: ['startedMono: e,', 'bestHz: void 0,'] },
  // mermaid itself (shared-10 qy: cc4b74920, a tree of lazily loaded chunks; By: its preflight c763d2034): not served,
  // so the diagram's load fails and the fence shows the original's failure state (its source).
  'shared-10-D6FXWZph.js#qy': { name: 'loadMermaid', features: ['import("./cc4b74920-eSxAPyr6.js")', '(Gy = !0), e.default'] },
  'shared-10-D6FXWZph.js#By': { name: 'loadMermaidPreflight', features: ['import("./c763d2034-Cnzl56e0.js")', '(Ry = e), e'] },
  // c26fb8b6b xn (useOpenLinkedSession): open a linked session through the desktop's router and pane tiles (⌘-click: a
  // new tile). The host's sessions open through its own navigation (source-code-transcript.jsx CodeTranscriptSessionLinks;
  // W14-code transcript-rest TM-1: the fork rows' session links).
  'c26fb8b6b-B7Friu61.js#xn': { name: 'useOpenLinkedSession', features: ['"useOpenLinkedSession: the route built for a linked session does not parse as a session route"'] },
  // W14-code r2 gates-r2-01: shared-0 Ko, a GrowthBook feature read outside render by name or `__gb__<id>` (`t ? t.isOn(Do(e))
  // : !1` over the client Ro installs). There is no client here (Lo stays null, so it was always false); the host table
  // answers instead (host-growthbook.mjs: Do's name → id, then the Uon defaults), so shared-11 Tl's
  // `Re("claudeai_cc_epitaxy_session_presets_main")` reads the same answer as the render-time gate readers.
  [`${S0}#Ko`]: { name: 'readGrowthBookFlag', features: ['return t ? t.isOn(Do(e)) : !1;'] },
  // W14-code r2 R2T-11: c227f4d5e mQ (imported by c96d752d0 as Kg), the handler that opens the Background tasks pane at a
  // task (`{taskId, agent, finished}` → c03935b01 du's setSidePane("tasks") / openTasksPaneAtTask / pushPaneView, null
  // without side panes). The host lays out its own panes (the pane store adapters answer "no pane host"), so the handler
  // is the host's own pane opener (source-code-transcript-adapters.jsx useOpenTaskInPane, null when none is provided).
  'c227f4d5e-B-FYKrwT.js#mQ': { name: 'useOpenTaskInPane', features: ['openTasksPaneAtTask: r,', 'expandFinishedSection: a,', 'return s ? l : null;'] },
  // W14-code r3 R3T-REG-01: cef1e6037 dt (imported by c96d752d0 as dp), the session's MCP App tool matcher o9e hands the
  // rows (`isMcpAppTool`, K1e's `o && i?.(t.tools[0].name)` → lY): the desktop's app features (shared-78 Aw) and its
  // per-session MCP server store (`en` over P). The host classifies MCP App tools over its own server state
  // (source-mcp-app.jsx), so the matcher is the host's (source-code-transcript-adapters.jsx useMcpAppToolMatcher).
  'cef1e6037-C9OZ_iaL.js#dt': { name: 'useMcpAppToolMatcher', features: ['e.filter(pt).map(ft)', 'sessionServers: r'] },
  // W14-code r4 R4T-08b: cef1e6037 Z, the desktop's local session client (its IPC bridge), which N$'s detailed card reads
  // a finished workflow's output file through (k1e → D1e `ple.readFile?.(e.id, s, {automatic: !0})`). No such client here
  // (source-code-feed-adapters.jsx localSessionClient): readFile is absent, the card keeps the task's own progress.
  'cef1e6037-C9OZ_iaL.js#Z': { name: 'localSessionClient', features: ['cancelQueuedNeedsConfirm: !1,', 'fetchTail: !1,'] },
};
const localAdapters = { ...TRANSCRIPT_ROWS_LOCAL_ADAPTERS, ...lazyAdapters, ...serviceAdapters };
// Top-level statements the selected code relies on that the slicer does not carry by itself (a loop filling a table):
// c7b19a753 (the alluvium parser): its inline character classes — `pe` (the inline markers, `for (let e of fe)
// pe[e.charCodeAt(0)] = 1`, without which no emphasis, code span or link is ever parsed) and `le` (ASCII punctuation).
const CHUNK_EXTRAS = {
  'c7b19a753-Damdv4oQ.js': { carryStatements: ['for(let e of fe)pe[e.charCodeAt(0)]=1', 'for(let e=0;e<128;e++)ce.test(String.fromCharCode(e))&&(le[e]=1)'] },
  // W14-code r2 R2T-01: c856385e2 `wt = Ct.Provider`, the session's contained image loader (c5259f582 provides it as
  // `containedImageLoader`); c96d752d0 fF reads it (`r = Fh()`, Fh = Tt) to load a user entry's pathImage items. The host
  // provides its own loader (source-code-transcript.jsx).
  // W14-code r2 R2T-TS8: c856385e2 `rt = nt.Provider`, c5259f582's `sessionFileReadable` (cb6930dae Xu reads it, `m = Qn()`,
  // to make the sent files' tiles open through the session file opener: `b = m && p ? p : void 0`). The host provides it
  // for its local sessions (source-code-transcript.jsx).
  // W14-code r6 R6T-02: c856385e2 `xt = bt.Provider` (exported `h`), the session's image loader c5259f582 provides
  // (`e(h, {value: n.imageLoader, children: L})`, cc43287c9 Vbe's `imageLoader: A` = LV's loadImage); c19e90103 ub reads
  // it (`Ge`) to preview a reply's link to an image file. The host provides its loader (source-code-transcript.jsx).
  'c856385e2-aEyDzrcK.js': { exports: { wt: 'ContainedImageLoaderProvider', rt: 'SessionFileReadableProvider', xt: 'ImageLoaderProvider' },
    features: { wt: ['Ct.Provider'], rt: ['nt.Provider'], xt: ['bt.Provider'] } },
  // W14-code r2 R2T-12: c227f4d5e PZ (exported `_r`), the turn error recovery scope cf74bc599 mounts around the Code
  // transcript (`s(Xp, {scopeStore: r, isResponding: mt, isReadOnly: sc, attachmentsLocked: Be, onRetry: Te, onCompact:
  // ke, onRetryWithFallback: De, onSwitchToAuto: Oe, children: hc})`): it provides hZ, which pg (_Z) reads for the error
  // card's Try again (`onRetryLastTurn`) and Compact. The host provides it around the renderer (source-code-transcript.jsx).
  // W14-code r4 R4T-08b: cea7057eb X, the session's background tasks (the value ve provides from the session's task
  // store, `e(X.Provider, {value: a}, …)`), read by F$'s `Wx(t.id)` (Se: `t.find((t) => t.toolUseId === e)`) and k1e. The
  // host provides its workflow runs in the desktop's task shape (source-code-feed-adapters.jsx workflowTasks).
  'cea7057eb-De2BQu3K.js': { internal: true, exports: { X: 'BackgroundTasksContext' }, features: { X: ['t(D)'] } },
  // W14-code r4 ct-feed R4T-09: c4a9ee384 ba (exported `nn`, c96d752d0's `loe`), the list the desktop's Code feed draws its
  // rows through, and Zp (exported `o`, c96d752d0's `rf`), the hold place it hands that list (transcript_hold_place).
  // W14-code r6 review fix R6T-01 = gates-r6-01 (E95: E90's whole-block replacement, GUI acceptance): Hp (exported `l`,
  // c96d752d0's `ooe`), the scroller Aat draws the feed in (`Je = ooe({className, innerClassName, attrs, containerRef,
  // docKey, initialPinned, classifyKeyScroll: yv, shouldRepinOnContainerResize, keepsFollow, onFollowCompensation,
  // resnapBeforeInput: Jd(), hidden})` → `{api, getContainer, render}`: the follow engine c7f8992b4 `x` (`on`) over the
  // scroll element, Fe.Provider with the api for ba, `div[data-autoscroll-container] > div`); Wp (exported `c`, Aat's
  // `Jd`), resnapBeforeInput's gate (3661363323). The host's Code transcript scrolls in it (source-code-feed.jsx
  // useOfficialFeedScroll; rollback local_feed_ooe_scroller).
  'c4a9ee384-RLCjceOL.js': { exports: { ba: 'useTranscriptList', Zp: 'useHoldPlaceOnWidthChange', Hp: 'useFeedScroller', Wp: 'useResnapBeforeInput' },
    features: { ba: ['{ defaultMessage: "Message {position} of {count}", id: "aX54Ax1k5D" },', 'holdPlaceOnWidthChange: fe,', 'role: "feed",'],
      Zp: ['return Qp(e).holdPlaceOnWidthChange;'], Hp: ['"data-autoscroll-container": !0,', 'jumpRepins: m,', 'registerEngine: M,'],
      Wp: ['let e = ie(Up);'] } },
  // W14-code r6 review fix R6T-01: S2 (exported `mt`, c96d752d0's `yv`), Aat's classifyKeyScroll for ooe.
  // W14-code r7 复核 R7T-06 = gates-r7-02 (E95, GUI acceptance): the live message stream of cf74bc599 dw. c06cf64bb W (the
  // per-session stream store: feed / flush / clear / subscribe / getSnapshot, its 33ms commit) takes the host's Codex
  // agentMessage deltas as the stream events it reads (src/code-stream-feed.mjs); cd4f82e77 zt (dw's `He = fd(t, r, i ?? !0,
  // Ve, je)`) reads its snapshot for the transcript.
  'c06cf64bb-CdJdJuVd.js': { exports: { W: 'transcriptStreamStore' },
    features: { W: ['feed: kx,', 'getSnapshot: Px,', 'takeRevealStats: Fx,'] } },
  'cd4f82e77-CAMIsQ30.js': { exports: { zt: 'useStreamSnapshot' },
    features: { zt: ['w.setVisibility(e, () => m() && !y.getState().hidden && v()),', '{ wantsThinking: l },'] } },
  'c227f4d5e-B-FYKrwT.js': { exports: { PZ: 'TurnErrorRecoveryProvider', S2: 'classifyFeedKeyScroll' },
    features: { PZ: ['attachmentsLocked: i,', 'onRetryWithFallback: s,', 'retryable: d,', 'y(hZ.Provider'],
      S2: ['(e.shiftKey && (i === "Home" || i === "End"))', 'return "none";'] } },
};
const ROOTS = { R3: 'CodeTranscriptRenderer', E3: 'CODE_TRANSCRIPT_SPEC', E4e: 'createRendererFragments', e7e: 'RendererItemRow', l3: 'RendererTurnRow',
  LSe: 'useLiveTexts', S2e: 'LiveTextProvider', kN: 'rendererTurnKey', ON: 'entryIndexById',
  U0: 'createValueStore', lit: 'seedKeysOwn', cit: 'seedKeysWithTurnEdits', TN: 'isDeferrableEntry', rat: 'entriesThroughProvisional', X3: 'createEntrySharer',
  // The stores the turn toolbar reads its pressed states from (u6e: Pin as chapter `GT(… userChapters.some(afterId))`,
  // Good / Bad response `u0` over l0): the host mirrors its own chapter store and reply ratings into them.
  GT: 'epitaxyChapterStore', l0: 'messageRatingStore',
  // W14-code transcript-rest TM-1: the list rows i9 draws for a fork (`case "forkedFrom"`: Cet, `case "forkMarker"`: Tet);
  // the host's list places them (source-code-transcript.jsx).
  Cet: 'ForkedFromRow', Tet: 'ForkMarkerRow',
  // W14-code r2 R2T-09: tDe provides lA / dA (the rewind / fork disabled reasons cf74bc599 nT derives: "responding" while
  // the turn runs), which IA / FA read for the disabled Rewind and its "Rewind is unavailable while Claude is working".
  tDe: 'RewindDisabledReasonProvider',
  // W14-code r2 R2T-07 / gates-r2-03: kI, the user entry row the host's list draws outside the renderer (see above).
  kI: 'UserEntryRow',
  // uD: the user row's bubble chrome flag i9 provides around gat (`f(uD.Provider, {value: Et !== !1 && Y !== !0})`, Et the
  // feed's rendererInset — true with the renderer on — and Y the overview layout, off here), as o2 provides it (`!0`).
  uD: 'UserRowChromeContext',
  // W14-code r4 R4T-08b (E95): F$, the Workflow tool row (group-status K1e `if (P$(t.tools[0])) return f(F$, {tool})`,
  // n1's `P$(d) ? f(F$, {tool: d, inGroup: !0})`; transcript-rows hands it to the scope as WorkflowToolCard, and the code
  // transcript's scope answers with this original, source-code-transcript.jsx renderCard "workflow"); N$, the workflow
  // card (compact j$e in F$; detailed k1e in the Background tasks pane's rows, cccc2cf0a wN `u(ds, {task, variant:
  // "detailed", sessionRef, onStop, stopping, nested, ownLine})`).
  F$: 'WorkflowToolRow', N$: 'WorkflowTaskCard',
  // W14-code r4 shell sleep-band-slot (E95): the session notice row i9 draws for the feed's "sessionNotice" item
  // (`case "sessionNotice": return t9(r, f(GG, { notice: e.notice }))`, t9 = the inset row e9 while the renderer is inset):
  // cf74bc599's `sessionNotice: yo` (`$p({sleepNotice: at, …}) ?? vo`), the in-transcript sleep notice wO publishes
  // (`Wm(r, "sleepNotice", Ie)`, `te = n && !G`). The host draws it in host.transcriptNotices (source-code-transcript.jsx).
  GG: 'TranscriptSessionNotice', e9: 'TranscriptInsetRow',
  // W14-code r4 ct-feed R4T-09 (E95: E90's whole-block replacement done, GUI acceptance): the desktop's Code feed is the
  // shared list (cf74bc599 uw `D = Cl(E)` → bat `sharedList` → Fat = M(Aat)), which draws its rows through c4a9ee384 ba
  // (`loe({items, getKey, renderRow, holdPlaceOnWidthChange: rf(), …, navigation: zt.keymap, navigationPolicy:
  // zt.policy, windowing: H ? Pat : c9, …, articles, labels})`; exported from that module as useTranscriptList, with Zp
  // as useHoldPlaceOnWidthChange). Cat is Aat's keyboard map (`zt = Cat({enabled: a === !0, …})`: the feed's arrow keys,
  // the "Load the rest of this message" button name), c9 the list's windowing (Aat's default, not keepAllRowsMounted's
  // Pat) and Nat its initial viewport estimate. The host's list (src/source-code-feed.jsx) calls ba as Aat does over the
  // host's rows.
  Cat: 'useFeedKeyboard', c9: 'FEED_WINDOWING', Nat: 'feedViewportEstimate',
  // W14-code r5 R5T-04 / gates-r5-04 (E95: E90's whole-block replacement, GUI acceptance; first step): Aat's row model.
  // R7 → d7 builds the feed's rows with lP (`Ie = lP(z, {…, rendererFragmentsOf: Ne, rendererFragmentsVersion: Me,
  // rendererPending: M?.pending, rendererEntryCount: N, shouldSplitEntry: hit, …}, Oe.current)`, Me = w4e(M)): a long reply
  // (hit: 16 items or 2000px) is one rendererItem row per renderer item (GN), drawn by i9 through e7e; Aat's articles
  // name a part by pN (`pN(e) ? (e.isFirst ? … ) : "only"`) and leave VN's rows out. The host's list
  // (src/source-code-feed.jsx feedEntryRows) builds its entry rows with these, the host's own rows staying opaque.
  lP: 'buildFeedRows', hit: 'splitsRendererEntry', w4e: 'useRendererFragmentsVersion', pN: 'isEntryPartRow', VN: 'isArticlelessRow',
  // W14-code r6 R6T-REG-01: M7, the message actions scope i9 puts around every renderer-drawn row (`case "user"` /
  // `case "assistant"` around l3, `case "rendererItem"` around e7e: `f(M7, {entry, turnKey, userChaptersByAfterId,
  // onPinChapter, onUnpinChapter, rendererPinAnchorOf, onForkAfterTurn, …, children})` → EA with `resolveActions`). The
  // host's list wraps a split reply's parts with it (source-code-transcript.jsx renderPart).
  M7: 'RendererRowActions',
  // TM: the entry item a renderer item key names (M7's `m = TM(n, p, t.items)`), EM: the key Aat's rendererPinAnchorOf
  // looks a pin anchor up by (`r = n?.itemKeys.indexOf(EM(e, t))`). The host names a part's row by the first (its engine
  // row) and answers rendererPinAnchorOf with the second, as Aat's `vr` does.
  TM: 'rendererItemOfKey', EM: 'rendererPinItemKey',
  // W14-code r6 (for the panes lane, r6pa-03): UQ, the Background tasks pane's Stop button (`icon: l ?? "Stop"`,
  // `className: "epitaxy-task-row-secondary shrink-0"`, quiet → ghost xs with an inline-start tooltip).
  UQ: 'TaskStopButton',
  // W14-code r6 review fix R6T-01 = gates-r6-01: Aat's keepsFollow for ooe, `qe = C((e) => (i7(e, x) ? !0 : (a7(e,
  // ze.current, Me.current), !1)), [x, ze, Me])` — i7: a press on a keeps-pin control (or below the bottom overlay) keeps
  // following; a7: a plain click on the followed transcript re-pins after Eit (500ms) when nothing scrolled or got selected.
  i7: 'feedPressKeepsFollow', a7: 'feedRepinAfterClick',
  // W14-code r7 R7T-02: TA, the message menu host Aat puts around its list (`f(TA, {children: f(n8, …)})`, both of Aat's
  // returns): xA.Provider (the menu EA / M7 open at a row: `O = T(xA)`, `O?.openAt({actionsRef, copyTargetId, snapshot,
  // hasText, …, row}, point)`) and _De, the one ContextMenu (Ke.Root with a hidden trigger the open re-dispatches a
  // contextmenu on, `Ke.Popup` drawing DA's items). The Code transcript's list sits in it (source-code-transcript.jsx), so
  // a right-click on a renderer-drawn row opens DA; Chat / Cowork keep the host's message menu.
  TA: 'TranscriptMessageMenuHost',
  // W14-code r7 复核 R7T-06 = gates-r7-02: fO, dw's `Os(a, He, Ue)` (cf74bc599 `Da as Os`): the stream snapshot over the
  // entries (c06cf64bb wy: the provisional entry's tail after provisionalAfterItemId becomes the snapshot's items,
  // `${messageId}-t${n}`), then the pending lead / held messages. The host applies it before LSe, as dw does.
  fO: 'applyStreamSnapshot' };
const ROOT_FEATURES = {
  fO: ['let i = Bme(e, t);', 'let s = a.heldMessages;'],
  TA: ['f(xA.Provider, { value: g, children: E })', 'hiddenTriggerRef: p,', 'closeIfArmedBy: (e) => {'],
  M7: ['rendererPinAnchorOf: o,', 'f(EA, { resolveActions: v, children: p })'],
  TM: ['i = r === void 0 ? void 0 : wM(r, n)?.run;'], EM: ['return n !== void 0 && n.startsWith("grp:") ? t.replace(CM, "") : t;'],
  UQ: ['className: "epitaxy-task-row-secondary shrink-0",', 'd = s ? "xs" : "sm",'],
  i7: ['u8(e.target) ||', 'e.clientY > t.getBoundingClientRect().top'],
  a7: ['!t.isPinned() ||', 'r.closest(Tit) !== null ||', '}, Eit);'],
  GG: ['{ message: i, detail: a, actions: o, focusComposer: s } = t,', '(!e.keepsLine && t?.contains(t.ownerDocument.activeElement) && s(), e.onAction());',
    '"flex min-w-0 flex-wrap items-baseline gap-x-1.5"'],
  e9: ['{ card: t, hug: n, children: r } = e,', 'f(t0, { variant: i, "data-code-own-row": "", children: s })'],
  R3: ['{ spec: t, fragments: n, host: r, write: i, proseSize: a, streaming: o, children: s } = e,', 't.parts.includes(t4)', 'f(o9e, {'],
  E3: ['id: "code",', 'parts: ["code-core", "code-dots-mark", "code-step-pictures"],', 'proseSize: "base",'],
  E4e: ['get: (t) => e?.(t),', 'version: () => s,'],
  e7e: ['i.renderItemRow(t, n, r)'], l3: ['r.renderRow(t, n)'],
  LSe: ['{ entries: i, liveTexts: a, liveTextStore: n }'], S2e: ['{ liveTexts: t, liveTextStore: n, liveSnapshot: r, children: i } = e,'],
  kN: ['`${e.id}:${e.sourceUuid ?? t}`'], ON: ['n.set(e[r].id, r);'], U0: ['listenerCount: () => n.size,'],
  lit: ['return H5(e, !1, t);'], cit: ['return H5(e, !0, t);'], TN: ['e.author === "assistant"', 'e.synthetic !== !0'],
  rat: ['provisionalMessageId !== void 0'], X3: ['shared: o, items: void 0'],
  GT: ['addUserChapter: (t, n, r) => {', 'removeUserChapter: (t, n) =>', '{ name: VSe, storage: lc(() => Fr) }'],
  l0: ['ratings: new Map(),', 'markRated: (t, n, r) => {'],
  // Cet = M(xet) (xet: `i = sp(t) === n`, `s = i ? "claude" : "fork"`), Tet = M(wet) (wet: Eet for one fork, Det's menu
  // for several): memo wrappers, pinned by their inner component.
  Cet: ['M(xet)'], Tet: ['M(wet)'],
  tDe: ['{ rewindDisabledReason: t, forkDisabledReason: n, children: r } = e,', 'f(lA.Provider, { value: t, children: i })'],
  kI: ['n = mxe(e.entry.items),', 'r.agent || r.sideSessionNotesDrawnByParent === !0'], uD: ['N(!1)'],
  F$: ['{ setSidePane: i, openTasksPaneAtTask: a } = Sm(),', 'taskType: "local_workflow",', 'f(N$, { task: v, variant: "compact", title: d, isPreLaunch: g, onOpen: e })'],
  Cat: ['let { articleOf: t, rendererFragments: n, rowsRef: r, scrollElRef: i, pinRef: a } = e,', 'defaultMessage: "Load the rest of this message"'],
  c9: ['overscanTop: o7,', 'release: { afterPresentedFrames: 2, gate: (e) => Ei(e) },'],
  Nat: ['return { scrollTop: 0, height: typeof window > "u" ? 0 : window.innerHeight };'],
  lP: ['o = { split: n?.splitEntryIds ?? wN, whole: n?.wholeEntryIds ?? wN, addedSplit: new Set(), addedWhole: new Set() },', 'n === null ? r : ZN(r, n.rows, t.isResponding === !0),'],
  hit: ['return e.items.length >= G5.items || x5(e, U8, !1, H8.m) >= G5.px;'], w4e: ['let t = e === void 0 ? 0 : e.version(),'],
  pN: ['return e.kind === "assistantItem" || e.kind === "rendererItem";'], VN: ['return (e.kind === "user" && e.drawnElsewhere === !0) || mN(e);'],
  N$: ['n === "compact"', 'f(j$e, { task: t, title: r, isPreLaunch: a, onOpen: o })', 'f(k1e, { task: t, title: r, sessionRef: i ?? null, onStop: s, stopping: d, nested: p, ownLine: m })'],
};
// Original text the host follows but does not import: how the desktop mounts the renderer (see the header).
const CF7 = 'cf74bc599-CRYqipWN.js';
const callSites = [
  { source: CF7, binding: 'uw', role: 'The Code transcript: the renderer offered and the live text held, then dw. Host: source-code-transcript.jsx',
    features: ['T = p !== void 0 && !a.overviewFeedLayout,', '{ offered: T, liveTextHeld: w }', 'holdLiveText: O,'] },
  { source: CF7, binding: 'dw', role: 'Ml (c96d752d0 LSe) splits the live texts, pl (S2e) provides them around the feed Zs (Lat). Host: SourceCodeTranscript',
    features: ['liveTexts: qe, liveTextStore: Je', 's(pl, { liveTexts: qe, liveTextStore: Je, liveSnapshot: ct, children: pt })', 'transcriptRenderer: Te,'] },
  { source: C96, binding: 'bat', role: 'The feed: the renderer host Ye, the fragments E4e, the write Xe, then Zit around the list. Host: SourceCodeTranscript',
    features: ['[_e] = I(E4e)', 'Z ? Se(rat(s)) : O7', '{ baseEntries: Ce, hasEarlier: Ee, isResponding: O }', 'f(Zit, {', 'componentName: "TranscriptRenderer",',
      'seedKeys: qe ? cit : lit,', 'lastReplyClosingLine: be,', 'tailActionsOutlet: xe,', 'publishedTranscript: c,'] },
  { source: C96, binding: 'Zit', role: 'R3 (Xit) with the streaming snapshot of C2e', features: ['f(Xit, { ...t, streaming: i })'] },
];
const modules = [
  { target: 'code-transcript.mjs', source: C96, internal: true, exports: ROOTS, features: ROOT_FEATURES,
    // The parts registry (`nf("code-core", f8e), nf("code-dots-mark", X7e), nf(t4, y8e)` with the hang-face inline CSS) and
    // the renderer module's residency (`wVe(r9e)`): module-load statements of c96d752d0.
    carryStatements: ['nf("code-core",f8e)', 'wVe(r9e)'] },
  // W14-code r2 closeout-2 (DC-06, D1): no c3ffe0a17 here. The code highlight entry c19e90103 Yc loads
  // (`import("./c3ffe0a17-BkUIZcqx.js")`, epitaxy_code_highlight) is transcript-rows' copy (outside-handlers.mjs Yc), the one
  // this closure links; a second re-export here had no importer.
  // c9e4d0c57: the mermaid fence c19e90103 eh loads (code_mermaid_fence), under its own name.
  { target: 'c9e4d0c57-DoEW0Gy_.js', source: 'c9e4d0c57-DoEW0Gy_.js', exports: { J: 'EpitaxyMermaidFence' } },
  // W14-code r4 ct-feed R4T-09: the lazily loaded chunks of the feed, each under its own name so the original
  // `import("./<chunk>.js")` resolves — cb264bc23, the hold place c4a9ee384 Xp loads (wild_spring) when Qp reads
  // transcript_hold_place (4175257006) on; c9f414608, the Tab focus release Cat's b8 loads (code_tab_focus_release).
  { target: 'cb264bc23-DxMA33A4.js', source: 'cb264bc23-DxMA33A4.js', exports: { c: 'createHoldPlace', f: 'createHoldPlaceKeepingPress', d: 'HELD_HEIGHT_ATTR' } },
  { target: 'c9f414608-BplIKcn2.js', source: 'c9f414608-BplIKcn2.js', exports: { i: 'attachTabFocusRelease' } },
  // W14-code r6 R6T-02: cb1b78cfa, the image preview dialog shared-10 jT loads (`import("./cb1b78cfa-VqsYNxqp.js")`,
  // `pick: (e) => e.ImagePreviewModal`), under its own name so the original import resolves.
  { target: 'cb1b78cfa-VqsYNxqp.js', source: 'cb1b78cfa-VqsYNxqp.js', exports: { g: 'ImagePreviewModal' } },
  ...CHUNKS.filter(c => c !== C96).map(source => ({ target: source.replace(/\.js$/, '.mjs'), source, ...CHUNK_EXTRAS[source] })),
];
// Bindings linked areas slice without exporting that this closure reaches (scripts/code-transcript-links.json `copies`,
// keyed area → chunk): sliced again here (`linkedCopies`). transcript-rows and chat-renderer export what this area needs
// instead (the same file's `linkExports`); these are the small rest, each pure or module-local (see the file's notes).
const LINKS = JSON.parse(fs.readFileSync(path.join(import.meta.dirname, 'code-transcript-links.json'), 'utf8'));
// W14-code r6 pierre (R6DC-01, D1): bindings this area slices that generated/pierre-changes (the c44d00c7f qu / Ju Changes
// body, scripts/extract-pierre-changes.mjs) reaches too are exported under their own names (the same file's
// `linkExports['code-transcript']`, keyed by chunk), so that area imports this one copy.
for (const m of modules) if (LINKS.linkExports['code-transcript']?.[m.source] && !m.verbatim && !m.reexport)
  m.linkExports = [...new Set([...(m.linkExports ?? []), ...LINKS.linkExports['code-transcript'][m.source]])];
const linkedCopies = Object.fromEntries(Object.entries(LINKS.copies).flatMap(([area, chunks]) => Object.entries(chunks).flatMap(([chunk, names]) =>
  names.map(name => [`${chunk}#${name}`, `sliced by ${area} without an export`]))));
// Module state view-tabs also holds (without a public name) that this area copies, each with why a second copy splits
// nothing the host relies on (the rest of view-tabs' state this closure reaches is published, D46).
const SF = v3.sharedFrame;
const stateCopies = {
  ...TRANSCRIPT_ROWS.stateCopies,
  [`${SF}#Fh`]: 'IME guard: the keydown events this copy already judged as composition ends (zh); each copy marks the events it sees',
  [`${SF}#Bh`]: 'constant input types (insertParagraph / insertLineBreak)',
  [`${SF}#_p`]: 'per-element max-width memo of the shrink-wrap measurer this copy runs (yp / bp / xp)',
  [`${SF}#vp`]: 'per-element max-width memo of the shrink-wrap measurer this copy runs (yp / bp / xp)',
  [`${SF}#dm`]: 'per-document ResizeObserver pool (fm): a second pool observes the elements this copy registers',
  [`${SF}#Bp`]: 'constant replaced-element tag set',
  [`${SF}#rm`]: 'per-window measure queue (im) of the elements this copy schedules',
  [`${SF}#kp`]: 'per-element text-fit cache (Ap) of this copy',
  [`${SF}#hm`]: 'per-FontFaceSet loadingdone listeners (gm) this copy registers',
  // W14-code r2 R2T-07: the button group's segment context (Nu, read by Pu → Vu, c96d752d0 de). This copy's only reader
  // is DI's JA Reply icon (NA, drawn with onReply: channel rows, never here), outside any ButtonGroup: it reads null,
  // as the original does there.
  [`${SF}#Nu`]: 'button-group segment context (Pu): this copy\'s only reader (c96d752d0 NA under JA\'s Reply) sits outside any ButtonGroup',
  'shared-2-TF8v67kg.js#q3': 'minute ticker subscribers (n6): a second interval for this copy\'s subscribers',
  'shared-2-TF8v67kg.js#R3': 'dedupe set of errors this copy reported',
  'shared-2-TF8v67kg.js#a6': 'Intl.RelativeTimeFormat style cache (c6)',
};
export const CODE_TRANSCRIPT = {
  name: 'code transcript', generator: 'extract-code-transcript.mjs', output: path.join(root, 'src/generated/code-transcript'),
  adapterModule: '../../source-code-transcript-adapters.jsx', adapterFile: 'src/source-code-transcript-adapters.jsx', adapters, localAdapters, modules, callSites,
  linkedAreas: [...TRANSCRIPT_ROWS.linkedAreas, 'transcript-rows', 'chat-renderer', 'chat-markdown', 'turn-plan', 'cowork-progress', 'turn-box', 'session-rail-sections', 'r3b-settings',
    { area: 'cowork-approval', modules: ['shared-52-uHFNjl7C.mjs'] },
    // TanStack Query (vendor-query): the files pane's one copy, and the app's one QueryClient (source-breadcrumb-adapters.jsx).
    { area: 'files-changes', modules: ['file-browser-query.mjs'] },
    // W14-code gen-final (D1): the Sessions page's small slices this closure also reaches — shared-52 OT (useLatchedValue),
    // shared-78 hv (sidebarListMessages), shared-182 sY (settleWithConcurrency), vendor-query ie (keepPreviousData). The
    // Sessions page sliced them first (cowork-live and chat-projects import them from there); only these modules are
    // linked, so the Sessions page never imports this area's chunks.
    { area: 'sessions-page', modules: ['pure-shared-52.mjs', 'pure-shared-78.mjs', 'pure-shared-182.mjs', 'pure-vendor-query.mjs'] },
    // W14-code gen-final (D1): shared-18 qv / HA / vk (the nested status dot, its error icon, the hit-row class) are
    // code-current's one copy (tests/nested-session-current.test.mjs pins a single holder).
    { area: 'code-current', modules: ['nested-session-parts.mjs'] },
    // W14-code r4 R4T-08b (D1): c1c6ea9ac a (the overflow measurer N$'s title reads) is code-composer's
    // (placeholder-fit.mjs useOverflowing); ce995db44 e (the SSH host key) is routines-shared's.
    { area: 'code-composer', modules: ['placeholder-fit.mjs'] },
    { area: 'routines-shared', modules: ['ce995db44-CRvpW1XI.mjs'] }],
  stateCopies, linkedCopies,
  gate: { flag: '__gb__3413676205', name: 'code_unified_renderer', host: 'src/host-growthbook.mjs HOST_GROWTHBOOK (Uon always !0, E81); source-code-transcript.jsx codeTranscriptRendererOn' },
  referenceVersion: v3.referenceVersion, referenceSnapshot: v3.referenceSnapshot, source: v3.ionSource, vendor: { [v3.vendorFrame]: v3.reactAliases },
};
export function extractCodeTranscript(options) {
  return runSlicer(CODE_TRANSCRIPT, options);
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await extractCodeTranscript({ check: process.argv.includes('--check'), dryRun: process.argv.includes('--dry-run') });
