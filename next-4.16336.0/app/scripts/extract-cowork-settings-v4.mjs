// Settings › Cowork, 4.16336.0 source contract (claude-4.16336.0-migrate-20261104, round 2, region cowork-settings): the
// semantic root extract-cowork-settings.mjs cuts from 3.6556.2 into src/generated/cowork-settings (c71860c77-CKIsHnA3 De),
// cut from the frozen 4.16336.0 snapshot into the isolated graph src/generated/cowork-settings-v4. The 3.6556.2 generator,
// output and tests are untouched (staged double output; no production switch, productionSwitchNotBeforeBatch 9: the host
// page src/source-cowork-settings.jsx keeps reading src/generated/cowork-settings).
//
//   c71860c77-iq75iE8v  Q  CoworkSettingsPage  (chunk-internal; the settings page loader cc011544b `cowork:Q("cowork",
//                         …import("./c71860c77-iq75iE8v.js"))` mounts the chunk's default export W, which renders
//                         `e(Q,{deepLinkHeld:r})` once the page is not folded into Account / General settings.)
//
// 4.16336.0 changed the page (re-checked section by section, each pinned in rawCallSites):
//   desktop  `t("main",{className:"flex flex-col gap-7",children:[v,y,b]})` with v = c79197f2b Ge (Require trusted
//            devices, a hub of account features), y = c79197f2b Be (the remote device list, deepLinkHeld), and, when
//            enableAdditionalDirectoriesClaudeMd (u), b = [V (empty slot), _&&cfea69990 R (Dispatch), _&&cfea69990 P (Cowork
//            files), cabd7b1c1 se (Trusted Cowork folders), cabd7b1c1 ee (the session-host backend toggle), _&&H (the
//            browser group: cabd7b1c1 J Preferred browser, cdc95db1a f Open links in built-in browser, and cdc95db1a p
//            Allowed sites when Ny), c79197f2b He (the guest pass), p&&ced6780ff be (Global instructions), g&&ced6780ff Ue
//            (the account instructions import)], _ = onThisDevice, p / g = enableAdditionalDirectoriesClaudeMd and
//            whether the Cowork instructions are separate from the account profile.
//   web      `children:[n,r,a,o,s,c]` (no Cowork files / Dispatch / folders; never taken here: useIsDesktopApp).
//   The 3.6556.2 Memory section (c71860c77 me, "Use memory in sessions") is no longer on this page in 4.16336.0.
//
// Machinery: the shared runSlicer engine (scripts/extract-working-line.mjs, not changed here):
//   - sourceContract scripts/official-4.16336.0.mjs (vendor-frame React aliases checked against their declarators);
//   - sharedGraph 'cds-core' (CdsSwitch, CdsInfoTooltip, CdsDialog, CdsField*, CdsDataTable, … are cds-core publicNames;
//     cds-core module state without a publicName stops generation, D46); the reviewed cds-core manifest sha256 is pinned
//     (CDS_CORE_MANIFEST_SHA256, wave 6);
//   - linkedAreas (D1): routines-shared-v4 (React Compiler helpers, intl messages, shared-0 / shared-25 / shared-62
//     readers it slices), cowork-scheduled-v4 (shared-123 q `Rs(E_)` — the 3.6556.2 shared-78 K context reader this graph
//     must share with it —, shared-26 ag, shared-92 yD, shared-183 Mg / Rg, …), settings-nav (shared-183 yg, the settings
//     modal store, exported as settingsModalStore) and frame-sidebar-nav (the shared-0 request/error machinery, shared-153
//     wC, shared-25 fs / ms / nd / sd, …): every binding one of them holds and exports is imported from it, never cut
//     again. cowork-progress-v4 and transcript-rows-v4 (the 3.6556.2 links shared-130 nU / shared-52 lD) hold nothing this
//     closure reaches in 4.16336.0, so they are not linked;
//   - linkedCopies: the pure constants / functions a linked area slices without exporting (cut again here, each with why);
//   - host boundaries as localAdapters (file#local), src/source-cowork-settings-v4-adapters.jsx: the same official
//     services the 3.6556.2 graph adapts (now in their 4.16336.0 chunks / locals), the generic intl / errors / analytics /
//     account / GrowthBook / query-client hooks routines-shared adapts, and the account-only services (queries, mutations,
//     gates) answered as without a claude.ai account, so the official sections take their own closed branch. Each
//     original is pinned by features and by its raw declaration sha256 (ADAPTER_PINS).
// The root is located on the official AST: the only top-level declaration of its chunk whose raw text has the probe and
// whose prettier form carries every feature, under the reviewed local, with its raw declaration sha256 pinned
// (ROOT_PINS). No pin is ever refreshed by a script.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import * as official from './official-4.16336.0.mjs';
import { runSlicer, readSource, featureText, assertFeatures } from './extract-working-line.mjs';

const root = path.resolve(import.meta.dirname, '..');
const generatedRoot = path.join(root, 'src/generated');
export const COWORK_SETTINGS_V4_OUTPUT = 'src/generated/cowork-settings-v4';
const ADAPTER_FILE = 'src/source-cowork-settings-v4-adapters.jsx';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');

// The cds-core graph this area was reviewed against (cds-core wave 6).
export const CDS_CORE_MANIFEST_SHA256 = 'a0f228ae3f997f54f3e3ebafc254794bd26d8f1fc6999943a08b1d5730f638cd';

export const PAGE = 'c71860c77-iq75iE8v.js';

// ── Root: file -> local -> { name, export (null: chunk-internal), probe (raw), features (prettier form) } ─────────────
export const ROOTS = {
  [PAGE]: {
    Q: { name: 'CoworkSettingsPage', export: null, probe: '{deepLinkHeld:i}=n',
      features: ['{ deepLinkHeld: i } = n,', '{ enabled: s, isLoading: l } = m(),', 'p = u && f,', 'g = u && !f,', '_ = h().onThisDevice;',
        'variant: "locked",', 'e(A, { deepLinkHeld: i })', 'e(V, {}),', '_ && e(B, {}),', '_ && e(z, {}),', 'p && e(M, {}),', 'g && e(N, {}),'] },
  },
};
// Reviewed pins: raw declaration sha256 (official bytes) of the root (`--locate` prints it; never refreshed by a script).
export const ROOT_PINS = {
  'c71860c77-iq75iE8v.js#Q': '8b41ddea2f27b7a5f6abd43ecc143c680a440d7dcd9377ba99d47b534b4cc28d',
};

// ── Host boundaries: file#local -> { name (export of the adapter module), from (the host adapter it comes from), features } ──
const V3 = 'src/source-cowork-settings-adapters.jsx', RS = 'src/source-routines-shared-adapters.jsx', CR = 'src/source-code-routines-v4-adapters.jsx', V4 = ADAPTER_FILE;
export const HOST_ADAPTERS = {
  // The page (c71860c77 Q).
  'shared-0-CnnWnVrT.js#FH': { name: 'useIsDesktopApp', from: V3, features: ['wI(window.navigator.userAgent, { version: t, platform: n })'] },
  'shared-123-1Hc1RTKl.js#Wy': { name: 'useCoworkEnabled', from: V3, features: ['return Ky(Ey());'] },
  'shared-18-Cfqwgjc5.js#Fy': { name: 'useCoworkAdditionalDirectoriesClaudeMd', from: V3, features: ['return py().enableAdditionalDirectoriesClaudeMd ?? !1;'] },
  'shared-25-D-aF0gt9.js#uQ': { name: 'useCoworkInstructionsSeparate', from: V3, features: ['hQ({ additionalPermittedStatusCode: 404, editing: e });', 'return lQ(t);'] },
  'shared-62-DoCqVpIq.js#NA': { name: 'useCoworkHostLocation', from: V3, features: ['e = !Ze();', '{ onThisDevice: e }'] },
  // The browser group (c71860c77 H, cdc95db1a f / p, cabd7b1c1 J).
  'shared-18-Cfqwgjc5.js#Ny': { name: 'usePreviewAllowedSitesAvailable', from: V3, features: ['return e && t && !!He?.getPreviewAllowedOrigins;'] },
  'shared-18-Cfqwgjc5.js#My': { name: 'useOpenLinksInBuiltInBrowserAvailable', from: V3, features: ['return e && t && !!He?.openExternalLinkInPreview;'] },
  'ce61829b3-DN3TmwtQ.js#n': { name: 'useOpenLinksInBuiltInBrowser', from: V3, features: ['return e(t, !0);'] },
  'ce3a18f86-Dmeg0yYT.js#r': { name: 'PreviewAllowedSitesModal', from: V3, features: ['id: "preview_allowed_sites_modal",', 'pick: (e) => e.PreviewAllowedSitesModal,'] },
  'shared-18-Cfqwgjc5.js#by': { name: 'useCoworkRemoteClaudeBrowser', from: V3, features: ['An("cowork_remote_claude_browser")', 'e?.settings.cowork_preferred_browser !== void 0'] },
  'shared-18-Cfqwgjc5.js#yy': { name: 'useCoworkPreferredBrowser', from: V3, features: ['n?.coworkPreferredBrowser ??', 'c = n !== void 0 && "coworkPreferredBrowser" in n,', 'supported: c,'] },
  'shared-123-1Hc1RTKl.js#nM': { name: 'useChromeExtensionMcpIntegration', from: V3, features: ['V("chrome_ext_mcp_integration")', 'ys("claude_browser_extension")'] },
  'shared-123-1Hc1RTKl.js#bA': { name: 'useClaudeInChromeConnectorEnabled', from: V3, features: ['var bA = yA.useEnabled;'] },
  'shared-123-1Hc1RTKl.js#ay': { name: 'useClaudeInChromeAvailable', from: V3, features: ['r = D_() === "answered",', '!ce || !r || !i || a === void 0 || Ps(a, n);'] },
  // Trusted Cowork folders (cabd7b1c1 se) and the desktop bridges.
  'shared-0-CnnWnVrT.js#kO': { name: 'coworkLocalAgentModeSessions', from: V3, features: ['globalThis["claude.web"]?.LocalAgentModeSessions'] },
  'shared-25-D-aF0gt9.js#Bi': { name: 'coworkAppPreferences', from: V3, features: ['globalThis["claude.settings"]?.AppPreferences'] },
  'shared-25-D-aF0gt9.js#zi': { name: 'coworkFilePickers', from: V3, features: ['globalThis["claude.settings"]?.FilePickers'] },
  'shared-1-D1bGaTaN.js#jE': { name: 'useGate3213217663', from: V3, features: ['Vr("__gb__3213217663")'] },
  // Cowork files (cfea69990 P).
  'shared-0-CnnWnVrT.js#jO': { name: 'coworkUserFiles', from: V3, features: ['globalThis["claude.web"]?.CoworkUserFiles'] },
  // Global instructions (ced6780ff be / Te).
  'ced6780ff-BmLhI5uX.js#ye': { name: 'useCoworkGlobalInstructionsProfile', from: V3,
    features: ['additionalPermittedStatusCode: 404,', 'i = F("instructions"),', '{ query: p, putProfile: m, limit: f, notKept: a }'] },
  'shared-0-CnnWnVrT.js#MO': { name: 'coworkMemoryBridge', from: V3, features: ['globalThis["claude.web"]?.CoworkMemory'] },
  'shared-183-B2N6Zy4J.js#y$': { name: 'CoworkPlacementBoundary', from: V3, features: ['{ pending: e, children: t }', 'mode: "latest",', 'children: t(r)'] },
  'shared-183-B2N6Zy4J.js#NY': { name: 'coworkSessionHostReadState', from: V3, features: ['return e === void 0 || n.state === "signIn" ? n : void 0;'] },
  // The locked notice (cbef3b9e7 s): the named pictogram over the lazy def loaders.
  'shared-1-D1bGaTaN.js#K$': { name: 'NamedPictogram', from: V4, features: ['m(q$, { ...e }, e.name)'] },
  // Dispatch (cfea69990 R): its account gates and the sessions bridge consent.
  'shared-18-Cfqwgjc5.js#ZV': { name: 'useDispatchAllowed', from: V4, features: ['return YV() === "allowed";'] },
  'shared-18-Cfqwgjc5.js#UV': { name: 'useDittosAvailable', from: V4, features: ['return kd("dittos").isAvailable;'] },
  'shared-18-Cfqwgjc5.js#GV': { name: 'useDispatchGate', from: V4, features: ['return An(WV);'] },
  'shared-18-Cfqwgjc5.js#u1': { name: 'useSessionsBridgeState', from: V4, features: ['t = tt?.getSessionsBridgeEnabled,', 'n = tt?.getBridgeConsent,'] },
  // The session-host backend toggle (cabd7b1c1 ee).
  'shared-18-Cfqwgjc5.js#eH': { name: 'useCoworkBackendToggleShown', from: V4, features: ['return t && (!e || (n && !r && i)) && a;'] },
  'shared-26-B-POtn5S.js#ig': { name: 'useCoworkRemoteBackend', from: V4, features: ['"yukon_silver_dramatic_shrimp_internal"', '{ isRemote: a, setIsRemote: o, isLoading: s }'] },
  'shared-18-Cfqwgjc5.js#RA': { name: 'useCoworkBackendSwitchConfirm', from: V4, features: ['if (e && MA(t) === void 0) {', 'await i();'] },
  'shared-18-Cfqwgjc5.js#wA': { name: 'coworkBackendHelpUrl', from: V4, features: ['Cn("__gb__3695703908")', 't.host === "support.claude.com"'] },
  // Require trusted devices / the remote device list / the guest pass (c79197f2b Ge / Be / He).
  'shared-18-Cfqwgjc5.js#Ey': { name: 'useCoworkTrustedDevicesHubAvailable', from: V4, features: ['n = Qn(Cy, e && !t);', 'return e && (t || n);'] },
  'shared-18-Cfqwgjc5.js#hy': { name: 'useCoworkRemoteDevicesAvailable', from: V4, features: ['return Ya(my);'] },
  'shared-18-Cfqwgjc5.js#Iy': { name: 'useCoworkGuestPassStatus', from: V4, features: ['An("cowork_referrals")', 'Gh(vi.CLAUDE_CODE_GUEST_PASS, "cowork", o)', '{ show: !1, isPending: !1 }'] },
  'shared-212-BHMAi0oa.js#EB': { name: 'useReferralEligibility', from: V4, features: ['/referral/eligibility?campaign='] },
  'shared-212-BHMAi0oa.js#kB': { name: 'useReferralRedemptions', from: V4, features: ['/referral/redemptions?campaign='] },
  'shared-92-BOgyxePb.js#iO': { name: 'useOrgQuery', from: V4, features: ['queryKey: ["org", e],', 'enabled: !!e,'] },
  'shared-92-BOgyxePb.js#fD': { name: 'useCoworkRemoteDevices', from: V4, features: ['{ enabled: t, forRemoval: n } = e,', 's = !!i && t,'] },
  'shared-92-BOgyxePb.js#_D': { name: 'useCoworkRemoteDeviceRemoval', from: V4, features: ['/cowork/remote_devices/${encodeURIComponent(e.id)}', 'a((e) => e.filter((e) => e.id !== n.id)),'] },
  'shared-92-BOgyxePb.js#hD': { name: 'useCoworkRemoteDeviceUpdate', from: V4, features: ['/cowork/remote_devices/${encodeURIComponent(e.id)}', 'r((e) => e.map((e) => (e.id === n.id ? { ...e, ...t } : e))),'] },
  'shared-92-BOgyxePb.js#zO': { name: 'useOrgSettingsMutation', from: V4, features: ['"PUT", {', 'o = BO[t ?? "organization"];'] },
  'shared-36-fqRFYwOb.js#Uy': { name: 'useThisDeviceRowId', from: V4, features: ['return Wy(e === void 0 || e).rowId;'] },
  // Generic hooks routines-shared adapts for the same bindings.
  'vendor-intl-BJgYK7RA.js#q': { name: 'useIntl', from: RS, features: ['return (Mt(e), e);'] },
  'vendor-intl-BJgYK7RA.js#Gt': { name: 'FormattedMessage', from: RS, features: ['var Gt = a(Wt, Ut);'] },
  'shared-62-DoCqVpIq.js#rP': { name: 'useErrors', from: RS, features: ['"Must be called within ErrorsProvider"'] },
  'shared-62-DoCqVpIq.js#OT': { name: 'useAnalytics', from: RS, features: ['return ZS;'] },
  'shared-25-D-aF0gt9.js#Z': { name: 'useCurrentAccount', from: RS, features: ['"Must call inside CurrentAccountProvider"'] },
  'shared-25-D-aF0gt9.js#ko': { name: 'useFeatureIsOn', from: RS, features: ['return go(J1($, 0, e) ? K1($, 0, e, H(e)) : $[1]).on;'] },
  'vendor-query-Bl2Kfzgk.js#J': { name: 'useQueryClient', from: RS, features: ['"No QueryClient set, use QueryClientProvider to set one"'] },
  // The settings deep-link highlight (c2d87f9e7 o) clears its search param through the history (code-routines-v4 adapts it).
  'shared-183-B2N6Zy4J.js#pj': { name: 'removeSearchParams', from: CR, features: ['t.searchParams.has(r) && (t.searchParams.delete(r), (n = !0));', 'window.history.replaceState(i, "", t.pathname + t.search + t.hash),'] },
};
// Reviewed pins: raw declaration sha256 of every adapted original.
export const ADAPTER_PINS = {
  'shared-0-CnnWnVrT.js#FH': '48c5ac390eae53e7b9a93536657c342305c74ce97cafa85a7f0f17dd88cbec31',
  'shared-123-1Hc1RTKl.js#Wy': 'f9f822e9dd297874319ee95423cc28aff8172e64de73a612ace84121b9373574',
  'shared-18-Cfqwgjc5.js#Fy': 'b91f3ffd6a61f7180ce4f1e892a2fb6b6a44384ce9f6794e16590b281dad56c8',
  'shared-25-D-aF0gt9.js#uQ': '9ed90609ce47b0cd658265f59edf0a0cdb223ebc6e3c5bd2a47279b92cb235e3',
  'shared-62-DoCqVpIq.js#NA': '079922ed3269ce9c6aefb28cc8bc1f802aeac5f2727e2e9b1f1ec1a06495bd9c',
  'shared-18-Cfqwgjc5.js#Ny': '357fa60bc8917543dde7a8123e850f4b47def385f205f75bf3c54b29ba41db12',
  'shared-18-Cfqwgjc5.js#My': '0e88ee9041de72462714fdafda90a32a895caae9a03ee9cf80de386570599830',
  'ce61829b3-DN3TmwtQ.js#n': 'd297f5137e7182c013dd4b9b2007a1655d00ffa0c47ed4dc1b452c94bde5baca',
  'ce3a18f86-Dmeg0yYT.js#r': '7ae27883a18b3dfbd5928310fda8698187c7526e39ba2d171978bdf9528e8957',
  'shared-18-Cfqwgjc5.js#by': '7bf626b2a5ce9cbc3edb5a1855a223f6a0cf1b615473df7d2540339c03ca4a8a',
  'shared-18-Cfqwgjc5.js#yy': '204849ffdd964aa623a3c558d1ebd46b869e59883f906124facfaadecf42ec85',
  'shared-123-1Hc1RTKl.js#nM': '4135a2896989af986f0f97698fb719cd1de1c286d177ad93826c36f98646a206',
  'shared-123-1Hc1RTKl.js#bA': 'fbca1e7c77d2ab75110a79b25989b8455d970c5d22b1d9fcf5948ea6db3fad64',
  'shared-123-1Hc1RTKl.js#ay': 'd1d02a476338ee9aba111dc7fd7dc39669d07b12343b7f66c44c1ee5c1dd3817',
  'shared-0-CnnWnVrT.js#kO': '41558d66b16d4d1780b17591cd0be3fb956cf7321ecb3b21753b5818d6925fbd',
  'shared-25-D-aF0gt9.js#Bi': '3383b48d9b1bd92c0a2024ed43dd902c7e05ec87d743f8d1e84ddeda0dfdb9f5',
  'shared-25-D-aF0gt9.js#zi': 'd8412a9a12c1d7fd82d2170a77208864477fc034382d40064354021238b2ef20',
  'shared-1-D1bGaTaN.js#jE': 'dcbce172d6516093634333e97f0d902271266684d5b7a1845765b549ad82d95a',
  'shared-0-CnnWnVrT.js#jO': '43d398a4b4571405a48f07a37269f37f5e8826ff4c2bf06a344ec201e1ca236f',
  'ced6780ff-BmLhI5uX.js#ye': '9269203c2ae6e906fcd9225ffe67df8ce53fbdc0e9aa7f92c08f0e3add211ba6',
  'shared-0-CnnWnVrT.js#MO': '2c427ff631a2be92c88b0465da3460becef04e54589689c59e5386b181a9d611',
  'shared-183-B2N6Zy4J.js#y$': 'a6993ab9f0751421cdd7e0c534af936ca0445a91659a4bf98fb230cf87b6636b',
  'shared-183-B2N6Zy4J.js#NY': '63df1b5cf2234b0f86bb30d90ab55aef18343fb2467264167b6f6d24671e7e71',
  'shared-1-D1bGaTaN.js#K$': 'd833a49cd6bad0119454f0f010aa0fda2462880a99f154a41b5d97f6ee34bdaa',
  'shared-18-Cfqwgjc5.js#ZV': 'fa32aeb8d9ad5ab44091391e6bd2d902f64faf01f6c7d44802a18396fa76a6dc',
  'shared-18-Cfqwgjc5.js#UV': '40e7612c5283211b10a0691e19124d33adb8fc444fcdeb8df70a4616d706a227',
  'shared-18-Cfqwgjc5.js#GV': '3d164d084fa5abfa6d4ec437e81d0101b8c420ef304774765199edee6ee3a9af',
  'shared-18-Cfqwgjc5.js#u1': '809a17118b129fe7bf6c2c0b44c559f714a58adc466c14fa2ddd3773fc60b10c',
  'shared-18-Cfqwgjc5.js#eH': '9fea0d8466ad269577fefcd7f3437f0c0203d87175413d026078769e9e35ba18',
  'shared-26-B-POtn5S.js#ig': '130905919eaa05aff5cba27e82b11a5ed83470bd7b0fb0793c6acb4ac6fcb043',
  'shared-18-Cfqwgjc5.js#RA': '065f42526bd9a58db0137aeee866f07227cd9e4c145c9b532e7739d663a6be3f',
  'shared-18-Cfqwgjc5.js#wA': '9ce26efcf18fba159439dc905f1f350456336ca319be6fd4ce31135ace6f0386',
  'shared-18-Cfqwgjc5.js#Ey': '918082b9f6c58e4801eee4d92b1c5bfb25a64c88dc5d0f1d977de3c8850d3920',
  'shared-18-Cfqwgjc5.js#hy': '521d2d84ec6e5a6254f6b958009beddcac5b2d670416287811041fac51597c4c',
  'shared-18-Cfqwgjc5.js#Iy': '3f65254fde8a0d7cebfb84046d6e4c48f657d6172f3739a95a1ccfa32b81c141',
  'shared-212-BHMAi0oa.js#EB': 'a642745fe8ad4d8dd8f0c34aafe8d80788dd0d2aba03c95774f0d563423d18f4',
  'shared-212-BHMAi0oa.js#kB': '0144dbebadd49e22d652a78c075271bdced96c29aefdc90ff3fc7f7cc8ec56df',
  'shared-92-BOgyxePb.js#iO': '4430c7afdf8f383c449ba18f3f799a07f30fe7cfae098544ffa5fad27b8832ca',
  'shared-92-BOgyxePb.js#fD': 'bfdcf83ff799e861f4d4debbd79e0782713d63c8a9e74aecf020276260b76716',
  'shared-92-BOgyxePb.js#_D': '49c758fa5e155632dbbab4488d469abb513fd8ef41d14d6bc9190cf7a189d5ff',
  'shared-92-BOgyxePb.js#hD': '8ad675534d2eb312f425110b0b1be91bafdb91c83c5b4e3b138158b28b6023cc',
  'shared-92-BOgyxePb.js#zO': '352d6e066fcc6d0c501a116a8b617efcf0412ba690cc5384d243c6849f6d410b',
  'shared-36-fqRFYwOb.js#Uy': '704976663972bb1db091157bd36f255170fa95ce469eb369e5ddcda8ec51ca4c',
  'vendor-intl-BJgYK7RA.js#q': 'edf793bc7b87ae9a38cea39d25d752a5bcfef1d492e06a2219e120311feaaec0',
  'vendor-intl-BJgYK7RA.js#Gt': 'bde2ec1630e0a679fa4135cf75389568e77fa98fdcb08519af8104d5306ff5b5',
  'shared-62-DoCqVpIq.js#rP': '8cc2e61ff0e38fe5049f326f836c21d0376246138aa501f16e392a882f9a8129',
  'shared-62-DoCqVpIq.js#OT': '3c633717a8860b212c950b6eae2980d9f443be740871672219540c921d1525e1',
  'shared-25-D-aF0gt9.js#Z': '65456efed4ffae1a16e739336c231a59f0f8fd4f0523de0d58b1ae8c18f0eb74',
  'shared-25-D-aF0gt9.js#ko': 'e464cf91ab4b3e69b54bd9ab46a2b248691395fd4fb7d28be593006226268ffa',
  'vendor-query-Bl2Kfzgk.js#J': 'b652c920065319f48f18f05f98b39dea44d10fe1641c124529c1d611126d4c70',
  'shared-183-B2N6Zy4J.js#pj': '0fbf2c270e26c9bc6f77b27cdd3d538abb485bc308632487a315029ad728b030',
};
for (const key of Object.keys(HOST_ADAPTERS)) if (ADAPTER_PINS[key] === undefined && !process.argv.includes('--locate')) throw Error(`adapter ${key}: no reviewed pin`);

// Pure bindings a linked area slices without exporting, cut again here (runSlicer linkedCopies: chunk#local -> why).
const linkedCopies = {
  'shared-4-C_EiQb9h.js#Qm': 'pure: reads claude_code_trusted_devices_required off an organization settings object (frame-sidebar-nav slices it unexported)',
  // cds-integrate wave 8a (R4-K1 addendum A, identity family): shared-92 od is the cds-core publicName identity_shared92_od,
  // linked from cds-core, no longer a copy cut here (was: 'shared-92-BOgyxePb.js#od': 'pure: the frozen idle-queue key table
  // (a literal object of numbers; frame-sidebar-nav slices it unexported)').
  // cds-core wave 8: frame-sidebar-nav no longer slices shared-62 SO (its closure left with the removed host boundaries),
  // so SO is this graph's own cut, not a copy of a linked area's binding (was: 'shared-62-DoCqVpIq.js#SO': 'pure: maps an
  // API error to its read-state kind through FD (frame-sidebar-nav slices it unexported)').
  // cds-integrate wave 8a (R4-K1 addendum A): shared-0 Q / Z are the cds-core publicNames identity_shared0_Q / identity_shared0_Z,
  // linked from cds-core, no longer copies cut here (was: 'shared-0-CnnWnVrT.js#Q': 'pure: the literal "blocked_by_platform"
  // feature status (frame-sidebar-nav slices it unexported)', 'shared-0-CnnWnVrT.js#Z': 'pure: the literal "available" feature
  // status (frame-sidebar-nav slices it unexported)').
  'shared-0-CnnWnVrT.js#G0': 'pure: builds the feature status object for a status string through the W0 cache it imports (frame-sidebar-nav slices it unexported)',
  'shared-25-D-aF0gt9.js#EZ': 'pure: the string "org_member_display_info" (frame-sidebar-nav slices it unexported)',
  'shared-183-B2N6Zy4J.js#Ng': 'pure: the string "cowork_backend", the deep-link param value (settings-nav slices it unexported)',
};

// Order matters (runSlicer: a later area that exports a binding wins): routines-shared-v4 last, as the common owner.
const LINKED_AREAS = ['frame-sidebar-nav', 'settings-nav', 'cowork-scheduled-v4', 'routines-shared-v4'];
const target = file => `${/^(shared-\d+|shared-frame|vendor-[a-z]+|c[0-9a-f]+)-/.exec(file)[1]}.mjs`;
// The chunks the closure enters, one generated module each (listing a chunk the closure never enters, or entering one not
// listed, stops generation). Found with --dry-run (WORKING_LINE_EXPLORE=1).
const CHUNKS = [
  'c79197f2b-BIMApRGi.js', 'cabd7b1c1-CAF7rZLU.js', 'cdc95db1a-Dwi18fP3.js', 'ced6780ff-BmLhI5uX.js', 'cfea69990-Cqha5dsf.js', 'cbef3b9e7-CCVzzPIb.js',
  'c03547424-CImlgKdT.js', 'c2d87f9e7-Bk6d74Ey.js', 'ceb743c6e-B7-skoHD.js', 'c1a6ffa56-CiGeKxhE.js', 'c095a1b43-TnOKf0P3.js', 'c7555a239-oS56sWci.js',
  'c56e0b5dd-CmHuWVX-.js', 'cfd4cc7c0-CdtTXAlA.js', 'ceec168b4-CPsbfBwG.js', 'c8fc92342-DaR6oJaG.js', 'cee6df3f4-D3si2fZf.js',
  'shared-0-CnnWnVrT.js', 'shared-1-D1bGaTaN.js', 'shared-4-C_EiQb9h.js', 'shared-8-BqfCbkJd.js', 'shared-18-Cfqwgjc5.js', 'shared-25-D-aF0gt9.js',
  'shared-33-DtdykY0y.js', 'shared-62-DoCqVpIq.js', 'shared-92-BOgyxePb.js', 'shared-123-1Hc1RTKl.js', 'shared-153-DMw2VzSq.js', 'shared-183-B2N6Zy4J.js',
  'shared-frame-CJdE5Ria.js',
];
const modules = [
  ...Object.entries(ROOTS).map(([file, roots]) => ({
    source: file, target: target(file), internal: Object.values(roots).some(r => r.export === null),
    exports: Object.fromEntries(Object.entries(roots).map(([local, r]) => [local, r.name])),
    features: Object.fromEntries(Object.entries(roots).map(([local, r]) => [local, r.features])),
  })),
  ...CHUNKS.map(source => ({ source, target: target(source) })),
];

// Pinned on the minified bytes (each exactly once): where the page is mounted, its section order on this computer and on
// the web, which chunk export each section is, the closed branches the host answers lead to, and the settings nav / search
// entries of the page.
const rawCallSites = [
  { source: 'cc011544b-CT2WxCJo.js', role: 'The settings page loader: the Cowork section is the default export of this chunk',
    features: ['cowork:Q("cowork",()=>e(()=>import("./c71860c77-iq75iE8v.js"),__vite__mapDeps([0,1])))'] },
  { source: PAGE, role: 'W (the default export) mounts Q with the held deep link once the page is not folded into Account / General settings',
    features: ['e(Q,{deepLinkHeld:r})', 'export{W as default,w as useShowCoworkPageInPersonalSettings}'] },
  { source: PAGE, role: 'Q on this computer: trusted devices, the device list, then (enableAdditionalDirectoriesClaudeMd) the empty slot, Dispatch and Cowork files on this device, Trusted folders, the backend toggle, the browser group on this device, the guest pass, Global instructions or the account import',
    features: ['children:[e(V,{}),_&&e(B,{}),_&&e(z,{}),e(I,{}),e(F,{}),_&&e(H,{}),e(k,{}),p&&e(M,{}),g&&e(N,{})]', 't("main",{className:"flex flex-col gap-7",children:[v,y,b]})',
      'p=u&&f,g=u&&!f,_=h().onThisDevice'] },
  { source: PAGE, role: 'Q on the web (not taken in the desktop app) and the locked notice when Cowork is off for the organization',
    features: ['children:[n,r,a,o,s,c]', 'headline:e(E,{defaultMessage:"Cowork isn\\u2019t enabled for your organization",id:"xtNPaNIMLT"})'] },
  { source: PAGE, role: 'Section exports: c79197f2b n He (guest pass) / r Be (device list) / t Ge (trusted devices), ced6780ff n be (Global instructions) / t Ue (import), cabd7b1c1 a J (Preferred browser) / r ee (backend toggle) / t se (Trusted folders), cdc95db1a n f (Open links) / t p (Allowed sites), cfea69990 n P (Cowork files) / t R (Dispatch)',
    features: ['import{n as k,r as A,t as j}from"./c79197f2b-BIMApRGi.js"', 'import{n as M,t as N}from"./ced6780ff-BmLhI5uX.js"', 'import{a as P,r as F,t as I}from"./cabd7b1c1-CAF7rZLU.js"',
      'import{n as L,t as R}from"./cdc95db1a-Dwi18fP3.js"', 'import{n as z,t as B}from"./cfea69990-Cqha5dsf.js"'] },
  { source: 'cfea69990-Cqha5dsf.js', role: 'Dispatch reads the LocalAgentModeSessions sessions bridge and hides itself while it has no answer (c === null)',
    features: ['read:p?.getSessionsBridgeEnabled,write:p?.setSessionsBridgeEnabled,errorSource:"dispatch_sessions_bridge_toggle"', '!r&&!_||!a||c===null||o&&!b)return null',
      '{defaultMessage:"Dispatch",id:"MIchTR1xRO"}'] },
  { source: 'cfea69990-Cqha5dsf.js', role: 'Cowork files needs the CoworkUserFiles bridge (getInfo)', features: ['if(!f||!m?.getInfo||!y)return null'] },
  { source: 'shared-55-BRv2XBP7.js', role: 'Settings nav: the Cowork entry, icon Nh (Tasks)',
    features: ['e.push({id:"cowork",href:"/settings/cowork",label:t,name:o.formatMessage({defaultMessage:"Cowork",id:"+MH0VdRCHz"}),icon:Nh})', 'Nh={name:"Tasks"'] },
  { source: 'ca25db325-CVWdSFl1.js', role: 'Settings search index: the Cowork page rows',
    features: ['{section:"cowork",label:{defaultMessage:"Global instructions",id:"53DiPrdI5r"},coworkInstructionsEditor:!0}',
      '{section:"cowork",label:{defaultMessage:"Cowork files",id:"ciLKOe5nmN"},desktopOnly:!0,localSessionRow:!0}',
      '{section:"cowork",label:{defaultMessage:"Trusted Cowork folders",id:"5UZ7woP+0X"},hideCoworkLabel:"12iymmb",desktopOnly:!0}',
      '{section:"cowork",label:{defaultMessage:"Preferred browser",id:"cGSF0vB/eU"},localSessionRow:!0}'] },
];

const declarations = src => [...new Set([...src.top.values()].filter(entry => entry.kind !== 'import'))];
const rawText = (src, entry) => src.code.slice(entry.node.start, entry.node.end);
async function carries(src, entry, features) {
  try { assertFeatures('', await featureText(src, entry), features); return true; } catch { return false; }
}

// AST location of the root (unique declaration carrying its features, under the reviewed local, export alias as
// reviewed, raw declaration sha256 as pinned).
export async function locateRoots(cache = new Map()) {
  const found = [];
  for (const [file, roots] of Object.entries(ROOTS)) {
    const src = await readSource(file, cache, official.ionSource);
    for (const [local, spec] of Object.entries(roots)) {
      const hits = [];
      for (const entry of declarations(src)) if (rawText(src, entry).includes(spec.probe) && await carries(src, entry, spec.features)) hits.push(entry);
      if (hits.length !== 1) throw Error(`${file} ${local} (${spec.name}): ${hits.length} top-level declarations carry its features, expected 1`);
      const names = [...src.top].filter(([, entry]) => entry === hits[0]).map(([name]) => name);
      if (!names.includes(local)) throw Error(`${file}: the declaration carrying ${spec.name}'s features is ${names.join(', ')}, not ${local}`);
      const alias = [...src.exported].find(([, l]) => l === local)?.[0] ?? null;
      if (alias !== spec.export) throw Error(`${file}#${local}: export alias ${alias}, reviewed ${spec.export}`);
      const declarationSha256 = sha(rawText(src, hits[0]));
      const pin = ROOT_PINS[`${file}#${local}`];
      if (pin === undefined) throw Error(`${file}#${local}: no reviewed pin`);
      if (pin !== null && pin !== declarationSha256) throw Error(`${file}#${local}: declaration ${declarationSha256} differs from the reviewed pin ${pin}`);
      found.push({ file, local, name: spec.name, export: alias, declarationSha256, pinned: pin !== null });
    }
  }
  return found;
}

// Every adapted original: a declaration of its chunk carrying its features, its raw sha256 as pinned.
export async function pinAdapters(cache = new Map()) {
  const out = [];
  for (const [key, spec] of Object.entries(HOST_ADAPTERS)) {
    const [file, local] = key.split('#');
    const src = await readSource(file, cache, official.ionSource);
    const entry = src.top.get(local);
    if (!entry || entry.kind === 'import') throw Error(`adapter ${key} is not a declaration`);
    assertFeatures(`adapter ${key}`, await featureText(src, entry), spec.features);
    const declarationSha256 = sha(rawText(src, entry));
    const pin = ADAPTER_PINS[key] ?? null;
    if (pin !== null && pin !== declarationSha256) throw Error(`adapter ${key}: declaration ${declarationSha256} differs from the reviewed pin ${pin}`);
    out.push({ original: key, name: spec.name, hostAdapter: spec.from, declarationSha256, pinned: pin !== null });
  }
  return out;
}

// The adapter module exports exactly the adapted names (plus the host page's provider pair), and every re-exported name
// comes from the host adapter that documents it.
const HOST_PAGE_EXPORTS = ['CoworkSettingsHostProvider', 'useCoworkSettingsHostValue'];
async function assertAdapterModule() {
  const text = await fs.readFile(path.join(root, ADAPTER_FILE), 'utf8');
  const exported = new Map();
  for (const m of text.matchAll(/export \{([^}]*)\} from '\.\/([\w.-]+)';/g))
    for (const name of m[1].split(',').map(s => s.trim()).filter(Boolean)) exported.set(name, `src/${m[2]}`);
  for (const m of text.matchAll(/^export (?:const|function) ([\w$]+)/gm)) exported.set(m[1], ADAPTER_FILE);
  const wanted = new Map(Object.values(HOST_ADAPTERS).map(a => [a.name, a.from]));
  for (const [name, from] of wanted) if (exported.get(name) !== from) throw Error(`${ADAPTER_FILE}: ${name} is not exported from ${from} (${exported.get(name) ?? 'missing'})`);
  for (const name of exported.keys()) if (!wanted.has(name) && !HOST_PAGE_EXPORTS.includes(name)) throw Error(`${ADAPTER_FILE}: ${name} is not an adapter of this graph`);
  for (const [name, from] of wanted) {
    if (from === ADAPTER_FILE) continue;
    const host = await fs.readFile(path.join(root, from), 'utf8');
    if (!new RegExp(`export (?:const|function|async function) ${name.replace(/\$/g, '\\$')}\\b|export \\{[^}]*\\b${name}\\b[^}]*\\}`).test(host)) throw Error(`${from} does not export ${name}`);
  }
}

async function cdsCorePin() {
  const now = sha(await fs.readFile(path.join(generatedRoot, 'cds-core/manifest.json')));
  if (now !== CDS_CORE_MANIFEST_SHA256)
    throw Error(`cds-core manifest is ${now}, not the reviewed ${CDS_CORE_MANIFEST_SHA256}: re-run, review the cowork-settings-v4 closure and update CDS_CORE_MANIFEST_SHA256`);
  return now;
}

export function coworkSettingsV4Config() {
  return {
    name: 'cowork settings (4.16336.0)', generator: 'extract-cowork-settings-v4.mjs', output: path.join(root, COWORK_SETTINGS_V4_OUTPUT),
    adapterModule: '../../source-cowork-settings-v4-adapters.jsx', adapterFile: ADAPTER_FILE, adapters: {},
    localAdapters: Object.fromEntries(Object.entries(HOST_ADAPTERS).map(([key, a]) => [key, { name: a.name, features: a.features }])),
    modules, rawCallSites, linkedCopies, sharedGraph: 'cds-core', generatedRoot, sourceContract: official, linkedAreas: LINKED_AREAS,
    referenceVersion: official.referenceVersion, referenceSnapshot: official.referenceSnapshot, source: official.ionSource,
    vendor: { [official.vendorFrame]: official.reactAliases },
  };
}
export const probeConfig = coworkSettingsV4Config;

export async function extractCoworkSettingsV4({ check = false, dryRun = false } = {}) {
  const cdsCore = await cdsCorePin();
  const cache = new Map();
  const roots = await locateRoots(cache);
  const adapters = await pinAdapters(cache);
  for (const r of roots) if (!r.pinned) throw Error(`root ${r.file}#${r.local}: unpinned (review it with --locate)`);
  for (const a of adapters) if (!a.pinned) throw Error(`adapter ${a.original}: unpinned (review it with --locate)`);
  await assertAdapterModule();
  const linked = {};
  for (const area of LINKED_AREAS) linked[area] = sha(await fs.readFile(path.join(generatedRoot, area, 'manifest.json')));
  const cfg = {
    ...coworkSettingsV4Config(),
    async artifacts(m) {
      return {
        'index.mjs': `// Semantic names for the cowork-settings roots (${official.referenceVersion}); generated by extract-cowork-settings-v4.mjs.\n`
          + Object.entries(ROOTS).map(([file, rs]) => `export { ${Object.keys(rs).map(l => `${rs[l].name}`).join(', ')} } from "./${target(file)}";`).join('\n') + '\n',
        'provenance.json': JSON.stringify({
          referenceVersion: official.referenceVersion, referenceSnapshot: official.referenceSnapshot, generator: 'scripts/extract-cowork-settings-v4.mjs',
          previous: { generator: 'scripts/extract-cowork-settings.mjs', output: 'src/generated/cowork-settings', referenceVersion: official.previousVersion,
            root: 'c71860c77-CKIsHnA3.js#De', removedSections: ['c71860c77 me (Memory: "Use memory in sessions")'] },
          isolatedGraph: { productionOutput: 'src/generated/cowork-settings', productionSwitchNotBeforeBatch: 9 },
          sharedGraph: { area: 'cds-core', manifestSha256: cdsCore }, linkedAreas: linked,
          roots, adapters, linkedCopies,
          imports: m.modules.flatMap(mod => mod.imports.filter(i => i.kind !== 'generated').map(i => ({ module: mod.target, local: i.local, kind: i.kind, from: i.from, name: i.name, via: i.via }))),
        }, null, 2) + '\n',
      };
    },
  };
  return runSlicer(cfg, { check, dryRun });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.includes('--locate')) {
    for (const f of await locateRoots()) console.log('root', `${f.file}#${f.local}`, f.declarationSha256, f.pinned ? 'pinned' : 'UNPINNED');
    for (const a of await pinAdapters()) console.log('adapter', a.original, a.declarationSha256, a.pinned ? 'pinned' : 'UNPINNED');
  } else await extractCoworkSettingsV4({ check: process.argv.includes('--check'), dryRun: process.argv.includes('--dry-run') });
}
