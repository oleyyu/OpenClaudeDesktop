// Code current (base) 4.16336.0 roots: written by analysis/claude-4.16336.0-migrate-20261104/regions/batch3/code-current:base/tools/gen-roots.mjs
// from the 3.6556.2 graph (src/generated/code-current exports), the old-to-new map and the manual decisions recorded there.
// Features are the official 4.16336.0 raw declaration text (looseFeature head / tail); a drifted chunk fails, never re-pins.
// The hand section (adapters, linked areas, globals) is kept between its markers when this file is rewritten.
// BEGIN HAND
const HOST_GLOBALS = new Set(['window', 'document', 'globalThis', 'global', 'self', 'navigator', 'performance', 'queueMicrotask', 'requestAnimationFrame',
  'cancelAnimationFrame', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Promise', 'Symbol', 'Object', 'Array', 'Map', 'Set',
  'WeakMap', 'WeakSet', 'WeakRef', 'Math', 'Number', 'String', 'Boolean', 'Date', 'JSON', 'Error', 'TypeError', 'RangeError', 'RegExp', 'Infinity', 'NaN',
  'undefined', 'Intl', 'URL', 'Reflect', 'Proxy', 'console', 'isNaN', 'isFinite', 'parseInt', 'parseFloat', 'encodeURIComponent', 'decodeURIComponent',
  'getComputedStyle', 'matchMedia', 'CSS', 'Element', 'HTMLElement', 'Node', 'DOMException', 'ResizeObserver', 'MutationObserver',
  'IntersectionObserver', 'AbortController', 'Event', 'KeyboardEvent', 'CustomEvent', 'DataTransfer', 'File', 'Blob', 'Uint8Array', 'BigInt',
  'arguments', 'NodeFilter', 'TextDecoder', 'TextEncoder', 'ArrayBuffer', 'DataView', 'Int32Array', 'Uint16Array', 'setImmediate',
  'MessageChannel', 'CompositionEvent', 'localStorage', 'StorageEvent', 'indexedDB']);
const HAND = {
  label: 'Code current (base) 4.16336.0',
  sharedGraph: 'cds-core',
  // code-composer-v4 (cds-core wave 5b, region-changes code-current.link-code-composer): it owns shared-2 hm (the grapheme
  // splitter) and its lazily built Intl.Segmenter mm; code-current links hm from its chunk-shared-2.mjs instead of a copy.
  linkedAreas: ['routines-shared-v4', 'r3b-tasks', 'code-composer-v4'],
  isolatedGraph: { legacyOutput: 'src/generated/code-current', productionSwitchNotBeforeBatch: 11,
    heldBy: ['code-current:upper', 'code-transcript', 'files-changes', 'pierre-changes', 'session-rail', 'session-rail-changes', 'session-rail-kit',
      'sessions-page', 'sidebar-hover-card', 'sidebar-reorder', 'sidebar-routines', 'sidebar-sections', 'transcript-rows'] },
  adapterModules: [],
  // Import-level host answers (file -> export alias -> { name, module, features on the original's same-chunk closure)).
  // vendor-prosemirror exports K = w (Selection), J = T (TextSelection), G = Rn (PluginKey).
  // vendor-prosemirror: the composer edits a host EditorState built from the prosemirror-state package, so its selection
  // and plugin-key classes are that package's (as in 3.6556.2), never a second bundled copy (instanceof / jsonID registry).
  adapters: {
    'vendor-prosemirror-Cl8idfV9.js': {
      K: { name: 'Selection', module: 'prosemirror-state', features: ['"Invalid input for Selection.fromJSON"', '"Duplicate use of selection JSON ID "'] },
      J: { name: 'TextSelection', module: 'prosemirror-state', features: ['"Invalid input for TextSelection.fromJSON"', '{type:"text",anchor:this.anchor,head:this.head}'] },
      G: { name: 'PluginKey', module: 'prosemirror-state', features: ['constructor(e="key"){this.key=Ln(e)}', 'e.config.pluginsByKey[this.key]'] },
    },
  },
  localAdapters: {},
  hostGlobals: HOST_GLOBALS,
};
// END HAND

const MODULES = [
 {
  "target": "electron-side-session-prompt.mjs",
  "source": "asar/index.chunk-DZWftBCb.js",
  "electron": "electron/generated/side-session-prompt.mjs",
  "exports": {
   "Ar": "sideSessionPrompt"
  },
  "aliases": {
   "Ar": null
  },
  "features": {
   "Ar": [
    "function Ar(e,t={}){let{userFork:n=!1,btw:r=!1,canStartSessions:i=!1,sharesCheckout:a=!1,canListSessions:o=!0}=t,s=/^local_[A-Za-z0-9-]+$/.test(e);if(n&&r)return`\\n\\n## The user forked this session from another session\\n\\nThe user forked this session at this point to ask something on the side; continue from here on whatever they ask. Nothing you say here is reported automatically to ${s?`\\`${e}\\`, `:\"\"}the original",
    "}"
   ]
  },
  "previous": {
   "Ar": "index.chunk-DBIg6EBr.js#Ey"
  }
 },
 {
  "target": "csv-parser.mjs",
  "source": "c02d6193d-Dn8Hnwz8.js",
  "exports": {
   "A": "parseCsvPreview"
  },
  "aliases": {
   "A": "t"
  },
  "features": {
   "A": [
    "function A(e,t){let n=e.length>x,r=S(n?e.slice(0,x):e,t),i=e;if(n){let t=D(e,x,r);i=e.slice(0,t>0?t:k(e,x))}let a=/\\r(?!\\n)/.test(i)?void 0:[`\\r\n`,`\n`],o=O(i,r,a),s=!1;if(o===\"ends_in_quoted_field\"){let e=D(i,i.length,r);e>0&&e<i.length&&(o=O(i.slice(0,e),r,a),s=!0)}if(typeof o==\"string\")return{kind:\"error\"};if(o.length===0)return s?{kind:\"error\"}:{kind:\"empty\"};let c=n||s||o.length>v,l=o.slice(0,v),u=C(l),d=0,f=!1;for(let e of l)e.length>y&&(f=!0),d=Math.max(d,Math.min(e.length,y));let p=!1,m=e=>{let t=String(e);return t.length>b?(p=!0,`${t.slice(0,k(t,b))}\\u2026`):t};return{kind:\"ok\",parsed:{rows:l.map(e=>{let t=[];for(let n=0;n<d;n++)t.push(m(e[n]??\"\"));return t}),hasHeader:u,rowsTruncated:c,colsTruncated:f,cellsTruncated:p}}}"
   ]
  },
  "previous": {
   "A": "c02d6193d-C2yr-dVD.js#m"
  }
 },
 {
  "target": "csv-model.mjs",
  "source": "c02d6193d-Dn8Hnwz8.js",
  "exports": {
   "r": "v",
   "a": "b",
   "p": "E",
   "m": "re",
   "h": "ie",
   "g": "ae",
   "_": "oe"
  },
  "aliases": {
   "r": "o",
   "a": "i",
   "p": null,
   "m": "r",
   "h": "c",
   "g": "s",
   "_": "a"
  },
  "features": {
   "r": [
    "function r(e){return/^(?:|[-\\u2014\\u2013]|n\\/?a|null|nan|none)$/i.test(e.trim())}"
   ],
   "a": [
    "function a(e,t=!1){let n=e.trim(),r=i.exec(n);if(r===null)return NaN;let[,a=\"\"]=r,s=n.startsWith(\"(\")&&n.endsWith(\")\"),c=/[kK]$/.test(n)?1e3:/[mM]$/.test(n)?1e6:/[bB]$/.test(n)?1e9:1,l=o(n.replace(a,\"\").replace(/[^\\d.,-]/g,\"\"),a!==\"\",t);if(l===null)return NaN;let u=Number.parseFloat(l+a.replace(\"\\u2212\",\"-\"))*c;return s?-u:u}"
   ],
   "p": [
    "function p(e){let t=e.trim(),n=u.exec(t);if(n){let[e,r,i,a,o=\"0\",s=\"0\",c=\"0\",l=\"0\"]=n;return/(?:Z|[+-]\\d{2}:?\\d{2})$/.test(t)&&e.length<t.length?Date.parse(t):new Date(Number(r),Number(i)-1,Number(a),Number(o),Number(s),Number(c),Number(l.slice(0,3).padEnd(3,\"0\"))).getTime()}return d.test(t)?Date.parse(t.replace(f,\"$1\")):NaN}"
   ],
   "m": [
    "function m(e,t){let n=!0,i=!0,o=0;for(let s of e){let e=s[t]??\"\";if(!r(e)&&(o+=1,n&&=Number.isFinite(a(e)),i&&=Number.isFinite(p(e)),!n&&!i))return\"text\"}return o===0?\"text\":n?\"number\":\"date\"}"
   ],
   "h": [
    "function h(e,{column:t,direction:n},i,o){let s=n===\"asc\"?1:-1,l=e.map((e,t)=>t);if(i===\"text\"){let n=new Intl.Collator(o,{numeric:!0,sensitivity:\"base\"}),i=e.map(e=>{let n=e[t]??\"\";return r(n)?null:n.trim()});return l.sort((e,t)=>{let r=i[e]??null,a=i[t]??null;return r===null||a===null?r===a?e-t:r===null?1:-1:n.compare(r,a)*s||e-t})}let u=i===\"number\"&&c(e,t),d=i===\"number\"?e=>a(e,u):p,f=e.map(e=>d(e[t]??\"\"));return l.sort((e,t)=>{let n=f[e],r=f[t],i=Number.isNaN(n),a=Number.isNaN(r);return i||a?i===a?e-t:i?1:-1:(n-r)*s||e-t})}"
   ],
   "g": [
    "function g(e){return e.map(e=>e.join(`\n`).toLowerCase())}"
   ],
   "_": [
    "function _(e,t,n){return t.filter(t=>e[t].includes(n))}"
   ]
  },
  "reexports": {
   "ce": {
    "module": "csv-model--cd5fd9055.mjs",
    "name": "ce"
   },
   "le": {
    "module": "csv-model--cd5fd9055.mjs",
    "name": "le"
   },
   "ue": {
    "module": "csv-model--cd5fd9055.mjs",
    "name": "ue"
   }
  },
  "previous": {
   "r": "cd5fd9055-BXQRn_nx.js#f",
   "a": "cd5fd9055-BXQRn_nx.js#m",
   "p": "cd5fd9055-BXQRn_nx.js#y",
   "m": "cd5fd9055-BXQRn_nx.js#le",
   "h": "cd5fd9055-BXQRn_nx.js#ue",
   "g": "cd5fd9055-BXQRn_nx.js#de",
   "_": "cd5fd9055-BXQRn_nx.js#fe"
  }
 },
 {
  "target": "btw-focus-intent.mjs",
  "source": "c03935b01-BylKMWqe.js",
  "exports": {
   "qi": "captureBtwFocus",
   "Ji": "rememberBtwFocus",
   "Yi": "focusBtwComposer",
   "Xi": "armBtwSessionComposer",
   "Zi": "focusBtwSessionComposer",
   "Qi": "useBtwFocusIntent"
  },
  "aliases": {
   "qi": "Wn",
   "Ji": "Jn",
   "Yi": "Vn",
   "Xi": "Un",
   "Zi": "qn",
   "Qi": "Qn"
  },
  "features": {
   "qi": [
    "function qi(e){return e&&!Gi.has(e)&&(Gi.add(e),e.addEventListener(\"keydown\",Ki,!0),e.addEventListener(\"pointerdown\",Ki,!0)),performance.now()}"
   ],
   "Ji": [
    "function Ji(e,t,n){Hi.set(e,{...n,askedAt:t})}"
   ],
   "Yi": [
    "function Yi(e,t){t?.afterKeyPress&&e?.ignoreStrayEnter(),e?.scheduleFocus()}"
   ],
   "Xi": [
    "function Xi(e){Ri.get(e)?.composerRef.current?.ignoreStrayEnter()}"
   ],
   "Zi": [
    "function Zi(e,t,n){let r=Ri.get(e)?.composerRef.current;r?Yi(r,n):Ji(e,t,n)}"
   ],
   "Qi": [
    "function Qi(e){let $=J9(2),t=J1($,0,e)?K1($,0,e,()=>{let t=Hi.get(e);return Hi.delete(e),t!==void 0&&Wi<=t.askedAt+Ui?t:null}):$[1],[n]=l(t);return n}"
   ]
  },
  "previous": {
   "qi": "c03935b01-yhcY34vt.js#Kr",
   "Ji": "c03935b01-yhcY34vt.js#qr",
   "Yi": "c03935b01-yhcY34vt.js#Jr",
   "Xi": "c03935b01-yhcY34vt.js#Yr",
   "Zi": "c03935b01-yhcY34vt.js#Xr",
   "Qi": "c03935b01-yhcY34vt.js#Zr"
  }
 },
 {
  "target": "breadcrumb-within-root.mjs",
  "source": "c0a74d72b-BELp4TMv.js",
  "exports": {
   "Wa": "pathWithinRoot"
  },
  "aliases": {
   "Wa": "k"
  },
  "features": {
   "Wa": [
    "function Wa(e,t,n){let r=n?/\\//:/[\\\\/]/,i=n?/\\/+$/:/[\\\\/]+$/,a=e=>n?e:e.replace(/^[a-z]:/,e=>e.toUpperCase()),o=a(t).replace(i,\"\"),s=a(e).replace(i,\"\");return t===\"\"||s.split(r).some(e=>n?e===\".\"||e===\"..\":/^[. ]+$/.test(e))?!1:s===o||s.length>o.length&&s.startsWith(o)&&r.test(s[o.length]??\"\")}"
   ]
  },
  "previous": {
   "Wa": "c0fbbe82d-COsmfHJY.js#$r"
  }
 },
 {
  "target": "environment-menu-controls.mjs",
  "source": "c227f4d5e-DGDdGBTz.js",
  "exports": {
   "cB": "EnvironmentAction",
   "uB": "EnvironmentSettingsAction",
   "dB": "environmentOpenKey",
   "fB": "EnvironmentActionHint",
   "pB": "EnvironmentStarAction",
   "_B": "environmentSelectedProps"
  },
  "aliases": {
   "cB": null,
   "uB": "qi",
   "dB": "Yi",
   "fB": "Ki",
   "pB": "Ji",
   "_B": "Bi"
  },
  "features": {
   "cB": [
    "function cB(e){let $=J9(8),{icon:t,onPress:n,testId:r}=e,i=J1($,0,n)?K1($,0,n,e=>{e.stopPropagation(),n()}):$[1],a=J1($,2,t)?K1($,2,t,p(je,{name:t,size:\"sm\"})):$[3];return J3($,4,i,a,r)?K3($,4,i,a,r,p(\"button\",{type:\"button\",tabIndex:-1,\"aria-hidden\":!0,\"data-testid\":r,className:\"pointer-events-auto hidden size-icon shrink-0 items-center justify-center rounded-sm text-muted-as-secondary hover:bg-alpha-2 hover:text-primary touch:flex [[data-highlighted]_&]:flex group-hover/env-row:[[data-disabled]_&]:flex\",onClick:i,children:a})):$[7]}"
   ],
   "uB": [
    "function uB(e){let $=J9(2),{onOpen:t}=e;return J1($,0,t)?K1($,0,t,p(cB,{icon:\"Settings\",onPress:t})):$[1]}"
   ],
   "dB": [
    "function dB(){return V()===\"rtl\"?\"ArrowLeft\":\"ArrowRight\"}"
   ],
   "fB": [
    "function fB(e){let $=J9(3),{edit:t}=e,n=t!==void 0&&t,r=dB()===\"ArrowLeft\";return J2($,0,n,r)?K2($,0,n,r,p(\"span\",{className:\"sr-only\",children:n?r?p(Q,{defaultMessage:\", edit environment, left arrow\",id:\"BX8nZPaoon\"}):p(Q,{defaultMessage:\", edit environment, right arrow\",id:\"1KBnKkGDBN\"}):r?p(Q,{defaultMessage:\", environment settings, left arrow\",id:\"hsJqc0oVce\"}):p(Q,{defaultMessage:\", environment settings, right arrow\",id:\"LspWKNOWte\"})})):$[2]}"
   ],
   "pB": [
    "function pB(e){let $=J9(4),{starred:t,onToggle:n}=e,r=t?\"StarSlash\":\"Star\",i=t?\"env-picker-unstar\":\"env-picker-star\";return J3($,0,n,r,i)?K3($,0,n,r,i,p(cB,{icon:r,onPress:n,testId:i})):$[3]}"
   ],
   "_B": [
    "function _B(e,t,n,r){return{role:\"menuitemradio\",\"aria-checked\":e,checked:e||void 0,checkedRole:\"radio\",trailing:t||n||r?p(lB,{hint:t,badge:r,children:n}):void 0}}"
   ]
  },
  "previous": {
   "cB": "c227f4d5e-B-FYKrwT.js#B$",
   "uB": "c227f4d5e-B-FYKrwT.js#V$",
   "dB": "c227f4d5e-B-FYKrwT.js#H$",
   "fB": "c227f4d5e-B-FYKrwT.js#U$",
   "pB": "c227f4d5e-B-FYKrwT.js#W$",
   "_B": "c227f4d5e-B-FYKrwT.js#Y$"
  }
 },
 {
  "target": "mention-output-files.mjs",
  "source": "c227f4d5e-DGDdGBTz.js",
  "exports": {
   "YW": "toFileMentionOption"
  },
  "aliases": {
   "YW": null
  },
  "features": {
   "YW": [
    "function YW(e,t=ed(e.path,e.isDirectory),n=!0){let{path:r,isDirectory:i,positions:a}=e,{name:o,dir:s}=aG(r,n);return{id:`file-${t}`,label:ed(o,i),description:s||void 0,icon:i?eG:$W,category:\"Files\",metadata:{path:r,isDirectory:i,positions:a},providerId:rW,renderedText:t}}"
   ]
  },
  "previous": {
   "YW": "c227f4d5e-B-FYKrwT.js#HO"
  }
 },
 {
  "target": "environment-form-layout.mjs",
  "source": "c29df1c52-CSoo-g9g.js",
  "exports": {
   "S": "environmentBodyClass",
   "C": "EnvironmentFooter"
  },
  "aliases": {
   "S": "n",
   "C": "a"
  },
  "features": {
   "S": [
    "S=\"-mx-pad-xl flex min-h-[6rem] flex-1 flex-col gap-lg overflow-y-auto overflow-x-hidden scroll-fade-y px-xl pt-3 pb-lg supports-[min-height:calc-size(auto,size)]:min-h-[calc-size(min-content,min(size,6rem))]\""
   ],
   "C": [
    "function C(t){let $=J9(3),{align:n,children:r}=t,i=n===void 0?\"end\":n;return J2($,0,i,r)?K2($,0,i,r,e(\"div\",{className:\"-mx-pad-xl mt-auto border-t px-xl pt-lg\",children:e(c.Footer,{align:i,className:\"mt-0\",children:r})})):$[2]}"
   ]
  },
  "previous": {
   "S": "c29df1c52-CULYovxc.js#_",
   "C": "c29df1c52-CULYovxc.js#v"
  }
 },
 {
  "target": "file-index.mjs",
  "source": "c30db9bec-CdR1oH22.js",
  "exports": {
   "dr": "FileIndex"
  },
  "aliases": {
   "dr": "FileIndex"
  },
  "features": {
   "dr": [
    "dr=class{paths=[];lowerPaths=[];charBits=new Int32Array;pathLens=new Uint16Array;nameStarts=new Uint16Array;nameCharBits=new Int32Array;topLevelCache=null;matchPositions=new Int32Array(lr);nameMatchPositions=new Int32Array(lr);readyCount=0;buildGen=0;loadFromFileList(e){let t=new Set,n=[];for(let r of e)r.length>0&&!t.has(r)&&(t.add(r),n.push(r));this.buildIndex(n)}loadFromFileListAsync(e){let t=()=>{};return{",
    "y=c.length,b=Math.max(y,1),ee=Array(y);for(let e=0;e<y;e++){let t=c[e].pathIndex,r=u[t],o=d[t],s=n?r:o,l=Array(i),f=c[e].scanFrom;for(let e=0;e<i;e++){let t=s.indexOf(a[e],f);l[e]=t,f=t+1}!n&&o.length!==r.length&&vr(r,l);let p=e/b,m=r.includes(\"test\")?Math.min(p*1.05,1):p;ee[e]={path:r,score:m,positions:l}}return ee}}"
   ]
  },
  "previous": {
   "dr": "c30db9bec-CdR1oH22.js#dr"
  }
 },
 {
  "target": "environment-field-header.mjs",
  "source": "c387a4508-CajQ6Wrn.js",
  "exports": {
   "i": "EnvironmentFieldHeader"
  },
  "aliases": {
   "i": "n"
  },
  "features": {
   "i": [
    "function i(i){let $=J9(19),{id:a,label:o,optional:s,headingLevel:c,tip:l,add:u,className:d}=i,f=s!==void 0&&s,p=J1($,0,d)?K1($,0,d,n(\"flex h-[1lh] items-center justify-between gap-sm text-body leading-none\",d)):$[1],m=c===void 0?void 0:\"heading\",h=J4($,2,c,a,o,m)?K4($,2,c,a,o,m,e(\"span\",{id:a,role:m,\"aria-level\":c,className:\"font-medium text-primary\",children:o})):$[6],g=J1($,7,f)?K1($,7,f,f&&e(\"span\",{className:\"text-footnote text-muted-as-secondary\",children:e(r,{defaultMessage:\"(optional)\",id:\"d1OgEDiJnJ\"})})):$[8],_=J2($,9,h,g)?K2($,9,h,g,t(\"span\",{className:\"flex items-baseline gap-1.5\",children:[h,g]})):$[11],v=J2($,12,_,l)?K2($,12,_,l,t(\"span\",{className:\"flex items-center gap-xs\",children:[_,l]})):$[14];return J3($,15,u,p,v)?K3($,15,u,p,v,t(\"div\",{className:p,children:[v,u]})):$[18]}"
   ]
  },
  "previous": {
   "i": "c387a4508-CuXnQTW8.js#i"
  }
 },
 {
  "target": "environment-machine-variables.mjs",
  "source": "c3f9f1667-Bbz13IQQ.js",
  "exports": {
   "L": "useMachineHasVariables"
  },
  "aliases": {
   "L": "m"
  },
  "features": {
   "L": [
    "function L(e){let $=J9(6),t=F(V),r=J1($,0,t)?K1($,0,t,{has:!1,revision:t}):$[1],[a,o]=n(r),s,c;return J2($,2,t,e)?(s=()=>{if(!e||!f?.get)return;let n=!1;return f.get().then(z).catch(R).then(e=>{n||o({has:e,revision:t})}),()=>{n=!0}},c=[e,t],K3($,2,t,e,s,c)):(s=$[4],c=$[5]),i(s,c),a.has&&a.revision===t}"
   ]
  },
  "adapters": {
   "shared-0-CnnWnVrT.js": {
    "Wh": {
     "name": "localSessionEnvironment",
     "module": "../../source-environment-menu-adapters.jsx",
     "features": [
      "JO=globalThis[\"claude.web\"]?.LocalSessionEnvironment"
     ]
    }
   }
  },
  "previous": {
   "L": "c3f9f1667-DnyzRZCB.js#L"
  }
 },
 {
  "target": "document-frame.mjs",
  "source": "c3fde7009-DTvRUX3c.js",
  "exports": {
   "ct": "PrintContext",
   "lt": "usePrintRegistration",
   "ln": "DocumentColumn"
  },
  "aliases": {
   "ct": "h",
   "lt": "_",
   "ln": "f"
  },
  "features": {
   "ct": [
    "ct=g(null)"
   ],
   "lt": [
    "function lt(e,t){let $=J9(9),{prepare:n,landscape:r,enabled:i}=J1($,0,t)?K1($,0,t,t===void 0?{}:t):$[1],a=r!==void 0&&r,o=i===void 0||i,s=p(ct),c,l;J5($,2,o,a,n,s,e)?(c=()=>{if(!(s===null||!o))return s({element:()=>e.current,prepare:n,landscape:a})},l=[s,e,n,a,o],K5($,2,o,a,n,s,e,c,l)):(c=$[7],l=$[8]),m(c,l)}"
   ],
   "ln": [
    "function ln(e){let $=J9(3),{children:t,width:r}=e,i=(r===void 0?\"measure\":r)===\"content\"?\"content\":void 0;return J2($,0,t,i)?K2($,0,t,i,n(\"div\",{className:\"epitaxy-document-column\",\"data-width\":i,children:t})):$[2]}"
   ]
  },
  "readBy": {
   "ct": "lt"
  },
  "previous": {
   "ct": "c3fde7009-LYGOoUpG.js#ct",
   "lt": "c3fde7009-LYGOoUpG.js#lt",
   "ln": "c3fde7009-LYGOoUpG.js#cn"
  }
 },
 {
  "target": "titlebar-focus-orphaned.mjs",
  "source": "c4db265df-CHyZjtsm.js",
  "exports": {
   "lt": "focusOrphaned"
  },
  "aliases": {
   "lt": "S"
  },
  "features": {
   "lt": [
    "function lt(e){return ke(e)||e.activeElement?.isConnected===!1}"
   ]
  },
  "previous": {
   "lt": "c4db265df-fNhlkQCj.js#tt"
  }
 },
 {
  "target": "pane-layout-icons.mjs",
  "source": "c4db265df-CHyZjtsm.js",
  "exports": {
   "wt": "paneLayoutIcons",
   "Ct": "paneLayoutSplitIcons"
  },
  "aliases": {
   "wt": null,
   "Ct": null
  },
  "features": {
   "wt": [
    "wt={left:\"PaneLeft\",right:\"PaneRight\",top:\"PaneTop\",bottom:\"PaneBottom\",fill:\"PaneFill\",center:bt.center,corner:bt.corner}"
   ],
   "Ct": [
    "function Ct(e){let[t,n,r]=St[e];return[{name:\"PaneSplit\",viewBox:e,paths:[{d:t,strokeWidth:xt},r]},{name:\"PaneSplitOtherPane\",viewBox:e,paths:[n]}]}"
   ]
  },
  "previous": {
   "wt": "c4db265df-fNhlkQCj.js#it",
   "Ct": null
  }
 },
 {
  "target": "electron-environment-presets--c5272b93e.mjs",
  "source": "c5272b93e-Db_d-mvH.js",
  "electron": "electron/generated/environment-presets.mjs",
  "auxiliaryOf": "electron-environment-presets.mjs",
  "exports": {
   "n": "sameEnvironmentName",
   "o": "availableEnvironmentName",
   "a": "uniqueEnvironmentName"
  },
  "aliases": {
   "n": "n",
   "o": "r",
   "a": "t"
  },
  "features": {
   "n": [
    "function n(e,t){return e.trim().toLowerCase()===t.trim().toLowerCase()}"
   ],
   "o": [
    "function o(e,t,r,o){let s=e=>r.some(t=>n(t,e));if(e===\"\"||!s(e))return e;let c=t.kind===\"ssh\"||t.kind===\"cloud\"?o&&!n(o,e)?`${e} \\u00B7 ${o}`:null:t.kind===\"local\"?t.wslDistro?`${e} \\u00B7 ${t.wslDistro}`:t.variant&&o?`${e} \\u00B7 ${o}`:(t=>t?`${e} (${t})`:null)(i(t.cwd,e)):null;return c&&!s(c)?c:a(e,r)}"
   ],
   "a": [
    "function a(e,t){let r=e=>t.some(t=>n(t,e));if(e===\"\"||!r(e))return e;for(let t=2;;t+=1){let n=`${e} ${t}`;if(!r(n))return n}}"
   ]
  },
  "previous": {
   "n": "cd0cf5b5e-BCzJmEwZ.js#c",
   "o": "cd0cf5b5e-BCzJmEwZ.js#l",
   "a": "cd0cf5b5e-BCzJmEwZ.js#fe"
  }
 },
 {
  "target": "file-tree-style.mjs",
  "source": "c621b1e2d-Bo_3tWUk.js",
  "exports": {
   "h": "treeIndent",
   "v": "fileTreeGuideStyle",
   "_": "guideGradient",
   "y": "fileTreeRowStyle",
   "r": "fileTreeIconSize"
  },
  "aliases": {
   "h": "f",
   "v": "d",
   "_": "u",
   "y": "p",
   "r": "l"
  },
  "features": {
   "h": [
    "function h(e){return{paddingInlineStart:t+e*o(),paddingInlineEnd:t}}"
   ],
   "v": [
    "function v(e){if(e===0)return{};let t=o();return{\"--file-tree-guides\":`repeating-linear-gradient(${g}, var(--cds-border) 0 1px, transparent 1px ${t}px)`,\"--file-tree-guides-x\":`${a()}px`,backgroundPosition:`${a()}px 0`,backgroundRepeat:\"no-repeat\",backgroundSize:`${e*t}px 100%`}}"
   ],
   "_": [
    "function _(e){let t=e*o();return`linear-gradient(${g}, transparent ${t}px, var(--cds-border) ${t}px ${t+1}px, transparent ${t+1}px)`}"
   ],
   "y": [
    "function y(e){return{...h(e),...v(e)}}"
   ],
   "r": [
    "function r(){return\"sm\"}"
   ]
  },
  "previous": {
   "h": "c621b1e2d-CU5cG_mP.js#h",
   "v": "c621b1e2d-CU5cG_mP.js#v",
   "_": "c621b1e2d-CU5cG_mP.js#_",
   "y": "c621b1e2d-CU5cG_mP.js#y",
   "r": "c621b1e2d-CU5cG_mP.js#i"
  }
 },
 {
  "target": "csv-parser-vendor.mjs",
  "source": "c63ad9d34-BwRS70iU.js",
  "exports": {
   "je": "n",
   "q": "t"
  },
  "aliases": {
   "je": "n",
   "q": "t"
  },
  "features": {
   "je": [
    "je=function(e,t={}){typeof e==\"string\"&&(e=_.from(e));let n=t&&t.objname?{}:[],r=Ae(t),i=e=>{r.options.objname===void 0?n.push(e):n[e[0]]=e[1]},a=()=>{},o=r.parse(e,!1,i,a);if(o!==void 0)throw o;let s=r.parse(void 0,!0,i,a);if(s!==void 0)throw s;return n}"
   ],
   "q": [
    "q=class e extends Error{constructor(t,n,r,...i){Array.isArray(n)&&(n=n.join(\" \").trim()),super(n),Error.captureStackTrace!==void 0&&Error.captureStackTrace(this,e),this.code=t;for(let e of i)for(let t in e){let n=e[t];this[t]=G(n)?n.toString(r.encoding):n==null?n:JSON.parse(JSON.stringify(n))}}}"
   ]
  },
  "previous": {
   "je": "c63ad9d34-BwRS70iU.js#je",
   "q": "c63ad9d34-BwRS70iU.js#q"
  }
 },
 {
  "target": "electron-file-text-binary.mjs",
  "source": "c650084fd-B2g4Nl42.js",
  "electron": "electron/generated/file-text-binary.mjs",
  "exports": {
   "O": "looksBinaryText"
  },
  "aliases": {
   "O": "x"
  },
  "features": {
   "O": [
    "function O(e){let t=e.slice(0,8192);if(t.length===0)return!1;if(t.includes(\"\\0\"))return!0;let n=0;for(let e=0;e<t.length;e++)t.charCodeAt(e)===65533&&n++;return n/t.length>.02}"
   ]
  },
  "previous": {
   "O": "c650084fd-BlejO2XR.js#T"
  }
 },
 {
  "target": "terminal-commands.mjs",
  "source": "c6bf19e8f-BKh29bml.js",
  "exports": {
   "fn": "installTerminalCommands"
  },
  "aliases": {
   "fn": null
  },
  "features": {
   "fn": [
    "function fn(e){let t=[],n,r,i,a=t=>{let n=i;i=void 0,n&&(n.finished=!0,n.exitCode=t!==void 0&&/^-?\\d{1,10}$/.test(t)?Number.parseInt(t,10):void 0,dn(e,n))},o=(t,n)=>{let r=e.buffer.active,i=r.baseY+r.cursorY,a=i+t;for(;a>n&&r.getLine(a)?.isWrapped;)a--;return e.registerMarker(a-i)},s=()=>{a(void 0),n?.dispose(),r?.dispose(),r=void 0,n=e.registerMarker(0)},c=()=>{if(i)return;let a=n,s=r??a;n=void 0,r=void 0;let c=a&&s",
    "e of t.map(e=>e.marker))e.dispose();return n?.dispose(),r?.dispose(),!1}),{scrollToCommand(n){if(t.length===0)return!1;let r=e=>Math.max(0,e.marker.line-e.promptLines),i=e.buffer.active.viewportY,a=n===\"previous\"?t.findLast(e=>r(e)<i):t.find(e=>r(e)>i);return a?e.scrollToLine(r(a)):n===\"next\"&&e.scrollToBottom(),!0}}}"
   ]
  },
  "previous": {
   "fn": "c6bf19e8f-CgQ1_Jhf.js#Kt"
  }
 },
 {
  "target": "terminal-geometry.mjs",
  "source": "c6bf19e8f-BKh29bml.js",
  "exports": {
   "_o": "terminalSelectionEndRow",
   "yo": "terminalSelectionBox",
   "xo": "isWholeTerminalSelection",
   "So": "wholeTerminalSelectionAnchor",
   "Co": "terminalSelectionPillPosition"
  },
  "aliases": {
   "_o": null,
   "yo": null,
   "xo": null,
   "So": null,
   "Co": null
  },
  "features": {
   "_o": [
    "function _o({start:e,end:t}){return t.x===0&&t.y>e.y?t.y-1:t.y}"
   ],
   "yo": [
    "function yo(e,t,n,r){let i=e.element?.querySelector(\".xterm-screen\");if(!i||!t||i.clientHeight<=0)return;let a=i.clientHeight/e.rows,o=i.getBoundingClientRect().top-t.getBoundingClientRect().top,{viewportY:s}=e.buffer.active,c=o+(r.start.y-s)*a,l=o+(_o(r)-s+1)*a;return go+=1,{id:go,top:c,bottom:l,below:n>=c+a}}"
   ],
   "xo": [
    "function xo(e,t){let{start:n,end:r}=t;return n.x===0&&n.y===0&&r.x===e.cols&&r.y===e.buffer.active.baseY+e.rows-1}"
   ],
   "So": [
    "function So(e,t){let n=e.element?.querySelector(\".xterm-screen\");if(!n||!t||n.clientHeight<=0)return;let{active:r}=e.buffer,i=e.rows,a=0;for(;a===0&&i>0;){--i;let e=r.getLine(r.viewportY+i);a=e?bo(e):0}if(a===0)return;r.baseY+r.cursorY-r.viewportY===i&&(a=Math.max(a,r.cursorX+1));let o=n.clientHeight/e.rows,s=n.getBoundingClientRect(),c=t.getBoundingClientRect(),l=s.top-c.top+i*o;return go+=1,{x:s.left-c.left+Math.min(a,e.cols)*(n.clientWidth/e.cols),y:l+o/2,sel:{id:go,top:l,bottom:l+o,below:!0},beside:!0}}"
   ],
   "Co": [
    "function Co(e,t,n,r){let i=t.width/2;if(e.beside){let r=e.x+po+i,a=e.y+t.height/2;if(r+i<=n.width&&a<=n.height&&a>=t.height)return{left:Math.round(r),top:Math.round(a)}}let a=Math.min(n.width-i,Math.max(i,e.x)),o=e=>e>=t.height&&e<=n.height,{sel:s}=e,c;if(s){let n=Math.min(s.top,e.y)-po,i=Math.max(s.bottom+po,e.y+mo)+t.height,a=((r??(s.below?\"below\":\"above\"))===\"below\"?[\"below\",\"above\"]:[\"above\",\"below\"]).find(e=>o(e===\"below\"?i:n));c=a&&{top:a===\"below\"?i:n,side:a}}return c??={top:e.y-po>=t.height?e.y-po:e.y+mo+t.height},{left:Math.round(a),top:Math.round(c.top),side:c.side}}"
   ]
  },
  "previous": {
   "_o": "c6bf19e8f-CgQ1_Jhf.js#gi",
   "yo": "c6bf19e8f-CgQ1_Jhf.js#_i",
   "xo": "c6bf19e8f-CgQ1_Jhf.js#yi",
   "So": "c6bf19e8f-CgQ1_Jhf.js#bi",
   "Co": "c6bf19e8f-CgQ1_Jhf.js#xi"
  }
 },
 {
  "target": "terminal-output.mjs",
  "source": "c6bf19e8f-BKh29bml.js",
  "exports": {
   "na": "attachVisibleTerminalOutput",
   "qr": "terminalSelectionText"
  },
  "aliases": {
   "na": null,
   "qr": null
  },
  "features": {
   "na": [
    "function na(e,t){let n=e.hasSelection();if(!n){let{active:t}=e.buffer,n=t.viewportY,r=Wr(e.cols);for(;n>0&&n<r&&t.getLine(n)?.isWrapped;)--n;e.selectLines(n,t.viewportY+e.rows-1)}let r=qr(e.getSelection());return!t||!r.trim()?(n||e.clearSelection(),!1):(e.clearSelection(),t(r),!0)}"
   ],
   "qr": [
    "function qr(e){return Gr(Kr(e))}"
   ]
  },
  "previous": {
   "na": "c6bf19e8f-CgQ1_Jhf.js#dr",
   "qr": "c6bf19e8f-CgQ1_Jhf.js#$n"
  }
 },
 {
  "target": "terminal-mouse.mjs",
  "source": "c6bf19e8f-BKh29bml.js",
  "exports": {
   "to": "terminalOwnsContextMenu"
  },
  "aliases": {
   "to": null
  },
  "features": {
   "to": [
    "function to(e,t){let n=ue(),r=t.button===2||n&&t.ctrlKey,i=e.element?.contains(t.target)===!0;return!r||!i||e.modes.mouseTrackingMode===\"none\"?!1:!(n?t.altKey&&e.options.macOptionClickForcesSelection===!0:t.shiftKey)}"
   ]
  },
  "previous": {
   "to": "c6bf19e8f-CgQ1_Jhf.js#ti"
  }
 },
 {
  "target": "terminal-colors.mjs",
  "source": "c6bf19e8f-BKh29bml.js",
  "exports": {
   "Nr": "installTerminalColorPolicy"
  },
  "aliases": {
   "Nr": null
  },
  "features": {
   "Nr": [
    "function Nr(e){let t=Mr.map(t=>e.parser.registerOscHandler(t,e=>t===4?!Pr(e):!Fr(e)));return{dispose(){for(let e of t)e.dispose()}}}"
   ]
  },
  "previous": {
   "Nr": "c6bf19e8f-CgQ1_Jhf.js#zn"
  }
 },
 {
  "target": "terminal-link-selection.mjs",
  "source": "c6bf19e8f-BKh29bml.js",
  "exports": {
   "Cn": "selectionBlocksTerminalLink"
  },
  "aliases": {
   "Cn": null
  },
  "features": {
   "Cn": [
    "function Cn(e,t){let n=t.metaKey||t.ctrlKey||t.shiftKey||t.altKey,r=e.modes.mouseTrackingMode!==\"none\";return!n&&!r&&e.getSelection().length>1}"
   ]
  },
  "previous": {
   "Cn": "c6bf19e8f-CgQ1_Jhf.js#Dn"
  }
 },
 {
  "target": "terminal-errors.mjs",
  "source": "c6bf19e8f-BKh29bml.js",
  "exports": {
   "io": "needsNewerAppError",
   "ao": "startFailedError",
   "oo": "loadFailedError",
   "so": "TerminalLoadFailed",
   "co": "terminalErrorMessages",
   "lo": "terminalErrorText",
   "fo": "terminalStartError"
  },
  "aliases": {
   "io": null,
   "ao": null,
   "oo": null,
   "so": null,
   "co": null,
   "lo": null,
   "fo": null
  },
  "features": {
   "io": [
    "io={kind:\"needsNewerApp\"}"
   ],
   "ao": [
    "ao={kind:\"startFailed\"}"
   ],
   "oo": [
    "oo={kind:\"loadFailed\"}"
   ],
   "so": [
    "so=class extends Error{constructor(){super(\"Failed to load terminal\"),this.name=\"TerminalLoadFailed\"}}"
   ],
   "co": [
    "co=me({needsNewerApp:{defaultMessage:\"Additional terminal tabs require a newer Claude desktop app\",id:\"UmCCqFiseY\"},needsNewerAppBody:{defaultMessage:\"Restart Claude to update.\",id:\"e/Nyj1sdtt\"},startFailed:{defaultMessage:\"Couldn\\u2019t start the shell\",id:\"4oGvcz1sbM\"},loadFailed:{defaultMessage:\"Couldn\\u2019t load the terminal\",id:\"OqP0kTN27G\"}})"
   ],
   "lo": [
    "function lo(e){switch(e.kind){case\"needsNewerApp\":return\"Additional terminal tabs require a newer Claude desktop app. Restart Claude to update.\";case\"startFailed\":return\"Couldn\\u2019t start the shell\";case\"loadFailed\":return\"Couldn\\u2019t load the terminal\";case\"raw\":return e.text}}"
   ],
   "fo": [
    "function fo(e,t,n){return t!==n&&e===\"Session not found\"?io:e===uo?ao:typeof e==\"string\"?{kind:\"raw\",text:e}:ao}"
   ]
  },
  "previous": {
   "io": "c6bf19e8f-CgQ1_Jhf.js#ii",
   "ao": "c6bf19e8f-CgQ1_Jhf.js#ai",
   "oo": "c6bf19e8f-CgQ1_Jhf.js#oi",
   "so": "c6bf19e8f-CgQ1_Jhf.js#si",
   "co": "c6bf19e8f-CgQ1_Jhf.js#ci",
   "lo": "c6bf19e8f-CgQ1_Jhf.js#li",
   "fo": "c6bf19e8f-CgQ1_Jhf.js#di"
  }
 },
 {
  "target": "titlebar-focus-lost.mjs",
  "source": "c70925de4-QmzvmFns.js",
  "exports": {
   "t": "focusLost"
  },
  "aliases": {
   "t": "t"
  },
  "features": {
   "t": [
    "function t(t){let n=e(t),r=n.activeElement;return r===null||r===n.body}"
   ]
  },
  "previous": {
   "t": "c70925de4-SEtaxEBR.js#t"
  }
 },
 {
  "target": "electron-btw-title.mjs",
  "source": "c73f45bc3-C7dtUSq8.js",
  "electron": "electron/generated/btw-title.mjs",
  "exports": {
   "Tm": "btwTitleLimit",
   "Em": "btwTitlePrefix",
   "Om": "btwTitle",
   "Pm": "btwTitleWords"
  },
  "aliases": {
   "Tm": null,
   "Em": null,
   "Om": null,
   "Pm": null
  },
  "features": {
   "Tm": [
    "Tm=60"
   ],
   "Em": [
    "Em=\"btw: \""
   ],
   "Om": [
    "function Om(e,t){let n=(e??\"\").replace(/\\s+/g,\" \").trim();return n?`${Em}${n.length>Tm?`${xr(n,59).trimEnd()}\\u2026`:n}`:t}"
   ],
   "Pm": [
    "function Pm(e){return e.split(`\n`).filter(e=>!e.startsWith(\">\")).join(\" \")}"
   ]
  },
  "readBy": {
   "Tm": "Om"
  },
  "previous": {
   "Tm": "c73f45bc3-B7hbL7H9.js#Mf",
   "Em": "c73f45bc3-B7hbL7H9.js#Nf",
   "Om": "c73f45bc3-B7hbL7H9.js#Ff",
   "Pm": "c73f45bc3-B7hbL7H9.js#Lf"
  }
 },
 {
  "target": "pane-focus-owner.mjs",
  "source": "c73f45bc3-C7dtUSq8.js",
  "exports": {
   "Uf": "paneOwnsFocus"
  },
  "aliases": {
   "Uf": "On"
  },
  "features": {
   "Uf": [
    "function Uf(e){let t=ue(e),n=t.activeElement;return n===null||n===t.body?!0:(e?.closest(\"[data-pane-root]\")??e)?.contains(n)??!1}"
   ]
  },
  "previous": {
   "Uf": "cccc2cf0a-DhZC33Gc.js#ux"
  }
 },
 {
  "target": "titlebar-toggle-fold.mjs",
  "source": "c73f45bc3-C7dtUSq8.js",
  "exports": {
   "sy": "foldTitlebarToggles"
  },
  "aliases": {
   "sy": "rt"
  },
  "features": {
   "sy": [
    "function sy(e,t,n=ey){let r=Math.min(Math.max(0,Math.trunc(t)||0),e.length);if(r===0)return{folded:[],inline:[...e]};let i=e=>e.active||n.has(e.pane),a=[...e.filter(e=>!i(e)),...e.filter(i)],o=new Set(a.slice(0,r));return{folded:e.filter(e=>o.has(e)),inline:e.filter(e=>!o.has(e))}}"
   ]
  },
  "previous": {
   "sy": "c73f45bc3-B7hbL7H9.js#p_"
  }
 },
 {
  "target": "titlebar-panels-scope.mjs",
  "source": "c73f45bc3-C7dtUSq8.js",
  "exports": {
   "zd": "useTitlebarPanelsScope"
  },
  "aliases": {
   "zd": "or"
  },
  "features": {
   "zd": [
    "function zd(){return ne(uc)===!0}"
   ]
  },
  "previous": {
   "zd": "shared-15-BvlV43cI.js#vn"
  }
 },
 {
  "target": "titlebar-title-skeleton.mjs",
  "source": "c73f45bc3-C7dtUSq8.js",
  "exports": {
   "$b": "TitlebarTitleSkeleton"
  },
  "aliases": {
   "$b": "M"
  },
  "features": {
   "$b": [
    "function $b(e){let $=J9(5),{title:t,titleRef:n}=e,a=Ei(),o=Di();return J4($,0,a,t,o,n)?K4($,0,a,t,o,n,t?i(\"span\",{className:a?er:rr,children:[r(\"h2\",{className:mi,children:r(\"span\",{ref:n,\"data-slot\":\"title-preview\",\"data-pane-title\":\"\",dir:o,className:hi,children:t})}),r(\"span\",{\"aria-hidden\":!0,\"data-slot\":\"title-caret-slot\",className:pi})]},\"title\"):r(\"span\",{\"aria-hidden\":!0,\"data-slot\":\"title-ghost\",className:gi},\"ghost\")):$[4]}"
   ]
  },
  "previous": {
   "$b": "c73f45bc3-B7hbL7H9.js#iy"
  }
 },
 {
  "target": "file-output-order.mjs",
  "source": "c73f45bc3-C7dtUSq8.js",
  "exports": {
   "eC": "recentOutputPaths"
  },
  "aliases": {
   "eC": "d"
  },
  "features": {
   "eC": [
    "function eC(e,t=US,n=null,r=t){let i=t.map(qS),a=r.map(qS),o=new Set;for(let t of e){if(t.author!==\"assistant\")continue;let e=WS.get(t);e===void 0&&(e=$S(t),WS.set(t,e));for(let{path:t,written:r}of e){if(r&&!o.has(t)){let e=qS(n?.(t)??t);if(YS(e,a)||ZS(e,i)||!KS(t)&&i.some(t=>JS(e,t)))continue}o.delete(t),o.add(t)}}return[...o].reverse().slice(0,BS)}"
   ]
  },
  "previous": {
   "eC": "c73f45bc3-B7hbL7H9.js#rx"
  }
 },
 {
  "target": "tab-focus-key-scroll.mjs",
  "source": "c7f8992b4-B-8WHHV9.js",
  "exports": {
   "g": "classifyKeyScroll",
   "ne": "keyScrollIntentMs"
  },
  "aliases": {
   "g": "n",
   "ne": null
  },
  "features": {
   "g": [
    "function g(e,t){if((e.ctrlKey||e.altKey||e.metaKey)&&!h.has(e.key))return\"none\";if(e.key===\"Tab\")return e.shiftKey?\"up\":\"none\";let n=e.target;if(!(n!==null&&(n===t.ownerDocument.body||t.contains(n)))||s(n))return\"none\";switch(e.key){case\"ArrowUp\":case\"PageUp\":case\"Home\":return\"up\";case\"ArrowDown\":case\"PageDown\":case\"End\":return\"down\";case\" \":return e.shiftKey?\"up\":\"down\";default:return\"none\"}}"
   ],
   "ne": [
    "ne=1e3"
   ]
  },
  "uniqueBy": {
   "ne": "reader"
  },
  "usedIn": {
   "ne": {
    "by": "he",
    "features": [
     {
      "loose": "d-M.current<ne",
      "keep": [
       "ne"
      ]
     }
    ]
   }
  },
  "reexports": {
   "keyScrollEditable": {
    "module": "tab-focus-key-scroll--shared-31.mjs",
    "name": "keyScrollEditable"
   }
  },
  "previous": {
   "g": "c7f8992b4-DUZwS58e.js#ge",
   "ne": "c7f8992b4-DUZwS58e.js#ne"
  }
 },
 {
  "target": "terminal-registry.mjs",
  "source": "c845522f3-Cn4jBj_8.js",
  "exports": {
   "t": "registerTerminalRegistry",
   "s": "terminalRegistryHas",
   "o": "clearTerminalViaRegistry"
  },
  "aliases": {
   "t": "s",
   "s": "a",
   "o": "n"
  },
  "features": {
   "t": [
    "function t(t){e=t}"
   ],
   "s": [
    "function s(t){return e?.has(t)??!1}"
   ],
   "o": [
    "function o(t){e?.clearSelection(t),e?.clear(t)}"
   ]
  },
  "uniqueBy": {
   "t": "alias"
  },
  "previous": {
   "t": "cf718f694-C6OUPnrm.js#ne",
   "s": "cf718f694-C6OUPnrm.js#ce",
   "o": "cf718f694-C6OUPnrm.js#se"
  }
 },
 {
  "target": "tile-layout-flex.mjs",
  "source": "c9543da06-DHwxxZai.js",
  "exports": {
   "Io": "minSize",
   "Fo": "distributeFlex",
   "Bo": "walkResolvedFlexes"
  },
  "aliases": {
   "Io": "$",
   "Fo": "et",
   "Bo": "tt"
  },
  "features": {
   "Io": [
    "function Io(e,t,n,r,i){let a=t===\"row\"?r.minTileWidthPx??r.minTileBasePx:r.minTileBasePx;if(e.kind===\"tile\"){if(t!==\"row\")return a;let o=n(e.tileId),s=o?.overflowMin?i?.overflowMinReachable?r.minTileBasePx:Math.max(o.overflowMin.width,r.minTileBasePx):a;return i?.slotFloors?Math.max(s,o?.slotMin??0):s}let o=e.children.map(e=>Io(e,t,n,r,i));return e.direction===t?o.reduce((e,t)=>e+t,0)+r.gap*Math.max(0,e.children.length-1):Math.max(a,...o)}"
   ],
   "Fo": [
    "function Fo(e,t,n){let r=e.length;if(r===0||n<=0)return[...e];let i=e.reduce((e,t)=>e+t,0)||r,a=new Set,o=e.map(e=>e/i*n);for(;;){let r=o.findIndex((e,n)=>!a.has(n)&&e<t[n]-.5);if(r===-1)break;a.add(r);let i=[...a].reduce((e,n)=>e+t[n],0),s=e.reduce((e,t,n)=>a.has(n)?e:e+t,0),c=n-i;if(s<=0||c<=0){let e=t.reduce((e,t)=>e+t,0)||1;o=t.map(t=>t/e*n);break}o=e.map((e,n)=>a.has(n)?t[n]:e/s*c)}let s=o.reduce((e,t)=>e+t,0)||r;return o.map(e=>e*r/s)}"
   ],
   "Bo": [
    "function Bo(e,t,n,r,i,a){let o={overflowMinReachable:!0},s=(e,t)=>{if(e.kind!==\"stack\")return;let c=e.direction===\"row\",l=t?c?t.width:t.height:0,u=Math.max(0,l-r.gap*Math.max(0,e.children.length-1)),d=e.children.map(t=>Io(t,e.direction,n,r,o)),f=c&&t?zo(e.children,u,n,r):d,p=a?.slotFloorsFree?c?d:e.children.map(e=>Io(e,\"row\",n,r,o)):c?f:e.children.map(e=>Io(e,\"row\",n,r,t?Ro:o)),m=t?Fo(e.children.map(e=>e.flex),f,u):e.children.map(e=>e.flex),h=m.reduce((e,t)=>e+t,0)||1,g=0,_=0,v=m.map(e=>{_+=e;let t=Math.round(_/h*u),n=t-g;return g=t,n}),y=t&&g>0?v.map(e=>e/g*m.length):m;for(let n=0;n<e.children.length;n++){let r=e.children[n],a=t?c?{width:v[n],height:t.height}:{width:t.width,height:v[n]}:null;i(e,r,n,y[n],a,Math.min(p[n],a?.width??1/0)),s(r,a)}};s(e,t)}"
   ]
  },
  "previous": {
   "Io": "c9543da06-BaufrsQl.js#Gd",
   "Fo": "c9543da06-BaufrsQl.js#Wd",
   "Bo": "c9543da06-BaufrsQl.js#Kd"
  }
 },
 {
  "target": "transcript-focus-landing.mjs",
  "source": "c96d752d0-D9VB6ArX.js",
  "exports": {
   "p5": "landTranscriptFocus",
   "d5": "landedFocusEvents"
  },
  "aliases": {
   "p5": null,
   "d5": null
  },
  "features": {
   "p5": [
    "function p5(e,{scroller:t,pointerDownAt:n,tabPresses:r=null,isPinned:i,scrollToTail:a,setPinned:o}){let s=Ze(e.target),c=Ze(e.relatedTarget),l=r!==null&&!r.isTabFocus(s);if(!i()||s===null||c===null||s===t||!t.contains(s)||l&&s.matches(\"[data-base-ui-focus-guard]\")||c!==t&&t.contains(c)||performance.now()-n<500)return!1;let u=t.scrollHeight-t.clientHeight-t.scrollTop;if(!l&&u<=2)return!1;let d=yd(t),f=t.",
    "||e.checkVisibility({visibilityProperty:!0}))&&p(e,!0),h=(e,n)=>{let r=t.querySelectorAll(e);for(let e=r.length-1;e>=0;e--)if(n(r[e]))return r[e];return null},g=(m(s)?s:null)??h('[role=\"article\"]',e=>p(e,!1))??h(dgt,m);return g===null?(o(!1),!1):(a(),g!==s&&(e.stopPropagation(),g.focus({preventScroll:!0}),!0))}"
   ],
   "d5": [
    "d5=new WeakSet"
   ]
  },
  "readBy": {
   "d5": "p5"
  },
  "previous": {
   "p5": "c96d752d0-CWv_7-n9.js#f6",
   "d5": "c96d752d0-CWv_7-n9.js#u6"
  }
 },
 {
  "target": "environment-name-parts.mjs",
  "source": "c96d752d0-D9VB6ArX.js",
  "exports": {
   "AE": "environmentNameParts"
  },
  "aliases": {
   "AE": null
  },
  "features": {
   "AE": [
    "function AE(e){let t=Array.from(e);return t.length<16?null:{head:t.slice(0,-10).join(\"\"),tail:t.slice(-10).join(\"\")}}"
   ]
  },
  "previous": {
   "AE": "c96d752d0-CWv_7-n9.js#pL"
  }
 },
 {
  "target": "tab-focus-tracker.mjs",
  "source": "c99ca27a0-DVQoBCK_.js",
  "exports": {
   "r": "trackTabFocus"
  },
  "aliases": {
   "r": "t"
  },
  "features": {
   "r": [
    "function r(t,r){let i=t.defaultView,a=null,o,s=t=>!!n(t)?.closest(e),c=new((i?.AbortController)??AbortController),l={capture:!0,signal:c.signal};return t.addEventListener(\"keydown\",e=>{a=e.key===\"Tab\"&&!e.ctrlKey&&!e.metaKey?e:null,o=void 0,a!==null&&r?.(a)},l),t.addEventListener(\"keyup\",()=>{s(t.activeElement)||(a=null)},l),t.addEventListener(\"focusin\",e=>{a!==null&&a.eventPhase===Event.NONE&&!s(e.target)&&(o??=e.target)},l),i?.addEventListener(\"blur\",()=>{a=null},{signal:c.signal}),{isTabFocus:e=>a!==null&&!a.defaultPrevented&&e!==null&&e===o,stop:()=>c.abort()}}"
   ]
  },
  "previous": {
   "r": "c99ca27a0-DVQoBCK_.js#r"
  }
 },
 {
  "target": "transcript-tab-focus.mjs",
  "source": "c99ca27a0-DVQoBCK_.js",
  "exports": {
   "t": "tabFocusFollows"
  },
  "aliases": {
   "t": "r"
  },
  "features": {
   "t": [
    "function t(e,t,n,r){return t!==null&&(t.contains(e)||(t.compareDocumentPosition(e)&Node.DOCUMENT_POSITION_FOLLOWING)!==0)&&r(e,n)}"
   ]
  },
  "previous": {
   "t": "c99ca27a0-DVQoBCK_.js#t"
  }
 },
 {
  "target": "pane-focus-target.mjs",
  "source": "c9bc99274-DZ8dxmGP.js",
  "exports": {
   "a": "tileFocusTargetAttribute",
   "b": "paneFocusTarget"
  },
  "aliases": {
   "a": "t",
   "b": "i"
  },
  "features": {
   "a": [
    "a=\"data-tile-focus-target\""
   ],
   "b": [
    "function b(e){return y(e)??v(e,u)}"
   ]
  },
  "previous": {
   "a": "c9bc99274-DTZfHMJt.js#a",
   "b": "c9bc99274-DTZfHMJt.js#b"
  }
 },
 {
  "target": "terminal-selection.mjs",
  "source": "c9bd7af9c-Bvb7EG4D.js",
  "exports": {
   "TC": "terminalAttachmentText"
  },
  "aliases": {
   "TC": null
  },
  "features": {
   "TC": [
    "function TC(e){let t=e.length-e.trimStart().length;return e.slice(e.lastIndexOf(`\n`,t)+1).trimEnd()}"
   ]
  },
  "previous": {
   "TC": "cccc2cf0a-DhZC33Gc.js#rS"
  }
 },
 {
  "target": "terminal-clear-item.mjs",
  "source": "c9bd7af9c-Bvb7EG4D.js",
  "exports": {
   "DC": "mountedTerminalViews",
   "OC": "terminalClearState",
   "kC": "TerminalClearItem"
  },
  "aliases": {
   "DC": null,
   "OC": null,
   "kC": null
  },
  "features": {
   "DC": [
    "DC=new Map"
   ],
   "OC": [
    "function OC(e){return Qd(e)?\"terminal\":DC.has(e)?\"viewOnly\":\"noView\"}"
   ],
   "kC": [
    "function kC(e){let $=J9(13),{ptyKey:t}=e,n=za(),r=J1($,0,t)?K1($,0,t,()=>OC(t)):$[1],[i]=g(r),a;i===\"viewOnly\"?a=J1($,2,n)?K1($,2,n,n.formatMessage({defaultMessage:\"No terminal to clear\",id:\"9WbosGezgw\"})):$[3]:i===\"noView\"&&(a=J1($,4,n)?K1($,4,n,n.formatMessage({defaultMessage:\"Switch to this terminal first.\",id:\"IcvUF27v0e\"})):$[5]);let o=i!==\"terminal\",s=J1($,6,t)?K1($,6,t,()=>tf(t)):$[7],c=J0($,8)?K0($,8,u(Z,{defaultMessage:\"Clear terminal\",id:\"m6UYaDfqaN\"})):$[8];return J3($,9,a,o,s)?K3($,9,a,o,s,u(we.Item,{disabled:o,disabledReason:a,onClick:s,children:c})):$[12]}"
   ]
  },
  "readBy": {
   "DC": "OC"
  },
  "previous": {
   "DC": "cccc2cf0a-DhZC33Gc.js#aS",
   "OC": "cccc2cf0a-DhZC33Gc.js#oS",
   "kC": "cccc2cf0a-DhZC33Gc.js#sS"
  }
 },
 {
  "target": "tab-focus-release.mjs",
  "source": "c9f414608-CCeBXbMm.js",
  "exports": {
   "o": "attachTabFocusRelease"
  },
  "aliases": {
   "o": "t"
  },
  "features": {
   "o": [
    "function o(e,r,o){let s=e.ownerDocument,c=t(e),l=null,u=0,d=null,f=n(s,t=>{l=t,u=e.scrollTop}),p=t=>{let n=a(t.target);if(n===null||l===d||!f.isTabFocus(n)||n===e||s.activeElement!==n||!r.isPinned()||o?.(t))return;d=l;let p=e.getBoundingClientRect(),m=parseFloat(c?.getComputedStyle(e).scrollPaddingTop??\"\")||0,h=p.top+m,g=n.getBoundingClientRect(),_=e.scrollTop-u;(g.bottom+_<=h||g.top+_<h-i&&g.height<=p.bottom-h)&&r.setPinned(!1)},m=new((c?.AbortController)??AbortController);return e.addEventListener(\"focusin\",p,{signal:m.signal}),()=>{m.abort(),f.stop()}}"
   ]
  },
  "previous": {
   "o": "c9f414608-BplIKcn2.js#i"
  }
 },
 {
  "target": "environment-dialog-draft.mjs",
  "source": "ca690a791-wvyOgwjo.js",
  "exports": {
   "ln": "environmentBranchOrder",
   "un": "environmentDefaultBranch",
   "dn": "environmentBranchLabel",
   "fn": "environmentNotRepositoryNote",
   "pn": "folderCheckout",
   "mn": "promotedFolderSettings",
   "_n": "withoutFolderSettings",
   "Mn": "environmentDraft",
   "Pn": "environmentDraftDirty",
   "Un": "replaceEnvironmentFolder",
   "qn": "environmentTarget",
   "Sn": "pinnedPopupHeightProperty",
   "er": "environmentDialogClass",
   "tr": "environmentMinHeight",
   "$n": "environmentLabelClass",
   "ar": "environmentFolderLabelClass"
  },
  "aliases": {
   "ln": null,
   "un": null,
   "dn": null,
   "fn": null,
   "pn": null,
   "mn": null,
   "_n": null,
   "Mn": null,
   "Pn": null,
   "Un": null,
   "qn": null,
   "Sn": null,
   "er": null,
   "tr": null,
   "$n": null,
   "ar": null
  },
  "features": {
   "ln": [
    "function ln(e,t){let n=e=>e===\"main\"?0:e===\"master\"?1:2,r=e.toSorted((e,t)=>n(e)-n(t)||e.localeCompare(t));return t&&!r.includes(t)?[t,...r]:r}"
   ],
   "un": [
    "function un(e,t,n){return e?.defaultBranch??(n===\"local\"?t.find(e=>e===\"main\"||e===\"master\"):void 0)}"
   ],
   "dn": [
    "function dn(e,t){let n=t.now?\"switches-folder-now\":\"switches-folder\";return{pick:t.worktree?\"starts-worktree\":n,none:t.worktree&&t.defaultBranch?{branch:t.defaultBranch,mark:\"default\"}:t.headBranch?{branch:t.headBranch,mark:\"current\"}:{label:e.formatMessage({defaultMessage:\"Current branch\",id:\"RIn7pHYsEz\"})}}}"
   ],
   "fn": [
    "function fn(e){return e.formatMessage({defaultMessage:\"Not a Git repository\",id:\"KQdsT6K8EI\"})}"
   ],
   "pn": [
    "function pn({path:e,index:t,folders:n,roots:r,settings:i,firstWorktree:a,onChange:o}){let s=r[t+1],c=typeof s==\"string\"?r.indexOf(s):-1,l=c>=0&&c<=t?n[c]:void 0;return{settings:i[e]??{},inRepo:typeof s==\"string\"||s!==null&&void 0,sharedWith:l===void 0?void 0:{name:me(l)||l,worktree:c===0?a:i[l]?.worktree===!0},earlierUnread:r.slice(0,t+1).includes(void 0),onChange:t=>o(e,t)}}"
   ],
   "mn": [
    "function mn(e,t){return typeof e[1]==\"string\"&&e[1]===e[0]?void 0:{worktree:t?.worktree??!1,branch:t?.branch}}"
   ],
   "_n": [
    "function _n(e,t){return Object.fromEntries(Object.entries(e).filter(([e])=>e!==t))}"
   ],
   "Mn": [
    "function Mn(e,t,n,r,i,a){let o={settings:n,kind:i&&t.includes(i)?i:e&&t.includes(e.kind)?e.kind:t[0],name:r??\"\",nameDirty:r!==void 0,folder:null,additionalFolders:[],folderSettings:{},wslDistro:null,variant:null,cloudWorker:null,repos:[],sshConfigId:null,sshFolder:\"\",sshAdditionalFolders:[],sshFolderSettings:{},bridgeEnvId:null,prefill:null,settingsByKind:{},openingSettings:n,envVarsInput:\"\",envVarsState:\"idle\",",
    ",repos:e.repos.map(e=>({key:e.key,branch:e.branch??\"\"})),prefill:e};case\"ssh\":return{...o,sshConfigId:e.sshConfigId,sshFolder:e.cwd??\"\",sshAdditionalFolders:[...e.additionalFolders??[]],sshFolderSettings:{...e.folderSettings}};case\"bridge\":return{...o,bridgeEnvId:e.environmentId,prefill:e};default:return o}}"
   ],
   "Pn": [
    "function Pn(e,t){let n=[t.settings,...Object.entries(t.settingsByKind).filter(([e])=>e!==t.kind).map(([,e])=>e)];return t.nameDirty!==e.nameDirty||t.name!==e.name||t.folder!==e.folder||t.additionalFolders.join(`\n`)!==e.additionalFolders.join(`\n`)||!et(it(t.additionalFolders,t.folderSettings),it(e.additionalFolders,e.folderSettings))||t.wslDistro!==e.wslDistro||t.variant!==e.variant||t.cloudWorker!==e.cloudWorker||t.",
    ".join(`\n`)||!et(it(t.sshAdditionalFolders,t.sshFolderSettings),it(e.sshAdditionalFolders,e.sshFolderSettings))||t.bridgeEnvId!==e.bridgeEnvId||t.envVarsState===\"dirty\"||t.variantDirty&&(!e.variantDirty||JSON.stringify(t.variantRecord)!==JSON.stringify(e.variantRecord))||n.some(e=>e&&!Nn(e,t.openingSettings))}"
   ],
   "Un": [
    "function Un(e,t,n){let r=[...e];return r[Math.min(t,r.length)]=n,r}"
   ],
   "qn": [
    "function qn(e,t,n){switch(e.kind){case\"local\":{if(!e.folder)return Kn(e,t)?{kind:\"local\",cwd:\"\"}:null;let n=e.wslDistro?Ce(e.folder,e.wslDistro):e.folder;if(n===null)return null;let r=it(e.additionalFolders,e.folderSettings);return{kind:\"local\",cwd:n,...e.wslDistro?{wslDistro:e.wslDistro}:{},...e.variant&&!e.wslDistro?{variant:e.variant}:{},...e.additionalFolders.length>0&&!e.wslDistro&&!e.variant?{additionalFolders:",
    ".fromEntries(e.sshAdditionalFolders.map(t=>[t.trim(),e.sshFolderSettings[t]??{}]))):void 0;return{kind:\"ssh\",sshConfigId:e.sshConfigId,cwd:e.sshFolder.trim()||null,...t.length>0?{additionalFolders:t}:{},...r?{folderSettings:r}:{}}}case\"bridge\":return e.bridgeEnvId?{kind:\"bridge\",environmentId:e.bridgeEnvId}:null}}"
   ],
   "Sn": [
    "Sn=\"--pinned-popup-open-height\""
   ],
   "er": [
    "er=\"[--environment-dialog-cap:calc(100dvh_-_max(2rem,2*var(--desktop-titlebar-inset,0px))_-_2*max(env(safe-area-inset-top,0px),env(safe-area-inset-bottom,0px)))] max-h-[min(1056px,var(--environment-dialog-cap),calc((var(--environment-dialog-cap)_+_var(--pinned-popup-open-height,var(--environment-dialog-cap)))_/_2))]\""
   ],
   "tr": [
    "tr=\"min-h-0\""
   ],
   "$n": [
    "$n=\"flex min-h-5 items-center gap-xs\""
   ],
   "ar": [
    "ar=\"h-5\""
   ]
  },
  "reexports": {
   "sameEnvironmentName": {
    "module": "electron-environment-presets--c5272b93e.mjs",
    "name": "sameEnvironmentName"
   }
  },
  "previous": {
   "ln": "ca690a791-C6pAwzdL.js#Nt",
   "un": "ca690a791-C6pAwzdL.js#Pt",
   "dn": "ca690a791-C6pAwzdL.js#Ft",
   "fn": "ca690a791-C6pAwzdL.js#It",
   "pn": "ca690a791-C6pAwzdL.js#Lt",
   "mn": "ca690a791-C6pAwzdL.js#Rt",
   "_n": "ca690a791-C6pAwzdL.js#Vt",
   "Mn": "ca690a791-C6pAwzdL.js#en",
   "Pn": "ca690a791-C6pAwzdL.js#nn",
   "Un": "ca690a791-C6pAwzdL.js#pn",
   "qn": "ca690a791-C6pAwzdL.js#_n",
   "Sn": "ca690a791-C6pAwzdL.js#Gt",
   "er": "ca690a791-C6pAwzdL.js#wn",
   "tr": "ca690a791-C6pAwzdL.js#Tn",
   "$n": "ca690a791-C6pAwzdL.js#Cn",
   "ar": "ca690a791-C6pAwzdL.js#On"
  }
 },
 {
  "target": "environment-dialog-model.mjs",
  "source": "ca690a791-wvyOgwjo.js",
  "exports": {
   "En": "useCenteredEnvironmentHeight"
  },
  "aliases": {
   "En": null
  },
  "features": {
   "En": [
    "function En(e){let $=J9(13),{popup:t,open:n,view:r}=e,i=J1($,0,r)?K1($,0,r,()=>r):$[1],a=o(i),s=l(null),c,d;J2($,2,t,r)?(c=()=>{let e=s.current;t&&e&&r!==e.view&&Tn(t,e)},d=[t,r],K3($,2,t,r,c,d)):(c=$[4],d=$[5]),u(c,d);let f=J3($,6,a,n,t)?K3($,6,a,n,t,()=>{let e=oe(t);if(!t||!n||!e?.ResizeObserver)return;let r=e.document.documentElement,i={view:a(),height:0,window:\"\",held:!1};s.current=i;let o=0,c=()=>{let n=t.",
    "(\"resize\",c);let p=e.document;for(let e of Cn)p.addEventListener(e,l,!0);return()=>{s.current=null,u.disconnect(),d.disconnect(),e.removeEventListener(\"resize\",c);for(let e of Cn)p.removeEventListener(e,l,!0);o>0&&t.style.setProperty(\"height\",`${o}px`)}}):$[9],p=J2($,10,n,t)?K2($,10,n,t,[t,n]):$[12];u(f,p)}"
   ]
  },
  "reexports": {
   "environmentBranchOrder": {
    "module": "environment-dialog-draft.mjs",
    "name": "environmentBranchOrder"
   },
   "environmentDefaultBranch": {
    "module": "environment-dialog-draft.mjs",
    "name": "environmentDefaultBranch"
   },
   "environmentBranchLabel": {
    "module": "environment-dialog-draft.mjs",
    "name": "environmentBranchLabel"
   },
   "environmentNotRepositoryNote": {
    "module": "environment-dialog-draft.mjs",
    "name": "environmentNotRepositoryNote"
   },
   "folderCheckout": {
    "module": "environment-dialog-draft.mjs",
    "name": "folderCheckout"
   },
   "promotedFolderSettings": {
    "module": "environment-dialog-draft.mjs",
    "name": "promotedFolderSettings"
   },
   "withoutFolderSettings": {
    "module": "environment-dialog-draft.mjs",
    "name": "withoutFolderSettings"
   },
   "environmentDraft": {
    "module": "environment-dialog-draft.mjs",
    "name": "environmentDraft"
   },
   "environmentDraftDirty": {
    "module": "environment-dialog-draft.mjs",
    "name": "environmentDraftDirty"
   },
   "sameEnvironmentName": {
    "module": "electron-environment-presets--c5272b93e.mjs",
    "name": "sameEnvironmentName"
   },
   "replaceEnvironmentFolder": {
    "module": "environment-dialog-draft.mjs",
    "name": "replaceEnvironmentFolder"
   },
   "environmentTarget": {
    "module": "environment-dialog-draft.mjs",
    "name": "environmentTarget"
   },
   "pinnedPopupHeightProperty": {
    "module": "environment-dialog-draft.mjs",
    "name": "pinnedPopupHeightProperty"
   },
   "environmentDialogClass": {
    "module": "environment-dialog-draft.mjs",
    "name": "environmentDialogClass"
   },
   "environmentMinHeight": {
    "module": "environment-dialog-draft.mjs",
    "name": "environmentMinHeight"
   },
   "environmentLabelClass": {
    "module": "environment-dialog-draft.mjs",
    "name": "environmentLabelClass"
   },
   "environmentFolderLabelClass": {
    "module": "environment-dialog-draft.mjs",
    "name": "environmentFolderLabelClass"
   }
  },
  "previous": {
   "En": "ca690a791-C6pAwzdL.js#Yt"
  }
 },
 {
  "target": "sessions-page-load-hold.mjs",
  "source": "cbd6c85c8-CxDdK_2w.js",
  "exports": {
   "lf": "useSessionsPageLoadHold"
  },
  "aliases": {
   "lf": null
  },
  "features": {
   "lf": [
    "function lf(e){let $=J9(14),{pending:t,errored:n,hasRows:r,maxMs:i,backstopMs:a}=e,o=i===void 0?800:i,c=a===void 0?_r:a,l=J1($,0,t)?K1($,0,t,()=>t?null:\"none\"):$[1],[u,f]=s(l),p=u;p===null&&!t&&(p=n?\"error\":\"settled\"),p!==u&&f(p);let[m,h]=s(r);p===null&&r&&!m&&h(!0);let _=g(null),y=g(null),b=p===null&&(r||m),x,S;J1($,2,b)?(x=()=>{_.current===null&&(_.current=performance.now()),b&&y.current===null&&(y.current=performance.now())},S=[b],K2($,2,b,x,S)):(x=$[3],S=$[4]),v(x,S);let C=p===null,w,T;return J4($,5,c,C,o,b)?(w=()=>{if(!C)return;let e=performance.now(),t=b?o-(e-(y.current??e)):c-(e-(_.current??e)),n=setTimeout(()=>{f(uf)},Math.max(0,t));return()=>{clearTimeout(n)}},T=[C,b,o,c],K5($,5,c,C,o,b,w,T)):(w=$[9],T=$[10]),d(w,T),J2($,11,C,p)?K2($,11,C,p,{held:C,release:p}):$[13]}"
   ]
  },
  "previous": {
   "lf": "cbd6c85c8-D1xuycDy.js#$u"
  }
 },
 {
  "target": "sessions-page-copy.mjs",
  "source": "cbd6c85c8-CxDdK_2w.js",
  "exports": {
   "nm": "sessionsPageMixedTitle",
   "rm": "sessionsPageTitle",
   "im": "sessionsPageRowKinds",
   "am": "sessionsPageFilterLabels",
   "om": "sessionsPageActiveLabel"
  },
  "aliases": {
   "nm": null,
   "rm": null,
   "im": null,
   "am": null,
   "om": null
  },
  "features": {
   "nm": [
    "nm=Mi({defaultMessage:\"Chats and sessions\",id:\"EHMZtDEv8h\"})"
   ],
   "rm": [
    "rm=Mi({defaultMessage:\"Sessions\",id:\"F8OvMbtiW3\"})"
   ],
   "im": [
    "im=Ni({chat:{defaultMessage:\"Chat\",id:\"WTrOy36sdu\"},cowork:{defaultMessage:\"Task\",id:\"0wJ7N+noSq\"},code:{defaultMessage:\"Session\",id:\"d3wbXxu/eW\"}})"
   ],
   "am": [
    "am=Ni({all:{defaultMessage:\"All\",id:\"zQvVDJ+j59\"},chat:{defaultMessage:\"Chat\",id:\"WTrOy36sdu\"},shared:{defaultMessage:\"Shared\",id:\"BK2rqNdtQX\"},cowork:{defaultMessage:\"Cowork\",id:\"+MH0VdRCHz\"},code:{defaultMessage:\"Code\",id:\"9SUDUxrxDf\"},archived:{defaultMessage:\"Archived\",id:\"0HT+IbyW6O\"}})"
   ],
   "om": [
    "om=Mi({defaultMessage:\"Active\",id:\"mkr6ditwFt\"})"
   ]
  },
  "previous": {
   "nm": "cbd6c85c8-D1xuycDy.js#Af",
   "rm": "cbd6c85c8-D1xuycDy.js#jf",
   "im": "cbd6c85c8-D1xuycDy.js#Mf",
   "am": "cbd6c85c8-D1xuycDy.js#Nf",
   "om": "cbd6c85c8-D1xuycDy.js#Pf"
  }
 },
 {
  "target": "sessions-page-selection-bar.mjs",
  "source": "cbd6c85c8-CxDdK_2w.js",
  "exports": {
   "gp": "sessionsPageSelectionClasses",
   "_p": "sessionsPageSelectionHiddenClass",
   "yp": "SessionsPageTabsSelectionStatus",
   "bp": "SessionsPageSelectionLead"
  },
  "aliases": {
   "gp": null,
   "_p": null,
   "yp": null,
   "bp": null
  },
  "features": {
   "gp": [
    "gp={tabs:{hidden:\"@max-[540px]:hidden\",lead:\"min-w-0 @max-[540px]:flex\"},title:{hidden:\"@max-[700px]:hidden\",lead:\"min-w-7 @max-[700px]:flex\",line:\"contents @max-[700px]:flex @max-[700px]:w-[min(23rem,100cqi)] @max-[700px]:flex-wrap @max-[700px]:items-center @max-[700px]:justify-end @max-[700px]:gap-2 @max-[460px]:w-[100cqi]\"}}"
   ],
   "_p": [
    "function _p(e){return gp[e].hidden}"
   ],
   "yp": [
    "function yp(e){let $=J9(2);return J1($,0,e)?K1($,0,e,a(vp,{...e,header:\"tabs\",\"data-cds-part\":\"tabs-status\"})):$[1]}"
   ],
   "bp": [
    "function bp(e){let $=J9(6),{lead:t,leadCheckboxRef:n,children:r}=e;if(!t)return r;let i=J2($,0,t,n)?K2($,0,t,n,a(vp,{...t,checkboxRef:n,header:\"title\"})):$[2];return J2($,3,r,i)?K2($,3,r,i,o(\"div\",{className:gp.title.line,children:[i,r]})):$[5]}"
   ]
  },
  "previous": {
   "gp": "cbd6c85c8-D1xuycDy.js#Gd",
   "_p": "cbd6c85c8-D1xuycDy.js#Kd",
   "yp": "cbd6c85c8-D1xuycDy.js#Jd",
   "bp": "cbd6c85c8-D1xuycDy.js#Yd"
  }
 },
 {
  "target": "sessions-page-bulk-actions.mjs",
  "source": "cbd6c85c8-CxDdK_2w.js",
  "exports": {
   "Bf": "sessionsPageBulkMenuEnabled",
   "Vf": "SessionsPageBulkActions"
  },
  "aliases": {
   "Bf": null,
   "Vf": null
  },
  "features": {
   "Bf": [
    "function Bf(e){return Ie(xf,e===void 0||e)}"
   ],
   "Vf": [
    "function Vf(e){let $=J9(3),t=Bf();return J2($,0,t,e)?K2($,0,t,e,t?a(Wf,{...e}):o(c,{children:[e.onArchive&&a(Hf,{...e}),e.onUnarchive&&a(Uf,{...e}),e.onDelete&&a(O,{variant:\"danger\",disabled:e.disabled,onClick:e.onDelete,children:a(Z,{defaultMessage:\"Delete\",id:\"K3r6DQW7h+\"})})]})):$[2]}"
   ]
  },
  "previous": {
   "Bf": "cbd6c85c8-D1xuycDy.js#Dd",
   "Vf": "cbd6c85c8-D1xuycDy.js#Od"
  }
 },
 {
  "target": "sessions-page-row.mjs",
  "source": "cbd6c85c8-CxDdK_2w.js",
  "exports": {
   "Rm": "SessionsPageRow",
   "zm": "SessionsPageRowStatus"
  },
  "aliases": {
   "Rm": null,
   "zm": null
  },
  "features": {
   "Rm": [
    "Rm=u(function(e){let $=J9(49),{session:t,lowerQuery:n,showSharedBadge:r,showArchivedBadge:s,textFirstRows:l}=e,u=Pi(),d=wa(t),f=J1($,0,d)?K1($,0,d,e=>co(d,e.readState,e.tracking?e.viewingChats:null)):$[1],p=pi(f),m=J1($,2,d.source.data)||J1($,3,d.source.kind)?I1($,3,Z1($,2,e=>e.tracking&&d.source.kind===\"chat\"&&e.viewingChats[d.source.data.uuid]!==void 0,d.source.data),d.source.kind):$[4],h=pi(m),g=J3($,5,h,p,d)?K3($",
    ")||J1($,36,d.updatedAtMs)?I1($,36,Z1($,35,a(Nc,{children:a(gi,{date:d.updatedAtMs,locale:u.locale})}),u.locale),d.updatedAtMs):$[37],F=J4($,38,j,M,N,P)?K4($,38,j,M,N,P,o(Tc,{children:[j,M,N,P]})):$[42];return J5($,43,F,O,k,A,w)?K5($,43,F,O,k,A,w,a(Pc,{leading:O,title:w,titleAccessories:k,subline:A,rail:F})):$[48]})"
   ],
   "zm": [
    "function zm(e){let $=J9(11),{session:t}=e;if(Ra(t))return null;let n=J1($,0,t)?K1($,0,t,ao(t)):$[1],r=n===\"idle\"&&t.ref.kind===\"cowork\"&&t.isUnread?\"ready\":n;if(r===\"idle\"||r===\"pr\")return null;let i=J2($,2,t,r)?K2($,2,t,r,r===\"awaiting\"?Bm(t):void 0):$[4],o=t.source.kind===\"code\"?\"code\":\"cowork\",s=t.source.kind===\"cowork\"||t.source.kind===\"code\"?t.source.data.errorCategory:void 0,c=t.source.kind===\"code\"?t.source.data.remote:void 0;return J5($,5,r,i,o,s,c)?K5($,5,r,i,o,s,c,a(Kn,{state:r,label:i,errorSurface:o,errorCategory:s,remote:c,tooltip:!1})):$[10]}"
   ]
  },
  "adapters": {
   "shared-39-ZCs0lAwB.js": {
    "Ct": {
     "name": "useSessionPageRow",
     "module": "../../source-sessions-adapters.jsx",
     "features": [
      "function JT(e){let $=J9(3),t=Sx(e.ref.kind===\"code\"?e.ref.id:null);return J2($,0,t,e)?K2($,0,t,e,KT(e,t)):$[2]}"
     ]
    },
    "yt": {
     "name": "sessionPageReadMark",
     "module": "../../source-sessions-adapters.jsx",
     "features": [
      "function FE(e,t,n){if(e.source.kind===\"chat\"){let t=n!==null&&n[e.source.data.uuid]!==void 0?e.chatTabLiveStatus??\"idle\":e.liveStatus;return Zw(e.source.data,t,n)}return e.source.kind===\"cowork\"?Go(e.source.data,t):e.isUnread"
     ]
    }
   },
   "shared-2-CsjIBQD8.js": {
    "ms": {
     "name": "useSessionPageReadState",
     "module": "../../source-sessions-adapters.jsx",
     "features": [
      "wH=Ep()(()=>({readState:null,viewingChats:CH,tracking:!1}))"
     ]
    }
   }
  },
  "previous": {
   "Rm": "cbd6c85c8-D1xuycDy.js#dp",
   "zm": "cbd6c85c8-D1xuycDy.js#fp"
  }
 },
 {
  "target": "approval-read-gate.mjs",
  "source": "cc32965c2-CpdpcYvh.js",
  "exports": {
   "gl": "ApprovalReadRows",
   "ul": "createReadTracker",
   "cl": "readLineVisible"
  },
  "aliases": {
   "gl": null,
   "ul": null,
   "cl": null
  },
  "features": {
   "gl": [
    "function gl(e){let $=J9(8),{onReadState:n,onFits:r,headIsFirstLine:i,children:a}=e,o=i!==void 0&&i,s=m(null),c=fl(),l,u;return J4($,0,c,o,r,n)?(l=()=>{let e=s.current,t=se(e);if(e===null||t===null){n(\"read\");return}let i=null,a=ul(e,t,()=>i?.()),l=n=>{if(i===null&&(i=()=>l(n)),e.clientHeight===0){n(\"unlaid\");return}let s=Number.parseFloat(t.getComputedStyle(e).lineHeight);if(!Number.isFinite(s)){n(\"unread\");return}",
    ",\"last\"));n(d&&f&&p?a.waiting()?\"waiting\":\"read\":\"unread\"),r?.(c)},u=dl(e,t,[],l,n);return c.current=()=>{a.forget(),u.kick()},()=>{c.current=null,i=null,a.forget(),u.stop()}},u=[n,r,o,c],K5($,0,c,o,r,n,l,u)):(l=$[4],u=$[5]),g(l,u),J1($,6,a)?K1($,6,a,t(\"div\",{ref:s,\"data-testid\":\"approval-read-rows\",children:a})):$[7]}"
   ],
   "ul": [
    "function ul(e,t,n){let r=new Set,i=new Map,a={width:NaN,tall:NaN},o=a,s=!1,c,l=t=>Math.abs(e.clientWidth-t.width)>ll||Math.abs(e.scrollHeight-t.tall)>ll,u=()=>{c!==void 0&&(t.cancelAnimationFrame(c),c=void 0)},d=()=>{u();let r=a,o=()=>{c=void 0;let e=l(r);if(!(!e&&!(r.width>ll))){s=!e;try{n()}finally{s=!1}}};c=t.requestAnimationFrame(()=>{try{for(let t of i.values())t.atFirstFrame===void 0&&(t.atFirstFrame=e.clientHeight!==0&&t.now())}finally{c=t.requestAnimationFrame(o)}})};return{pass:()=>{o={width:e.clientWidth,tall:e.scrollHeight},i.size>0&&l(a)&&(i.clear(),u()),i.size>0&&c===void 0&&!s&&d()},seen:(e,t,n=t)=>{if(r.has(e))return!0;let c=i.get(e);if(c!==void 0){if(c.now=t,!s)return!0;if(i.delete(e),c.atFirstFrame===!0&&n())return r.add(e),!0}return t()?(i.size===0&&(a=o),i.set(e,{now:t}),d(),!0):!1},waiting:()=>i.size>0,forget:()=>{r.clear(),i.clear(),u()}}}"
   ],
   "cl": [
    "function cl(e,t,n,r){let i=e.getBoundingClientRect();if(i.height===0)return!0;let a=r===\"first\"?i.top:i.bottom-n,o={top:a,bottom:a+n,left:i.left,right:i.right,width:i.width,height:n};if(o.top<-2||o.bottom>t.innerHeight+2)return!1;let s=Ln(e,{box:o,ownScope:e.closest(\"[data-approval-card-root]\")});return s===null||s.top<=o.top+2&&s.bottom>=o.bottom-2}"
   ]
  },
  "previous": {
   "gl": "cc32965c2-BQu1bA_w.js#jc",
   "ul": "cc32965c2-BQu1bA_w.js#Dc",
   "cl": "cc32965c2-BQu1bA_w.js#Tc"
  }
 },
 {
  "target": "dev-server-description.mjs",
  "source": "cc32965c2-CpdpcYvh.js",
  "exports": {
   "Ty": "devServerDescription"
  },
  "aliases": {
   "Ty": null
  },
  "features": {
   "Ty": [
    "function Ty(e,t,n,r=!1){let i=n===void 0?void 0:String(n);if(t&&i)return r?e.formatMessage({defaultMessage:\"Runs in {cwd} on port {port} (or the next free port)\",id:\"/nE6wpuaxv\"},{cwd:t,port:i}):e.formatMessage({defaultMessage:\"Runs in {cwd} on port {port}\",id:\"S1oY6Vmtwp\"},{cwd:t,port:i});if(t)return e.formatMessage({defaultMessage:\"Runs in {cwd}\",id:\"CRphUwSUz6\"},{cwd:t});if(i)return r?e.formatMessage({defaultMessage:\"Runs on port {port} (or the next free port)\",id:\"1DMkW/ET4Z\"},{port:i}):e.formatMessage({defaultMessage:\"Runs on port {port}\",id:\"mzRFXDzBHG\"},{port:i})}"
   ]
  },
  "previous": {
   "Ty": "cc32965c2-BQu1bA_w.js#kg"
  }
 },
 {
  "target": "session-menu-tooltip.mjs",
  "source": "cc43287c9-dzfX-J5i.js",
  "exports": {
   "DX": "sessionMenuTooltipLabel",
   "EX": "sessionMenuTooltipLimit"
  },
  "aliases": {
   "DX": null,
   "EX": null
  },
  "features": {
   "DX": [
    "function DX(e){let $=J9(265),{sessionRef:t,title:n,onSessionRemoved:r,paneIndex:i}=e,a=i===void 0?0:i,o=o_(),s=ne(),c=_e(),l=er(),u=nu(),{addSuccess:d,addError:f}=Ns(),m=nd(),g=J1($,0,t)?K1($,0,t,AD(t)):$[1],_=J1($,2,g)?K1($,2,g,{session_type:g}):$[3],{mutate:b,isPending:x,variables:S}=aI(),C=mC(t?.type===\"local\"?t.id:void 0),T=vn(na),E=BB(a),{exportSession:D,canExport:O}=oI(),{debugShare:k}=sI(),{data:A}=XS(t,wX),{",
    "})})})):$[249],Tn=J5($,250,xn,Sn,Cn,wn,xe)?K5($,250,xn,Sn,Cn,wn,xe,h(y,{children:[xn,Sn,Cn,wn,xe]})):$[255];return J5($,256,_n,X,xt,G,mn,yn,bn,Tn)?K5($,256,_n,X,xt,G,mn,yn,bn,Tn,{..._n,isShared:G,isLifecycleBlocked:xt,sharedMenuProps:mn,overflowMenuProps:yn,foldedShare:X,transcriptViewSessionId:bn,modals:Tn}):$[264]}"
   ],
   "EX": [
    "EX=80"
   ]
  },
  "readBy": {
   "EX": "DX"
  },
  "select": {
   "DX": {
    "conditional": "at.length<=EX||lg(at,EX)===at",
    "parameters": "at"
   }
  },
  "previous": {
   "DX": "cc43287c9-Me-M2ucD.js#YW",
   "EX": "cc43287c9-Me-M2ucD.js#JW"
  }
 },
 {
  "target": "titlebar-draft-title.mjs",
  "source": "cc43287c9-dzfX-J5i.js",
  "exports": {
   "RX": "titlebarDraftTitle"
  },
  "aliases": {
   "RX": null
  },
  "features": {
   "RX": [
    "function RX(e){let $=J9(201),{sessionRef:t,episodeKey:n,title:r,isTitleLoading:i,isOnlyNamePending:a,spawn:o,agent:s,isTopLeft:c,dragHandle:l,onSessionRemoved:d,paneIndex:f,isInsidePopoutWindow:m,trailing:g,draftTitle:_,railMode:v,railToggle:b,railToggleRef:x,onSessionPillRoom:S,isSessionNotFound:C,lifted:T,safetyPillHidden:E,seeThrough:D}=e,O=a!==void 0&&a,k=f===void 0?0:f,A=m!==void 0&&m,j=v!==void 0&&v,N=C!==void",
    ")?K0($,187,on(\"header\")):$[187];return J5($,188,Pt,l,gt,F,Me,L,pt,Ft,It,Lt,Rt,zt)?K5($,188,Pt,l,gt,F,Me,L,pt,Ft,It,Lt,Rt,zt,p(xp,{lifted:F,label:Ft,barRef:xe,sectionsRef:Se,startScreen:It,paneAtEnd:Lt,staticTitle:pt,lead:gt,grip:l,cluster:Pt,seeThrough:L,\"data-top-left\":Rt,\"data-top-right\":zt,...Bt,style:Me})):$[200]}"
   ]
  },
  "select": {
   "RX": {
    "conditional": "!t&&!o&&_",
    "parameters": "t, o, _"
   }
  },
  "previous": {
   "RX": "cc43287c9-Me-M2ucD.js#oG"
  }
 },
 {
  "target": "tile-fit-opened.mjs",
  "source": "cc43287c9-dzfX-J5i.js",
  "exports": {
   "oje": "fitOpenedLayout",
   "R9": "withRoomForChat"
  },
  "aliases": {
   "oje": null,
   "R9": null
  },
  "features": {
   "oje": [
    "function oje(e){let{layout:t,tileById:n,splitConfig:r}=e,i=t.root;if(i.kind!==\"stack\"||i.direction!==\"row\")return t;let a=QD(r,{width:e.containerWidth,height:0}).width,o=R9(i,a,n,r,!e.rootRowOnly);return o===i?t:{root:o}}"
   ],
   "R9": [
    "function R9(e,t,n,r,i){if(e.kind!==\"stack\")return e;let a=e;if(e.direction===\"row\"){let i=t-r.gap*(e.children.length-1),o=e.children.map(e=>nh(e,\"row\",n,r,{overflowMinReachable:!0})),s=i-o.reduce((e,t)=>e+t,0);if(s>0){let t=e.children.map(e=>e.flex),c=Ph(t,o,i),l=Ph(t,e.children.map((e,t)=>Math.min(nh(e,\"row\",n,r),o[t]+s)),i);l.every((e,t)=>Math.abs(e-c[t])<1e-6)||(a={...e,children:e.children.map((e,t)=>({...e,flex:l[t]}))})}}if(!i)return a;let o=a,s=[];eg(o,{width:t,height:0},n,r,(e,t,n,r,i)=>{if(e===o){if(i===null)throw c(Error(\"withRoomForChat: walkResolvedFlexes gave no box for a child of a sized stack\"),\"withRoomForChat: walkResolvedFlexes gave no box for a child of a sized stack\",\"literal\");s[n]=i.width}});let l=o.children.map((e,t)=>R9(e,s[t],n,r,!0));return l.every((e,t)=>e===o.children[t])?o:{...o,children:l}}"
   ]
  },
  "previous": {
   "oje": "cc43287c9-Me-M2ucD.js#dbe",
   "R9": "cc43287c9-Me-M2ucD.js#B9"
  }
 },
 {
  "target": "environment-menu-rows.mjs",
  "source": "cc43287c9-dzfX-J5i.js",
  "exports": {
   "h3": "EnvironmentPickerRow",
   "Nce": "EnvironmentPickerRows",
   "Pce": "EnvironmentPickerNew",
   "D3": "EnvironmentPickerComputer",
   "j3": "environmentPresetKey",
   "H3": "EnvironmentPickerNote",
   "Q3": "EnvironmentPickerNoMatches"
  },
  "aliases": {
   "h3": null,
   "Nce": null,
   "Pce": null,
   "D3": null,
   "j3": null,
   "H3": null,
   "Q3": null
  },
  "features": {
   "h3": [
    "function h3(e){let $=J9(28),{item:t,environments:n,closeMenu:r,starred:i,shortcut:a,iconless:o,kindHint:s}=e,c=o!==void 0&&o,{selectedId:l,onSelect:u,onEdit:d}=n,f=ZA(),m=J1($,0,r)||J2($,1,t.id,d)?I2($,1,Z1($,0,d?()=>{r(),d(t.id)}:void 0,r),t.id,d):$[3],g=c?void 0:t.icon,_=t.id===l,v=J3($,4,m,t,i)?K3($,4,m,t,i,m||i!==void 0?h(y,{children:[m&&p(Xj,{onOpen:m}),i!==void 0&&p(PA,{starred:i,onToggle:()=>Qi(ya(t),ca(t))})]}):void 0):$[7],b=J3($,8,s,_,v)?K3($,8,s,_,v,cA(_,s,v)):$[11],x=J2($,12,t.id,u)?I2($,12,()=>u(t.id),t.id,u):$[14],S=J2($,15,m,f)?K2($,15,m,f,m?e=>{e.key===f&&(e.preventDefault(),e.stopPropagation(),m())}:void 0):$[17],C=J1($,18,m)?K1($,18,m,m&&p(IA,{edit:!0})):$[19];return J5($,20,t.name,a,g,b,x,S,C)?I5($,20,h(K.Item,{labelDir:\"auto\",icon:g,...b,\"aria-keyshortcuts\":a,\"data-testid\":\"env-picker-environment\",onClick:x,onKeyDown:S,children:[t.name,C]}),t.name,a,g,b,x,S,C):$[27]}"
   ],
   "Nce": [
    "function Nce(e){let $=J9(21),{kind:t,environments:n,closeMenu:r,starred:i,query:a,placesFollow:o,leaveOut:s}=e,c=a===void 0?\"\":a,l=o===void 0||o,u=n.items,d,f;if(J5($,0,r,n,t,s,c,i)){f=Symbol.for(\"react.early_return_sentinel\");bb0:{let e=J3($,8,t,s,c)?K3($,8,t,s,c,e=>(e.target?.kind??\"local\")===t&&(!c||e.name.toLowerCase().includes(c))&&!s?.(e)):$[11],a=u.filter(e);if(a.length===0){f=null;break bb0}let o=J3($,12,r,n,i)?K3($,12,r,n,i,e=>p(h3,{item:e,environments:n,closeMenu:r,starred:i&&Xi(i,ca(e))},e.id)):$[15];d=a.map(o)}K5($,0,r,n,t,s,c,i,d,f)}else d=$[6],f=$[7];if(f!==Symbol.for(\"react.early_return_sentinel\"))return f;let m=J1($,16,l)?K1($,16,l,l&&p(K.Separator,{})):$[17];return J2($,18,d,m)?K2($,18,d,m,h(y,{children:[d,m]})):$[20]}"
   ],
   "Pce": [
    "function Pce(e){let $=J9(8),{environments:t,shortcut:n,closeMenu:r}=e,{onNew:i}=t;if(!i)return null;let a=J0($,0)?K0($,0,p(K.Separator,{})):$[0],o=J2($,1,r,i)?K2($,1,r,i,()=>{r(),i()}):$[3],s=J0($,4)?K0($,4,p(a_,{defaultMessage:\"New environment\",id:\"YxxUA60sT0\"})):$[4];return J2($,5,n,o)?K2($,5,n,o,h(y,{children:[a,p(K.Item,{icon:\"Add\",\"aria-keyshortcuts\":n,\"data-testid\":\"env-picker-new-environment\",onClick:o,children:s})]})):$[7]}"
   ],
   "D3": [
    "function D3(e){let $=J9(61),{grouped:t,inStartPage:n,checked:r,shortcut:i,runsIn:a,available:o,desktopOnlyHint:s,locked:c,reason:l,downloadCta:u,onDownload:d,onPick:f,settingsOffered:m,machineVarsQueried:g,onOpenSettings:_,star:v,runInChoices:b,iconless:x}=e,S=x!==void 0&&x,C=o_(),w=ZA(),T=sV(g),E=m&&(!n||T);if(b){let e=S?void 0:\"Laptop\",t=J2($,0,_,E)?K2($,0,_,E,E&&p(Xj,{onOpen:_})):$[2],n=J3($,3,a,v,t)?K3($,3,a,v,t,",
    ":\"sr-only\",children:p(a_,{defaultMessage:\", downloads the Claude desktop app\",id:\"V3naafDoCJ\"})})):$[48];return J5($,49,l,i,F,I,L,R,D,O,M,N,P)?K5($,49,l,i,F,I,L,R,D,O,M,N,P,h(K.Item,{icon:D,\"data-testid\":O,...M,\"aria-keyshortcuts\":i,disabled:N,\"aria-description\":l,onClick:P,onKeyDown:F,children:[I,L,R]})):$[60]}"
   ],
   "j3": [
    "function j3(e){return`preset:${e.id}`}"
   ],
   "H3": [
    "function H3(e){let $=J9(2),{children:t}=e;return J1($,0,t)?K1($,0,t,p(\"div\",{className:\"px-md py-sm text-footnote text-muted-as-secondary\",children:t})):$[1]}"
   ],
   "Q3": [
    "function Q3(){let $=J9(1);return J0($,0)?K0($,0,p(H3,{children:p(a_,{defaultMessage:\"No matches\",id:\"96GJ5wSQam\"})})):$[0]}"
   ]
  },
  "adapters": {
   "shared-55-BRv2XBP7.js": {
    "Ts": {
     "name": "toggleEnvironmentStar",
     "module": "../../source-environment-menu-adapters.jsx",
     "features": [
      "function uw(e,t=[e]){let{starredIds:n,toggleStarred:r}=ZC.getState();if(!lw(n,t)){r(e);return}ZC.setState({starredIds:n.filter(e=>!t.some(t=>t===e))})}"
     ]
    }
   },
   "shared-frame-CJdE5Ria.js": {
    "Vs": {
     "name": "EnvironmentPickerMenu",
     "module": "../../source-environment-menu-adapters.jsx",
     "features": [
      "UD=Object.assign(xD,{Root:TD,Bar:HD,Trigger:ye,TriggerButton:DD,Popup:rD,Item:cD,Separator:fD,Group:we,GroupLabel:hD,Header:mD,Submenu:dD,SubmenuTrigger:lD,SearchablePopup:PD,PendingList:VD})"
     ]
    }
   }
  },
  "previous": {
   "h3": "cc43287c9-Me-M2ucD.js#m8",
   "Nce": "cc43287c9-Me-M2ucD.js#Rae",
   "Pce": "cc43287c9-Me-M2ucD.js#zae",
   "D3": "cc43287c9-Me-M2ucD.js#uoe",
   "j3": "cc43287c9-Me-M2ucD.js#w8",
   "H3": "cc43287c9-Me-M2ucD.js#D8",
   "Q3": "cc43287c9-Me-M2ucD.js#M8"
  }
 },
 {
  "target": "electron-environment-presets.mjs",
  "source": "cd0cf5b5e-DJvJrkr3.js",
  "electron": "electron/generated/environment-presets.mjs",
  "exports": {
   "h": "sameEnvironmentTarget",
   "_": "isFolderlessLocal",
   "b": "folderCheckoutSettings",
   "we": "sameFolderSettings",
   "S": "cleanEnvironmentSettings",
   "C": "splitEnvironmentSettings",
   "Ne": "readEnvironmentRecord",
   "O": "withoutPermissionMode",
   "k": "recentEnvironments"
  },
  "aliases": {
   "h": "k",
   "_": "b",
   "b": "p",
   "we": "E",
   "S": null,
   "C": "N",
   "Ne": null,
   "O": null,
   "k": "S"
  },
  "features": {
   "h": [
    "function h(e,t){switch(e.kind){case\"local\":return t.kind===\"local\"&&e.cwd===t.cwd&&e.wslDistro===t.wslDistro&&e.variant===t.variant&&me(e.additionalFolders??[],t.additionalFolders??[]);case\"cloud\":return t.kind===\"cloud\"&&e.worker.type===t.worker.type&&e.worker.id===t.worker.id&&he(e.repos,t.repos);case\"ssh\":return t.kind===\"ssh\"&&e.sshConfigId===t.sshConfigId&&ee(e.cwd,t.cwd)&&me(e.additionalFolders??[],t.additionalFolders??[]);case\"bridge\":return t.kind===\"bridge\"&&e.environmentId===t.environmentId}}"
   ],
   "_": [
    "function _(e){return e.kind===\"local\"&&e.cwd===\"\"&&!e.wslDistro&&!e.variant}"
   ],
   "b": [
    "function b(e,t){let n={};for(let r of e){let{worktree:e,branch:i}=t?.[r]??{};e===!0&&(n[r]={worktree:e,...i?{branch:i}:{}})}return Object.keys(n).length>0?n:void 0}"
   ],
   "we": [
    "function we(e,t){return[...new Set([...Object.keys(e??{}),...Object.keys(t??{})])].every(n=>e?.[n]?.worktree===!0==(t?.[n]?.worktree===!0)&&(e?.[n]?.branch||void 0)===(t?.[n]?.branch||void 0))}"
   ],
   "S": [
    "function S(e){if(typeof e!=\"object\"||!e)return;let t=e,n={};for(let e of ke)y(t[e])&&(n[e]=t[e]);for(let e of Oe)typeof t[e]==\"boolean\"&&(n[e]=t[e]);return Object.keys(n).length>0?n:void 0}"
   ],
   "C": [
    "function C(e){let{worktree:t,branch:n,...r}=e??{},i={...t===void 0?{}:{worktree:t},...n===void 0?{}:{branch:n}},a=Object.fromEntries(Object.entries(r).filter(([,e])=>e!==void 0));return{place:Object.keys(i).length>0?i:void 0,session:Object.keys(a).length>0?a:void 0}}"
   ],
   "Ne": [
    "function Ne(e){if(typeof e!=\"object\"||!e)return null;let t=e;if(!y(t.id)||typeof t.name!=\"string\"||typeof t.createdAt!=\"number\"||typeof t.lastUsedAt!=\"number\"||!De(t.target))return null;let{place:n,session:r}=C(S(t.settings));return{environment:{id:t.id,name:t.name,createdAt:t.createdAt,lastUsedAt:t.lastUsedAt,target:x(t.target),...n?{settings:n}:{}},session:r}}"
   ],
   "O": [
    "function O(e){if(typeof e!=\"object\"||!e)return e;let{permissionMode:t,...n}=e;return n}"
   ],
   "k": [
    "function k(e){return[...e].sort((e,t)=>t.lastUsedAt-e.lastUsedAt)}"
   ]
  },
  "reexports": {
   "sameEnvironmentName": {
    "module": "electron-environment-presets--c5272b93e.mjs",
    "name": "sameEnvironmentName"
   },
   "availableEnvironmentName": {
    "module": "electron-environment-presets--c5272b93e.mjs",
    "name": "availableEnvironmentName"
   },
   "uniqueEnvironmentName": {
    "module": "electron-environment-presets--c5272b93e.mjs",
    "name": "uniqueEnvironmentName"
   }
  },
  "previous": {
   "h": "cd0cf5b5e-BCzJmEwZ.js#m",
   "_": "cd0cf5b5e-BCzJmEwZ.js#g",
   "b": "cd0cf5b5e-BCzJmEwZ.js#y",
   "we": "cd0cf5b5e-BCzJmEwZ.js#ke",
   "S": "cd0cf5b5e-BCzJmEwZ.js#x",
   "C": "cd0cf5b5e-BCzJmEwZ.js#S",
   "Ne": "cd0cf5b5e-BCzJmEwZ.js#Re",
   "O": "cd0cf5b5e-BCzJmEwZ.js#D",
   "k": "cd0cf5b5e-BCzJmEwZ.js#O"
  }
 },
 {
  "target": "file-view-memory.mjs",
  "source": "cd2efac6e-B38TGyig.js",
  "exports": {
   "iu": "rememberFileView",
   "au": "readFileView"
  },
  "aliases": {
   "iu": null,
   "au": null
  },
  "features": {
   "iu": [
    "function iu(e,t){if(e!==null&&(q.delete(e),!(t.view===null&&!t.forcedText&&!t.toldNoSftp&&!t.mediaAsText)&&(q.set(e,t),q.size>ru))){let e=q.keys().next();e.done||q.delete(e.value)}}"
   ],
   "au": [
    "function au(e){return e===null?void 0:q.get(e)}"
   ]
  },
  "previous": {
   "iu": "cd2efac6e-Be7wcc4w.js#Fc",
   "au": "cd2efac6e-Be7wcc4w.js#Ic"
  }
 },
 {
  "target": "file-text-decoding.mjs",
  "source": "cd2efac6e-B38TGyig.js",
  "exports": {
   "Uf": "hasReplacementLoss",
   "Wf": "utf8ByteLength",
   "Zf": "needsPlainTextView"
  },
  "aliases": {
   "Uf": null,
   "Wf": null,
   "Zf": null
  },
  "features": {
   "Uf": [
    "function Uf(e,t){return e.includes(\"\\uFFFD\")?t===void 0||Wf(e,t)>t:!1}"
   ],
   "Wf": [
    "function Wf(e,t=1/0){let n=0;for(let r=0;r<e.length&&n<=t;r++){let t=e.charCodeAt(r);t<128?n+=1:t<2048?n+=2:t>=55296&&t<56320&&(e.charCodeAt(r+1)&64512)==56320?(n+=4,r++):n+=3}return n}"
   ],
   "Zf": [
    "function Zf({contents:e,encoding:t,filePath:n,hasPreview:r,isRemoteImageEscape:i}){return!r&&Pn.test(n)||t===\"base64\"||i||ao(e)}"
   ]
  },
  "previous": {
   "Uf": "cd2efac6e-Be7wcc4w.js#vd",
   "Wf": "cd2efac6e-Be7wcc4w.js#yd",
   "Zf": "cd2efac6e-Be7wcc4w.js#Ed"
  }
 },
 {
  "target": "electron-file-text-decoder.mjs",
  "source": "cd2efac6e-B38TGyig.js",
  "electron": "electron/generated/file-text-decoder.mjs",
  "exports": {
   "Rf": "detectTextEncoding",
   "Vf": "decodeFileBytes",
   "Mf": "detectionSampleBytes",
   "If": "maximumTextBytes"
  },
  "aliases": {
   "Rf": null,
   "Vf": null,
   "Mf": null,
   "If": null
  },
  "features": {
   "Rf": [
    "function Rf(e){let t=0,n=0,r=0,i=0,a=0;for(let o=0;o<e.length;o++)e[o]===0?o%2==0?t++:(n++,r+=+(e[o-1]===0)):e[o]>=128&&(i++,a+=+(e[o-1]>=128));let o=null;if(e[0]===255&&e[1]===254?o=\"utf-16le\":e[0]===254&&e[1]===255?o=\"utf-16be\":e.length>=16&&r===0&&Math.max(t,n)*4>=e.length&&(o=n>t?\"utf-16le\":\"utf-16be\"),o!==null)return zf(new TextDecoder(o).decode(e))?{reject:\"utf16_control\"}:{encoding:o};let s=new TextDecoder(\"utf-8\",{ignoreBOM:!0}).decode(e,{stream:e.length>=Mf});if(s.includes(\"\\0\"))return{reject:\"nul_in_head\"};let c=0,l=0;for(let e=0;e<s.length;e++){let t=s.charCodeAt(e);c+=+(t===65533),l+=+(t>=128&&t!==65533)}return c>0&&l===0&&i*5<=e.length&&a*2<i&&!zf(new TextDecoder(\"windows-1252\").decode(e))?{encoding:\"windows-1252\"}:ao(s)?{reject:l>0?\"utf8_mixed\":i*5>e.length?\"non_ascii_dense\":a*2>=i?\"non_ascii_runs\":\"cp1252_control\"}:{encoding:\"utf-8\"}}"
   ],
   "Vf": [
    "function Vf(e){let t=Rf(e.subarray(0,Mf));return\"reject\"in t?{reason:\"not_text\",reject:t.reject}:e.byteLength>If?{reason:\"too_large\"}:Hf(t.encoding,e)}"
   ],
   "Mf": [
    "Mf=24576"
   ],
   "If": [
    "If=52428800"
   ]
  },
  "previous": {
   "Rf": "cd2efac6e-Be7wcc4w.js#pd",
   "Vf": "cd2efac6e-Be7wcc4w.js#gd",
   "Mf": "cd2efac6e-Be7wcc4w.js#cd",
   "If": "cd2efac6e-Be7wcc4w.js#dd"
  }
 },
 {
  "target": "breadcrumb-paths.mjs",
  "source": "cd2efac6e-B38TGyig.js",
  "exports": {
   "Xu": "segmentClass",
   "Zu": "segmentKeys",
   "ud": "breadcrumbSegments",
   "cd": "segmentMenuTarget"
  },
  "aliases": {
   "Xu": null,
   "Zu": null,
   "ud": null,
   "cd": null
  },
  "features": {
   "Xu": [
    "Xu=\"rounded-[3px] px-0.75 bg-transparent border-0 text-start cursor-default focus-visible:outline-hidden hide-focus-ring focus-visible:shadow-focus hover:bg-fill-ghost-hover aria-expanded:bg-fill-ghost-hover\""
   ],
   "Zu": [
    "function Zu(e,t){if(e.altKey||e.ctrlKey||e.metaKey||e.shiftKey)return;if(e.key===\"ArrowDown\"){e.preventDefault(),t();return}if(e.key!==\"ArrowLeft\"&&e.key!==\"ArrowRight\")return;let n=Array.from(e.currentTarget.closest(\"[data-file-breadcrumb]\")?.querySelectorAll(\"[data-breadcrumb-segment]\")??[]),r=n.indexOf(e.currentTarget),i=n[e.key===\"ArrowRight\"?r+1:r-1];r>=0&&i&&(e.preventDefault(),i.focus())}"
   ],
   "ud": [
    "function ud({displayPath:e,fullPath:t,root:n,posix:r}){let i=r?/\\//:/[\\\\/]/,a=i.test(t[0]??\"\")?[t[0]]:[];for(let e=1;e<t.length-1;e++)i.test(t[e])&&a.push(t.slice(0,e));let o=e=>e!==void 0&&Vo(e,n,r)?e:void 0,[s,c]=vn(e,{posix:r}),l=s.split(i).filter(e=>e!==\"\"),u=a.length-l.length,d=e=>e===\".\"||e===\"..\",f=t.split(i).some(d)&&![...l,c].some(d),p=l.map((e,t)=>{let n=u<0||f?void 0:a[u+t];return{label:e,absPath:n??l.slice(0,t+1).join(\"/\"),listsDir:o(n),...n===void 0&&{unlined:!0}}});return{lead:(r?/^\\/+/:/^[\\\\/]+/).exec(s)?.[0]??\"\",dirs:p,name:{label:c,absPath:t,listsDir:o(a.at(-1))}}}"
   ],
   "cd": [
    "function cd(e,t,n){let r=t?e.absPath:e.listsDir??e.absPath;if(!(e.unlined||!Fn(r)||zt(r)))return{absPath:r,isDirectory:!t,isName:t,heading:e.spoken===void 0?void 0:jn(r,n)}}"
   ]
  },
  "reexports": {
   "pathWithinRoot": {
    "module": "breadcrumb-within-root.mjs",
    "name": "pathWithinRoot"
   }
  },
  "previous": {
   "Xu": "cd2efac6e-Be7wcc4w.js#El",
   "Zu": "cd2efac6e-Be7wcc4w.js#Dl",
   "ud": "cd2efac6e-Be7wcc4w.js#Bl",
   "cd": "cd2efac6e-Be7wcc4w.js#Rl"
  }
 },
 {
  "target": "titlebar-fold-measure.mjs",
  "source": "cd54a5401-BT1wL8jM.js",
  "exports": {
   "en": "titlebarFoldLimits",
   "Qt": "titlebarShareSlotAttribute"
  },
  "aliases": {
   "en": "l",
   "Qt": null
  },
  "features": {
   "en": [
    "function en({railToggleFoldable:e,paneSlots:t,hiddenCount:n}){return{maxHidden:e?t+1:6,railToggleFolded:e&&n>t,hiddenMainPanes:Math.min(n,t)}}"
   ],
   "Qt": [
    "Qt=\"data-titlebar-share-slot\""
   ]
  },
  "previous": {
   "en": "cd54a5401-wFztHb-d.js#qt",
   "Qt": "cd54a5401-wFztHb-d.js#Gt"
  }
 },
 {
  "target": "csv-model--cd5fd9055.mjs",
  "source": "cd5fd9055-ppz-LSpl.js",
  "auxiliaryOf": "csv-model.mjs",
  "exports": {
   "ve": "ce",
   "ye": "le",
   "xe": "ue"
  },
  "aliases": {
   "ve": null,
   "ye": null,
   "xe": null
  },
  "features": {
   "ve": [
    "ve=new Set"
   ],
   "ye": [
    "ye=[]"
   ],
   "xe": [
    "function xe(e){let t=e.reduce((e,t)=>Math.max(e,t.length),0),n=new Set;for(let r=0;r<t;r+=1){let t=0,i=0;for(let n of e){let e=n[r]?.trim()??\"\";if(u(e))continue;let a=e.indexOf(\".\")!==e.lastIndexOf(\".\")&&Number.isNaN(le(e));if(l.test(e)&&!a)t+=1;else{i+=1;break}}t>0&&i===0&&n.add(r)}return n}"
   ]
  },
  "uniqueBy": {
   "ve": "reader"
  },
  "usedIn": {
   "ve": {
    "by": "d",
    "features": [
     {
      "loose": "g?xe(y):ve",
      "keep": [
       "xe"
      ]
     }
    ]
   }
  },
  "previous": {
   "ve": "cd5fd9055-BXQRn_nx.js#ge",
   "ye": "cd5fd9055-BXQRn_nx.js#_e",
   "xe": "cd5fd9055-BXQRn_nx.js#ye"
  }
 },
 {
  "target": "csv-view.mjs",
  "source": "cd5fd9055-ppz-LSpl.js",
  "exports": {
   "d": "EpitaxyCsvPreview"
  },
  "aliases": {
   "d": "EpitaxyCsvPreview"
  },
  "features": {
   "d": [
    "function d(le){let $=J9(114),{contents:l,delimiter:u,truncatedUpstream:d,presentation:Se}=le,f=d!==void 0&&d,Ce=Se===void 0?\"pane\":Se,p=re(),m=a(),h=J2($,0,l,u)?K2($,0,l,u,fe(l,u)):$[2],g=Ce===\"document\",we=o(null),_=g&&h.kind===\"ok\",Te=J1($,3,_)?K1($,3,_,{landscape:!0,enabled:_}):$[4];pe(we,Te);let v;bb0:{if(h.kind!==\"ok\"){v=ye;break bb0}let{rows:e,hasHeader:t}=h.parsed;v=J2($,5,t,e)?K2($,5,t,e,t?e.slice(1):e):$[7]}",
    "104,g,W,f,f&&t(\"p\",{id:W,className:e(\"text-footnote text-muted-as-secondary select-none\",g?\"px-xl py-sm\":\"px-0.75\"),children:t(c,{defaultMessage:\"This preview may be missing its end.\",id:\"JUgzkwe7Bj\"})})):$[107];return J5($,108,Q,Me,Ne,ze,Be)?K5($,108,Q,Me,Ne,ze,Be,n(\"div\",{className:Me,children:[Q,Ne,ze,Be]})):$[113]}"
   ]
  },
  "adapters": {
   "shared-183-B2N6Zy4J.js": {
    "Ss": {
     "name": "useCsvFieldLanding",
     "module": "../../source-csv-adapters.jsx",
     "features": [
      "function eR(e){let $=J9(28),{ready:t,landNow:n,holdKey:r}=e,i=t===void 0||t,a=n!==void 0&&n,o=J1($,0,r)?K1($,0,r,{holdKey:r}):$[1];YL.has(o)||YL.set(o,e);let s=J1($,2,o)?K1($,2,o,YL.get(o)):$[3],[c,l]=x(null),[u,d]=x(null"
     ]
    }
   },
   "cc0a875c8-CEwFiq99.js": {
    "t": {
     "name": "CsvEmptyState",
     "module": "../../source-csv-adapters.jsx",
     "features": [
      "function f(n){let $=J9(23),{icon:i,title:f,body:p,detail:m,actions:h,role:g,textRole:_,children:v}=n,y=J1($,0,i)?K1($,0,i,typeof i==\"string\"?e(d,{name:i}):i):$[1],b=J1($,2,f)?K1($,2,f,f&&e(\"p\",{className:o,children:f})):$"
     ]
    }
   }
  },
  "previous": {
   "d": "cd5fd9055-BXQRn_nx.js#b"
  }
 },
 {
  "target": "environment-folder-view.mjs",
  "source": "cd8823d73-BkwrtOd6.js",
  "exports": {
   "Ie": "EnvironmentFolderField",
   "Le": "EnvironmentFolderList",
   "Re": "EnvironmentEmptyFolders",
   "Be": "EnvironmentFolderRow",
   "Q": "EnvironmentFolderName",
   "$e": "EnvironmentBranchName",
   "lt": "EnvironmentFolderControls",
   "nt": "environmentBranchOptions",
   "et": "environmentBranchShown",
   "tt": "environmentBranchTyped",
   "at": "environmentPlaceFirstAttribute",
   "ut": "environmentAddFolderSelect"
  },
  "aliases": {
   "Ie": "f",
   "Le": "p",
   "Re": "d",
   "Be": "h",
   "Q": null,
   "$e": "m",
   "lt": "g",
   "nt": null,
   "et": null,
   "tt": null,
   "at": null,
   "ut": "l"
  },
  "features": {
   "Ie": [
    "function Ie(n){let $=J9(14),{label:r,optional:i,labelClassName:a,tip:o,add:s,help:l,children:u}=n,d=i!==void 0&&i,f=c(),p=J5($,0,s,r,a,f,d,o)?K5($,0,s,r,a,f,d,o,e(De,{id:f,label:r,optional:d,tip:o,add:s,className:a})):$[6],m=J1($,7,l)?K1($,7,l,l!==void 0&&e(Oe,{children:l})):$[8];return J4($,9,u,f,p,m)?K4($,9,u,f,p,m,t(\"div\",{role:\"group\",\"aria-labelledby\":f,className:\"flex min-w-0 flex-col gap-sm\",children:[p,u,m]})):$[13]}"
   ],
   "Le": [
    "function Le(t){let $=J9(2),{children:n}=t;return J1($,0,n)?K1($,0,n,e(\"div\",{className:\"flex min-w-0 flex-col rounded shadow-card-ring\",children:e(y,{children:e(\"ul\",{role:\"list\",className:\"flex min-w-0 flex-col\",children:n})})})):$[1]}"
   ],
   "Re": [
    "function Re(t){let $=J9(5),{children:n}=t,r=n===void 0||void 0,i=J1($,0,n)?K1($,0,n,e(\"span\",{className:\"px-1\",children:n})):$[1];return J2($,2,r,i)?K2($,2,r,i,e(\"div\",{\"aria-hidden\":r,className:\"box-content min-h-11 rounded border-b border-transparent outline-dashed outline-1 -outline-offset-1 outline-alpha-2 flex items-center ps-lg pe-md text-body text-muted-as-secondary\",children:i})):$[4]}"
   ],
   "Be": [
    "function Be(n){let $=J9(18),{icon:r,name:i,hint:a,title:o,muted:s,field:c,end:l}=n,u=s!==void 0&&s,d=a!==void 0&&c===void 0,f=!d&&\"me-auto\",p=u?\"text-muted-as-secondary\":\"text-primary\",m=J2($,0,f,p)?K2($,0,f,p,E(\"flex min-h-7 max-w-max min-w-0 flex-[28_1_0%] items-center text-body\",f,p)):$[2],h=J1($,3,r)?K1($,3,r,e(b,{name:r,size:\"sm\",className:\"mt-1.5 shrink-0 text-secondary\"})):$[4],g=J4($,5,c,i,m,o)?K4($,5,c,i,m,o",
    ",children:e(Q,{name:a,dir:\"ltr\"})})):$[12];return J4($,13,l,h,g,_)?K4($,13,l,h,g,_,e(\"li\",{className:\"group/place flex min-w-0 border-b border-alpha-2 py-sm ps-lg pe-md last:border-transparent\",children:t(\"div\",{className:\"flex min-h-7 w-full min-w-0 items-start gap-sm px-1\",children:[h,g,_,l]})})):$[17]}"
   ],
   "Q": [
    "function Q(n){let $=J9(20),{name:r,end:i,dir:a}=n,o=i!==void 0&&i,s=a===void 0?\"auto\":a,c=l(null),u=l(null),d=l(null),f,p;J1($,0,r)?(f=He(r),p=f?Ke(f.head,f.tail):null,K2($,0,r,f,p)):(f=$[1],p=$[2]);let m=p,h=f?`${f.head}`:void 0,g=f?.tail,_=J2($,3,h,r)?K2($,3,h,r,{headRef:u,head:h,identity:r,remeasureKey:\"\"}):$[5],v=fe(_),y=Ye(J1($,6,r)?K1($,6,r,{runRef:c,headRef:u,pairRef:d,name:r}):$[7]),b=J2($,8,y,v)?K2($,8,y,v,",
    "\"span\",{\"aria-hidden\":!0,className:E(\"absolute inset-0 truncate select-none\",o?\"text-end rtl:text-start\":\"text-start\"),children:t(\"bdi\",{dir:s,children:[s===\"auto\"&&e(\"span\",{hidden:!0,children:r}),`${h.slice(0,Math.min(x,m[2]))}\\u2026${g}`]})})]}):e(\"span\",{ref:u,dir:s,className:\"min-w-0 truncate\",children:r})):$[19]}"
   ],
   "$e": [
    "function $e(t){let $=J9(5),{name:n}=t,r=J1($,0,n)?K1($,0,n,e(Q,{name:n,end:!0})):$[1];return J2($,2,n,r)?K2($,2,n,r,e(\"span\",{title:n,className:\"flex min-w-0\",children:r})):$[4]}"
   ],
   "lt": [
    "function lt(i){let $=J9(33),{label:o,branch:s,worktree:u,note:p,onRemove:m,focusRef:h}=i,y=Z(),b=c(),[S,C]=r(!1),[D,O]=r(\"\"),A=s!==void 0&&s.disabledReason===void 0;S&&!A&&(C(!1),O(\"\"));let j=A?\"branch\":u&&!u.disabled?\"box\":\"remove\",M=e=>e===j?{[at]:\"\",ref:e=>{h&&(h.current=e)}}:void 0,N=l(null),P=l(null),[F,I]=r(\"shut\"),L=s?.notice!==void 0,R=s?.notice?.quiet===!0,z,B;J2($,0,L,R)?(z=()=>{let e=x(k(N.current).",
    "i?.querySelector('[role=\"combobox\"]'))?.focus()}}),oe=J1($,23,Y)?K1($,23,Y,e(\"span\",{className:\"flex w-6 shrink-0\",children:Y})):$[24];return J5($,25,ae,G,K,q,J,oe,W)?K5($,25,ae,G,K,q,J,oe,W,t(\"div\",{ref:N,className:\"flex min-h-7 max-w-max min-w-0 flex-[72_1_0%] items-center gap-xs\",children:[W,ae,G,K,q,J,oe]})):$[32]}"
   ],
   "nt": [
    "function nt(e,t,n){let{none:r,value:i}=e,a=\"branch\"in r?r.branch:void 0,o=t.toLowerCase(),s=e=>e.toLowerCase().includes(o),c=\"branch\"in r&&r.mark===\"current\"&&i===r.branch,l=e.branches.filter(e=>e!==a||c),u=e.branches.find(e=>e===t),d=\"branch\"in r?s(r.branch):t===\"\",f=!d&&s(\"branch\"in r?`${r.branch} ${n}`:r.label);return[...u===void 0?tt(e,t)?[t]:[]:[u],...d?[\"\"]:[],...l.filter(e=>e!==u&&s(e)),...f?[\"\"]:[]].map(e=>({value:e,checked:e===i||e===\"\"&&i===a&&!c&&u!==a}))}"
   ],
   "et": [
    "function et({value:e,none:t}){return e||(\"branch\"in t?t.branch:void 0)}"
   ],
   "tt": [
    "function tt(e,t){return e.typed&&t!==\"\"&&t!==e.value}"
   ],
   "at": [
    "at=\"data-place-first\""
   ],
   "ut": [
    "ut={...Fe,variant:\"outline\",size:\"sm\",hideCaret:!0,value:null,renderTriggerValue:()=>t(\"span\",{className:\"flex items-center gap-xs text-primary\",children:[e(b,{name:\"Add\",size:\"sm\"}),e(X,{defaultMessage:\"Add\",id:\"2/2yg+qAwp\"})]})}"
   ]
  },
  "previous": {
   "Ie": "cd8823d73-CrZFkwi4.js#G",
   "Le": "cd8823d73-CrZFkwi4.js#K",
   "Re": "cd8823d73-CrZFkwi4.js#q",
   "Be": "cd8823d73-CrZFkwi4.js#J",
   "Q": "cd8823d73-CrZFkwi4.js#X",
   "$e": "cd8823d73-CrZFkwi4.js#Be",
   "lt": "cd8823d73-CrZFkwi4.js#Ge",
   "nt": "cd8823d73-CrZFkwi4.js#Ue",
   "et": "cd8823d73-CrZFkwi4.js#Ve",
   "tt": "cd8823d73-CrZFkwi4.js#He",
   "at": "cd8823d73-CrZFkwi4.js#Z",
   "ut": "cd8823d73-CrZFkwi4.js#Ke"
  }
 },
 {
  "target": "breadcrumb-measure.mjs",
  "source": "ce574895a-AyUKk43x.js",
  "exports": {
   "l": "observeWidth",
   "y": "useBreadcrumbCut",
   "d": "graphemeEnds",
   "f": "headCut",
   "v": "breadcrumbCut"
  },
  "aliases": {
   "l": "i",
   "y": "r",
   "d": "t",
   "f": null,
   "v": null
  },
  "features": {
   "l": [
    "function l(e,t){let n=i(e),r=n?.ResizeObserver;if(!n||r===void 0)return;let a=c.get(n);return a||(a=new r(e=>{for(let t of e)s.get(t.target)?.(t.contentRect.width,n)}),c.set(n,a)),s.set(e,t),a.observe(e),()=>{s.delete(e),a.unobserve(e)}}"
   ],
   "y": [
    "function y(r){let $=J9(7),{boxRef:i,sizerRef:a,identity:o,onFocusDropped:s,onCutChange:c}=r,[u,d]=t(null),f,p;return J5($,0,i,o,c,s,a)?(f=()=>{let t=i.current,n=a.current;if(!t||!n)return;let r,u=i=>{let[a,...l]=Array.from(n.children,x),u=v({widths:l,ellipsisWidth:a===void 0?0:a,budget:t.getBoundingClientRect().width}),f=u===null?\"\":`${u.from}:${u.to}`;if(f===r)return;r=f;let p=()=>{d({identity:o,drop:u}),c?.(u!==null)};if(!i){p();return}let m=t.ownerDocument.activeElement,h=t.contains(m)||t.querySelector('[aria-expanded=\"true\"]')!==null;e(p),h&&m?.isConnected===!1&&queueMicrotask(s)};u(!1);let f=[t,n].map(e=>l(e,()=>u(!0)));return()=>f.forEach(b)},p=[i,a,o,s,c],K5($,0,i,o,c,s,a,f,p)):(f=$[5],p=$[6]),n(f,p),u?.identity===o?u.drop:null}"
   ],
   "d": [
    "function d(e){let t=[],n=u();if(n){for(let{index:r,segment:i}of n.segment(e))t.push(r+i.length);return t}let r=0;for(let n of e)r+=n.length,t.push(r);return t}"
   ],
   "f": [
    "function f({cuts:e,widthTo:t,ellipsisWidth:n,budget:r}){let i=e.length-1;if(i<0||t(e[i])<=r+a)return null;let s=r-o-n();if(t(e[0])>s)return null;let c=0,l=e.length;for(;c<l-1;){let n=c+l>>1;t(e[n])<=s?c=n:l=n}return e[c]}"
   ],
   "v": [
    "function v({widths:e,ellipsisWidth:t,budget:n}){let r=e.length-1;if(e.reduce((e,t)=>e+t,0)<=n+a)return null;let i=n-o-t-e[r],s=0,c=r,l=t=>c-s<2||e[t]>i?!1:(i-=e[t],!0);for(l(0)&&(s=1);l(c-1);)--c;for(;s>0&&l(s);)s+=1;return e.slice(s,c).reduce((e,t)=>e+t,0)>t?{from:s,to:c}:{from:0,to:0}}"
   ]
  },
  "reexports": {
   "useHeadCut": {
    "cds": "useHeadTruncationCut",
    "binding": "ce574895a-AyUKk43x.js#_"
   }
  },
  "previous": {
   "l": "ce574895a-sBAnWI9w.js#l",
   "y": "ce574895a-sBAnWI9w.js#v",
   "d": "ce574895a-sBAnWI9w.js#d",
   "f": "ce574895a-sBAnWI9w.js#f",
   "v": "ce574895a-sBAnWI9w.js#_"
  }
 },
 {
  "target": "tile-layout-math.mjs",
  "source": "cf53e1812-B98_08tN.js",
  "exports": {
   "r": "contentBox"
  },
  "aliases": {
   "r": "d"
  },
  "features": {
   "r": [
    "function r(e,r){let i=t(e),a=2*n(e);return{width:r.width-i.left-i.right-a,height:r.height-i.top-i.bottom-a}}"
   ]
  },
  "reexports": {
   "minSize": {
    "module": "tile-layout-flex.mjs",
    "name": "minSize"
   },
   "distributeFlex": {
    "module": "tile-layout-flex.mjs",
    "name": "distributeFlex"
   },
   "walkResolvedFlexes": {
    "module": "tile-layout-flex.mjs",
    "name": "walkResolvedFlexes"
   }
  },
  "previous": {
   "r": "cf53e1812-CX9VqRuk.js#r"
  }
 },
 {
  "target": "terminal-description.mjs",
  "source": "cf718f694-DBeFxZUW.js",
  "exports": {
   "_e": "terminalDescription"
  },
  "aliases": {
   "_e": "i"
  },
  "features": {
   "_e": [
    "function _e(e){let t=z.exec(e)?.[1],n=t?.split(/[/\\\\]/).findLast(e=>e!==\"\"),r=t===\"/\"&&!pe.test(e);return n??(r?\"/\":e)}"
   ]
  },
  "previous": {
   "_e": "cf718f694-C6OUPnrm.js#he"
  }
 },
 {
  "target": "terminal-titles.mjs",
  "source": "cf718f694-DBeFxZUW.js",
  "exports": {
   "Se": "installTerminalTitles",
   "ge": "terminalTitleValue",
   "K": "forgetTerminalTitle",
   "ve": "terminalTitlesEnabled",
   "H": "terminalTitleStore"
  },
  "aliases": {
   "Se": "r",
   "ge": "a",
   "K": "n",
   "ve": "s",
   "H": "o"
  },
  "features": {
   "Se": [
    "function Se(e,t){K(t);let n=()=>{let e=a(F)!==!1;return e||K(t),e},r=o(e=>q(t,{reported:e}),V,{maxWait:me});e.onTitleChange(e=>{if(!n())return;let i=be(e);i===void 0||B.test(i)?(r.cancel(),q(t,{reported:i})):(W.set(t,r),r(i))}),e.parser.registerOscHandler(I,e=>{let[r,...i]=e.split(\";\");if(r!==\"A\"&&r!==\"C\"&&r!==\"D\"||!n())return!1;G(t);let a=r===\"C\"?xe(i):void 0;return a===void 0?q(t,{command:a}):U.set(t,setTimeout(()=>{U.delete(t),q(t,{command:a})},V)),!1})}"
   ],
   "ge": [
    "function ge(e,t){let n=e.byPtyKey[t];return n?.command??n?.reported}"
   ],
   "K": [
    "function K(e){G(e),W.get(e)?.cancel(),W.delete(e),H.setState(t=>{if(!(e in t.byPtyKey))return t;let{[e]:n,...r}=t.byPtyKey;return{byPtyKey:r}})}"
   ],
   "ve": [
    "function ve(){return c(F)!==\"off\"}"
   ],
   "H": [
    "H=h(()=>({byPtyKey:{}}))"
   ]
  },
  "adapters": {
   "vendor-all-0-uUCo-eCX.js": {
    "L": {
     "name": "createTerminalTitleStore",
     "module": "../../terminal-title-store.mjs",
     "features": [
      "v=(e=>e?_(e):_)"
     ]
    }
   }
  },
  "previous": {
   "Se": "cf718f694-C6OUPnrm.js#be",
   "ge": "cf718f694-C6OUPnrm.js#me",
   "K": "cf718f694-C6OUPnrm.js#J",
   "ve": "cf718f694-C6OUPnrm.js#ge",
   "H": "cf718f694-C6OUPnrm.js#G"
  }
 },
 {
  "target": "terminal-idle-cursor.mjs",
  "source": "cf718f694-DBeFxZUW.js",
  "exports": {
   "fe": "TerminalIdleCursor",
   "le": "useTerminalIdleCursorBlink",
   "D": "terminalCursorBlinkKey"
  },
  "aliases": {
   "fe": "c",
   "le": null,
   "D": "u"
  },
  "features": {
   "fe": [
    "function fe(e){let $=J9(21),{color:r,fontFamily:i,fontSize:a,className:o,style:s,\"data-testid\":c}=e,l=le(),u=ue(),d=J1($,0,o)?K1($,0,o,t(\"pointer-events-none flex h-[1lh] w-[1ch] items-end opacity-50\",o)):$[1],f=J3($,2,i,a,s)?K3($,2,i,a,s,{...s,fontFamily:i,fontSize:a,lineHeight:\"normal\"}):$[5],p=de[u],m=l&&\"motion-safe:animate-blink\",h=J2($,6,p,m)?K2($,6,p,m,t(p,m)):$[8],g=J1($,9,r)?K1($,9,r,{backgroundColor:r}):$[10],_=J2($,11,h,g)?K2($,11,h,g,n(\"span\",{className:h,style:g})):$[13];return J5($,14,l,u,d,f,_,c)?K5($,14,l,u,d,f,_,c,n(\"span\",{\"aria-hidden\":!0,\"data-testid\":c,\"data-blink\":l,\"data-cursor-style\":u,dir:\"ltr\",className:d,style:f,children:_})):$[20]}"
   ],
   "le": [
    "function le(){let e=y(T),t=_(D,void 0);return!e||t!==!1}"
   ],
   "D": [
    "D=\"epitaxy-terminal-cursor-blink\""
   ]
  },
  "adapters": {
   "shared-5-u8kha2eH.js": {
    "Op": {
     "name": "useTerminalPreference",
     "module": "../../terminal-view-settings.mjs",
     "features": [
      "function U_(e,t){let $=J9(5),n=J1($,0,e)?K1($,0,e,()=>g_(e)):$[1],r=l(w_,n,W_),i=`persisted.${e}`,a=J2($,2,t,i)?K2($,2,t,i,{key:i,defaultValue:t,sync:!0}):$[4],[o]=Cr(a);return r??o}"
     ]
    }
   }
  },
  "previous": {
   "fe": "cf718f694-C6OUPnrm.js#B",
   "le": "cf718f694-C6OUPnrm.js#z",
   "D": "cf718f694-C6OUPnrm.js#E"
  }
 },
 {
  "target": "terminal-title-invisibles.mjs",
  "source": "shared-0-CnnWnVrT.js",
  "exports": {
   "D6": "invisibleBlankClass",
   "E6": "invisibleBlankCodePoints"
  },
  "aliases": {
   "D6": "bt",
   "E6": "xt"
  },
  "features": {
   "D6": [
    "D6=E6.map(e=>`\\\\u{${e.toString(16)}}`).join(\"\")"
   ],
   "E6": [
    "E6=Object.freeze([10240,65532,119129,78913,78914,92432,94180])"
   ]
  },
  "previous": {
   "D6": "shared-0-DDOOdL6P.js#ML",
   "E6": "shared-0-DDOOdL6P.js#jL"
  }
 },
 {
  "target": "session-cycle-composer.mjs",
  "source": "shared-1-D1bGaTaN.js",
  "exports": {
   "mp": "chatInputTestId",
   "cp": "codePromptInputSelector"
  },
  "aliases": {
   "mp": "Mb",
   "cp": "Ib"
  },
  "features": {
   "mp": [
    "mp=\"chat-input\""
   ],
   "cp": [
    "cp=`[data-testid=\"${ip}\"]`"
   ]
  },
  "previous": {
   "mp": "shared-1-BJhqMmkf.js#y_",
   "cp": "shared-1-BJhqMmkf.js#A_"
  }
 },
 {
  "target": "session-cycle-chords--shared-1.mjs",
  "source": "shared-1-D1bGaTaN.js",
  "auxiliaryOf": "session-cycle-chords.mjs",
  "exports": {
   "A3": "cycleBracketDirection"
  },
  "aliases": {
   "A3": "ir"
  },
  "features": {
   "A3": [
    "function A3(e){let{key:t}=e,n=w3[t];if(n!==void 0)return n;let r=T3[e.code]??0;return r===0||((e.ctrlKey||e.metaKey)&&!e.altKey&&k3(),t.length===1&&t>=\" \"&&t<=\"~\"&&(E3.has(t)||D3!==!1))?0:r}"
   ]
  },
  "previous": {
   "A3": "shared-16-ByfgAyLr.js#Th"
  }
 },
 {
  "target": "surface-chord.mjs",
  "source": "shared-1-D1bGaTaN.js",
  "exports": {
   "N6": "surfaceChordDirection",
   "z6": "adjacentSurface",
   "w6": "shortcutBindingMatches",
   "P6": "shortcutLayerOpen",
   "m6": "surfaceChordShortcuts"
  },
  "aliases": {
   "N6": "Fn",
   "z6": "In",
   "w6": null,
   "P6": "Nn",
   "m6": "Un"
  },
  "features": {
   "N6": [
    "function N6(e,t,n,r=!1){if(e.repeat)return null;let i=t(e)?\"prev\":n(e)?\"next\":null;return i===null||!Uc()&&e.getModifierState?.(\"AltGraph\")||P6()?null:r?i===\"prev\"?\"next\":\"prev\":i}"
   ],
   "z6": [
    "function z6(e,t,n){if(e.length<2)return null;let r=Math.max(0,e.indexOf(t))+(n===\"prev\"?-1:1);return r<0||r>=e.length?null:e[r]}"
   ],
   "w6": [
    "function w6(e,t){if(t.code){if(t.matchBy===\"char\"?!e.key||!U3(e,t.key,t.code,t.platform===void 0?void 0:t.platform===\"mac\"):e.code!==t.code)return!1}else if((!e.key||e.key.toLowerCase()!==t.key.toLowerCase())&&(t.keyCode===void 0||e.keyCode!==t.keyCode||!Dc()))return!1;let n=new Set(t.modifiers),r=n.has(\"cmd\"),i=n.has(\"ctrl\"),a=n.has(\"shift\"),o=n.has(\"alt\");return!(i&&o&&!r&&e.getModifierState?.(\"AltGraph\")||e.metaKey!==r||e.ctrlKey!==i||e.shiftKey!==a||e.altKey!==o)}"
   ],
   "P6": [
    "function P6(){return!j6({passiveLayers:!0})}"
   ],
   "m6": [
    "m6={command_palette:{description:xX.description,group:\"other\",shortcut:{bindings:bE(\"command_palette\")}},search_palette:{description:SX.description,sessionDescription:SX.description_session,group:\"other\",shortcut:{bindings:bE(\"search_palette\")},hiddenFromCommandPalette:!0},quick_chat:{description:CX.description,group:\"other\",shortcut:{bindings:[{key:\"k\",modifiers:[\"cmd\",\"ctrl\"],platform:\"mac\"},{key:\"k\",code:\"KeyK\",",
    ":\"non-mac\",app:\"desktop\"}]},hiddenFromCommandPalette:!0},chorus_surface_next:{description:qX.description,group:\"other\",shortcut:{bindings:[{key:\"arrowright\",modifiers:[\"cmd\",\"alt\"],platform:\"mac\",app:\"desktop\"},{key:\"arrowright\",modifiers:[\"ctrl\",\"alt\"],platform:\"non-mac\",app:\"desktop\"}]},hiddenFromCommandPalette:!0}}"
   ]
  },
  "select": {
   "m6": {
    "pick": {
     "chorus_surface_prev": "chorus_surface_prev.shortcut.bindings",
     "chorus_surface_next": "chorus_surface_next.shortcut.bindings"
    }
   }
  },
  "previous": {
   "N6": "shared-1-BJhqMmkf.js#eH",
   "z6": "shared-1-BJhqMmkf.js#oH",
   "w6": "shared-1-BJhqMmkf.js#GV",
   "P6": "shared-1-BJhqMmkf.js#tH",
   "m6": "shared-1-BJhqMmkf.js#surfaceChordShortcuts"
  }
 },
 {
  "target": "environment-modifier-keys.mjs",
  "source": "shared-1-D1bGaTaN.js",
  "exports": {
   "F9": "environmentModifierKeys"
  },
  "aliases": {
   "F9": "_"
  },
  "features": {
   "F9": [
    "F9=new Set([\"Alt\",\"AltGraph\",\"CapsLock\",\"Control\",\"Fn\",\"Meta\",\"NumLock\",\"OS\",\"ScrollLock\",\"Shift\"])"
   ]
  },
  "previous": {
   "F9": "shared-1-BJhqMmkf.js#tK"
  }
 },
 {
  "target": "nested-session-palette-copy.mjs",
  "source": "shared-1-D1bGaTaN.js",
  "exports": {
   "pZ": "hideAllNestedSessionsCopy",
   "mZ": "showAllNestedSessionsCopy",
   "hZ": "nestedSessionsSearchHints"
  },
  "aliases": {
   "pZ": null,
   "mZ": null,
   "hZ": null
  },
  "features": {
   "pZ": [
    "pZ=U({description:{defaultMessage:\"Hide all nested sessions\",id:\"L0u+/SRZGR\"}})"
   ],
   "mZ": [
    "mZ=U({description:{defaultMessage:\"Show all nested sessions\",id:\"Le8WmhkjEY\"}})"
   ],
   "hZ": [
    "hZ=U({collapse:{defaultMessage:\"Collapse\",id:\"W/V6+Y+Vy2\"},expand:{defaultMessage:\"Expand\",id:\"b5wi/TtdZW\"},fold:{defaultMessage:\"Fold sessions\",id:\"w8tVqWXv52\"},unfold:{defaultMessage:\"Unfold sessions\",id:\"nu6d/ikviZ\"}})"
   ]
  },
  "previous": {
   "pZ": "shared-1-BJhqMmkf.js#eI",
   "mZ": "shared-1-BJhqMmkf.js#tI",
   "hZ": "shared-1-BJhqMmkf.js#nI"
  }
 },
 {
  "target": "padded-top.mjs",
  "source": "shared-100-BBQR7Gmd.js",
  "exports": {
   "Uc": "paddedTop"
  },
  "aliases": {
   "Uc": "M"
  },
  "features": {
   "Uc": [
    "function Uc(e){return e.getBoundingClientRect().top+Hc(e)}"
   ]
  },
  "previous": {
   "Uc": "shared-15-BvlV43cI.js#Zs"
  }
 },
 {
  "target": "titlebar-lead-parts.mjs",
  "source": "shared-120-DCdTP1_5.js",
  "exports": {
   "Ye": "titleDirection"
  },
  "aliases": {
   "Ye": "mn"
  },
  "features": {
   "Ye": [
    "function Ye(){return l()===\"rtl\"?\"auto\":void 0}"
   ]
  },
  "reexports": {
   "panelsTitleLeadClass": {
    "module": "titlebar-lead-parts--shared-18.mjs",
    "name": "panelsTitleLeadClass"
   }
  },
  "previous": {
   "Ye": "shared-18-D3y8YMFN.js#px"
  }
 },
 {
  "target": "sidebar-remote-name.mjs",
  "source": "shared-123-1Hc1RTKl.js",
  "exports": {
   "UW": "sidebarRemoteName"
  },
  "aliases": {
   "UW": "ro"
  },
  "features": {
   "UW": [
    "function UW(e){if(e)return e.kind===\"wsl\"?e.distro:e.sshHost}"
   ]
  },
  "previous": {
   "UW": "shared-78-D5Fw2h0a.js#C4"
  }
 },
 {
  "target": "sidebar-menu-groups.mjs",
  "source": "shared-140-DfG6VwpK.js",
  "exports": {
   "uo": "RegisterSidebarMenuRow",
   "fo": "SidebarMenuItem",
   "_o": "SidebarMenuSection",
   "vo": "OrderedSidebarMenuGroups"
  },
  "aliases": {
   "uo": "Bi",
   "fo": "zi",
   "_o": "Ri",
   "vo": "Ii"
  },
  "features": {
   "uo": [
    "function uo(e){let $=J9(3),{children:t}=e,n=y(lo),r,i;return J1($,0,n)?(r=()=>{if(n)return n(1),()=>n(-1)},i=[n],K2($,0,n,r,i)):(r=$[1],i=$[2]),w(r,i),t}"
   ],
   "fo": [
    "function fo(e){let $=J9(2);return J1($,0,e)?K1($,0,e,a(uo,{children:a(P.Item,{...e})})):$[1]}"
   ],
   "_o": [
    "function _o(e){let $=J9(8),{separator:t,hasOwnRows:n,children:r}=e,i=n!==void 0&&n,[s,c]=u(0),l=J0($,0)?K0($,0,e=>{c(t=>t+e)}):$[0],d=J2($,1,i,s)?K2($,1,i,s,(i||s>0)&&a(P.Separator,{})):$[3],f=t===\"before\"&&d,p=t===\"after\"&&d;return J3($,4,r,f,p)?K3($,4,r,f,p,o(lo.Provider,{value:l,children:[f,r,p]})):$[7]}"
   ],
   "vo": [
    "function vo(e){let $=J9(8),{order:t,groups:n}=e,r=J0($,0)?K0($,0,{}):$[0],[i,o]=u(r),s=J0($,1)?K0($,1,(e,t)=>{o(n=>({...n,[e]:(n[e]??0)+t}))}):$[1],c;if(J3($,2,n,t,i)){let e=J1($,6,i)?K1($,6,i,e=>(i[e]??0)>0):$[7],r=t.filter(e);c=t.map(e=>a(yo,{id:e,registerRow:s,hasRows:r.includes(e),separatorBefore:r.indexOf(e)>0,children:n[e]},e)),K3($,2,n,t,i,c)}else c=$[5];return c}"
   ]
  },
  "previous": {
   "uo": "shared-16-ByfgAyLr.js#Al",
   "fo": "shared-16-ByfgAyLr.js#jl",
   "_o": "shared-16-ByfgAyLr.js#Il",
   "vo": "shared-16-ByfgAyLr.js#Ll"
  }
 },
 {
  "target": "session-cycle-chords.mjs",
  "source": "shared-140-DfG6VwpK.js",
  "exports": {
   "Jp": "sessionCycleRepeatMs",
   "Yp": "cycleListboxSelector",
   "Xp": "cycleComposerSelector",
   "Qp": "isCycleModifierKey",
   "Af": "ownsArrowKeys",
   "$p": "cycleBlockedByFocus",
   "lm": "sessionCycleChord"
  },
  "aliases": {
   "Jp": null,
   "Yp": null,
   "Xp": null,
   "Qp": null,
   "Af": "Zt",
   "$p": null,
   "lm": null
  },
  "features": {
   "Jp": [
    "Jp=50"
   ],
   "Yp": [
    "Yp='select,[role=\"combobox\"],[role=\"listbox\"],[role=\"application\"]'"
   ],
   "Xp": [
    "Xp=`[data-testid=\"${Xe}\"],${qe}`"
   ],
   "Qp": [
    "function Qp(e){return e.key===\"Control\"||e.key===\"Meta\"||e.key===\"Alt\"}"
   ],
   "Af": [
    "function Af(e){return!e||typeof e.matches!=\"function\"?!1:jf(e)||wn(Tn(e),jf)}"
   ],
   "$p": [
    "function $p(e,t){let n=H(e);if(n===null)return!1;let r=n.closest(Xp);return r===null?n.closest(Yp)!==null||t===\"alt_arrow\"&&Af(n):t===\"alt_arrow\"&&(r.getAttribute(\"data-draft-persisted\")!==\"true\"||Si(r))}"
   ],
   "lm": [
    "function lm(e,t){if(e.altKey)return!t||e.ctrlKey||e.metaKey||e.shiftKey||e.key!==\"ArrowDown\"&&e.key!==\"ArrowUp\"||!$t()||di()?null:{dir:e.key===\"ArrowDown\"?1:-1,chord:\"alt_arrow\"};if(e.key===\"Tab\"&&e.ctrlKey&&!e.metaKey)return{dir:e.shiftKey?-1:1,chord:\"ctrl_tab\"};let n=$t(),r=n?e.metaKey:e.ctrlKey,i=n?e.ctrlKey:e.metaKey,a=r&&e.shiftKey&&!i?it(e):0;return a===0?null:{dir:a,chord:\"cmd_shift_bracket\"}}"
   ]
  },
  "readBy": {
   "Jp": "Zp"
  },
  "reexports": {
   "cycleBracketDirection": {
    "module": "session-cycle-chords--shared-1.mjs",
    "name": "cycleBracketDirection"
   }
  },
  "previous": {
   "Jp": "shared-16-ByfgAyLr.js#jg",
   "Yp": "shared-16-ByfgAyLr.js#Mg",
   "Xp": "shared-16-ByfgAyLr.js#Ng",
   "Qp": "shared-16-ByfgAyLr.js#Fg",
   "Af": "shared-16-ByfgAyLr.js#ah",
   "$p": "shared-16-ByfgAyLr.js#Ig",
   "lm": "shared-16-ByfgAyLr.js#Kg"
  }
 },
 {
  "target": "session-cycle-rows.mjs",
  "source": "shared-140-DfG6VwpK.js",
  "exports": {
   "em": "cycleRowKey",
   "tm": "cycleButtonForRowKey",
   "nm": "cycleResumePosition",
   "rm": "rowAliasAttribute",
   "om": "recentsCycleButtons",
   "sm": "cycleNeighbourButton",
   "cm": "openCycleButton"
  },
  "aliases": {
   "em": "at",
   "tm": null,
   "nm": null,
   "rm": "et",
   "om": "it",
   "sm": "nt",
   "cm": "rt"
  },
  "features": {
   "em": [
    "function em(e){return e?.closest(\"[data-row-key]\")?.getAttribute(\"data-row-key\")??null}"
   ],
   "tm": [
    "function tm(e,t){let n=e.filter(e=>em(e)===t);return t!==null&&n.length===1?n[0]:void 0}"
   ],
   "nm": [
    "function nm(e,t){let n=e.button?.isConnected===!1?tm(t,e.rowKey):e.button,r=n?t.indexOf(n):-1;return r===-1?Math.min(e.pos,t.length):r+1}"
   ],
   "rm": [
    "rm=\"data-row-alias-of\""
   ],
   "om": [
    "function om(e){let t=document.querySelector(`.dframe-recents-by-mode [data-kind=\"${e}\"]`),n=t?am(Array.from(t.querySelectorAll(`[data-row-main-button]:not([${rm}]):not([${im}]),[${qp}]`))):[],r=vi.getState().selectedKeys.size>0?n.findIndex(e=>e.getAttribute(\"aria-current\")===\"page\"):-1;return r===-1&&(r=n.findIndex(e=>e.getAttribute(\"data-selected\")===\"focused\")),r===-1&&(r=n.findIndex(e=>e.getAttribute(\"data-selected\")===\"open\")),{buttons:n,selectedIdx:r}}"
   ],
   "sm": [
    "function sm({buttons:e,selectedIdx:t}){if(t!==-1)return e[t+1]??e[t-1]}"
   ],
   "cm": [
    "function cm(e){return e?.isConnected?(e.scrollIntoView({block:\"nearest\"}),On(()=>e.click()),!0):!1}"
   ]
  },
  "previous": {
   "em": "shared-16-ByfgAyLr.js#Lg",
   "tm": "shared-16-ByfgAyLr.js#Rg",
   "nm": "shared-16-ByfgAyLr.js#zg",
   "rm": "shared-16-ByfgAyLr.js#Bg",
   "om": "shared-16-ByfgAyLr.js#Hg",
   "sm": "shared-16-ByfgAyLr.js#Ug",
   "cm": "shared-16-ByfgAyLr.js#Gg"
  }
 },
 {
  "target": "file-output-paths.mjs",
  "source": "shared-153-DMw2VzSq.js",
  "exports": {
   "qV": "forwardSlashes",
   "JV": "outputBasename",
   "QH": "isAgentTemporaryPath",
   "aU": "isTemporaryPath",
   "UH": "isClaudeConfigPath",
   "nU": "isSideSessionNotesPath",
   "eH": "relativePathSegmentPattern",
   "tH": "hasRelativePathSegment"
  },
  "aliases": {
   "qV": "Po",
   "JV": "No",
   "QH": "co",
   "aU": "uo",
   "UH": "oo",
   "nU": "yo",
   "eH": null,
   "tH": "ro"
  },
  "features": {
   "qV": [
    "function qV(e){return e.replace(/\\\\/g,\"/\")}"
   ],
   "JV": [
    "function JV(e){let t=e.startsWith(\"/\")?\"/\":/[/\\\\]/;return e.split(t).pop()||e}"
   ],
   "QH": [
    "function QH(e){let t=qV(e);return tH(t)?!1:qH.test(t)||JH.test(t)}"
   ],
   "aU": [
    "function aU(e){let t=qV(e);return tH(t)?!1:rU.test(t)||iU.test(t)}"
   ],
   "UH": [
    "function UH(e){let t=qV(e);return/(?:^|\\/)\\.claude\\//.test(t)||JV(t).toLowerCase()===\"claude.md\"}"
   ],
   "nU": [
    "function nU(e){let t=qV(e);return tH(t)?!1:eU.test(t)||tU.test(t)}"
   ],
   "eH": [
    "eH=/(?:^|\\/)\\.\\.?(?:\\/|$)/"
   ],
   "tH": [
    "function tH(e){return eH.test(e)}"
   ]
  },
  "uniqueBy": {
   "QH": "alias",
   "aU": "alias",
   "nU": "alias"
  },
  "previous": {
   "qV": "shared-130-dWztbTO1.js#UV",
   "JV": "shared-130-dWztbTO1.js#WV",
   "QH": "shared-130-dWztbTO1.js#JH",
   "aU": "shared-130-dWztbTO1.js#tU",
   "UH": "shared-130-dWztbTO1.js#zH",
   "nU": "shared-130-dWztbTO1.js#QH",
   "eH": "shared-130-dWztbTO1.js#XV",
   "tH": "shared-130-dWztbTO1.js#ZV"
  }
 },
 {
  "target": "sidebar-row-primitive.mjs",
  "source": "shared-18-Cfqwgjc5.js",
  "exports": {
   "aP": "sidebarFocusClass",
   "mP": "SidebarRowButton",
   "nP": "sidebarHitRowClass"
  },
  "aliases": {
   "aP": "Ws",
   "mP": "Rs",
   "nP": "Js"
  },
  "features": {
   "aP": [
    "aP=\"hide-focus-ring focus-visible:outline-hidden focus-visible:shadow-[inset_0_0_0_1px_var(--cds-fill-accent),0_0_6px_0_color-mix(in_srgb,var(--cds-fill-accent)_20%,transparent)]\""
   ],
   "mP": [
    "function mP(e){let $=J9(24),t,n,r,i,a,o;if(J1($,0,e)?({href:n,onClick:r,onKeyDown:i,children:t,ref:a,...o}=e,K5($,0,e,t,n,r,i,a,o)):(t=$[1],n=$[2],r=$[3],i=$[4],a=$[5],o=$[6]),n===void 0)return J5($,7,t,r,i,a,o)?K5($,7,t,r,i,a,o,m(\"button\",{ref:a,type:\"button\",onClick:r,onKeyDown:i,...o,children:t})):$[12];let s=a,c=J1($,13,r)?K1($,13,r,e=>{e.preventDefault(),r?.(e)}):$[14],l=J1($,15,i)?K1($,15,i,e=>{e.key===\" \"&&e.target===e.currentTarget&&(e.preventDefault(),e.currentTarget.click()),i?.(e)}):$[16],u=o;return J5($,17,t,n,s,c,l,u)?K5($,17,t,n,s,c,l,u,m(\"a\",{ref:s,href:n,draggable:!1,onClick:c,onKeyDown:l,...u,children:t})):$[23]}"
   ],
   "nP": [
    "nP=\"hit-row [--cds-hit-gap-y:7px]\""
   ]
  },
  "previous": {
   "aP": "shared-18-D3y8YMFN.js#bk",
   "mP": "shared-18-D3y8YMFN.js#kk",
   "nP": "shared-18-D3y8YMFN.js#_k"
  }
 },
 {
  "target": "sidebar-row-control.mjs",
  "source": "shared-18-Cfqwgjc5.js",
  "exports": {
   "KP": "SidebarRowControl"
  },
  "aliases": {
   "KP": "Ps"
  },
  "features": {
   "KP": [
    "function KP(e){let $=J9(11),t,n,r;J1($,0,e)?({onClick:n,children:t,...r}=e,K3($,0,e,t,n,r)):(t=$[1],n=$[2],r=$[3]);let i=J0($,4)?K0($,4,p(\"df-row-control size-6 flex items-center justify-center rounded-md text-secondary hover:text-primary hover:bg-[var(--df-hover)]\",aP)):$[4],a=J1($,5,n)?K1($,5,n,e=>{e.stopPropagation(),e.preventDefault(),n?.(e)}):$[6];return J3($,7,t,r,a)?K3($,7,t,r,a,m(\"button\",{type:\"button\",className:i,onClick:a,tabIndex:-1,...r,\"data-row-action\":\"\",children:t})):$[10]}"
   ]
  },
  "previous": {
   "KP": "shared-18-D3y8YMFN.js#iA"
  }
 },
 {
  "target": "sidebar-pr-model.mjs",
  "source": "shared-18-Cfqwgjc5.js",
  "exports": {
   "rN": "resolvePrState",
   "iN": "prStateOrder",
   "sN": "prWebUrl",
   "fN": "aggregatePullRequests",
   "yN": "pullRequestEntries"
  },
  "aliases": {
   "rN": "_c",
   "iN": null,
   "sN": "mc",
   "fN": null,
   "yN": "sc"
  },
  "features": {
   "rN": [
    "function rN(e,t,n){if(e===\"open\"){if(t===\"CHANGES_REQUESTED\")return\"changesRequested\";if(n)return\"conflicting\";if(t===\"APPROVED\")return\"approved\"}return e??\"none\"}"
   ],
   "iN": [
    "iN={conflicting:0,changesRequested:1,open:2,approved:3,draft:4,queued:5,merged:6,closed:7,none:8}"
   ],
   "sN": [
    "function sN(e){return e&&oN.test(e)?e:void 0}"
   ],
   "fN": [
    "function fN(e){if(e.length===0)return{hasPr:!1,prState:void 0,prNumber:void 0,displayState:\"none\",displayPrs:e,prs:e};let t=e.map(e=>rN(e.state,e.reviewDecision,e.hasConflict)),n=t.reduce((e,t)=>iN[t]<iN[e]?t:e),r=e.filter((e,r)=>t[r]===n),i=r[0];return{hasPr:!0,prState:i.state,displayState:n,displayPrs:r,ciState:dN.find(e=>r.some(t=>t.ciState===e)),prUrl:i.url,prRepo:i.repo,prNumber:e.length===1?i.number:void 0,prs:e}}"
   ],
   "yN": [
    "function yN(e){let t=[],n=new Set;for(let r of e.prs){let e=rN(r.state,r.reviewDecision,r.hasConflict);if(e!==\"none\"){if(r.number!==void 0){let e=`${r.repo.toLowerCase()}#${r.number}`;if(n.has(e))continue;n.add(e)}t.push({state:e,repo:r.repo,number:r.number,url:sN(r.url),title:r.title,additions:r.additions,deletions:r.deletions,ciState:r.ciState})}}return t.sort((e,t)=>iN[e.state]-iN[t.state])}"
   ]
  },
  "previous": {
   "rN": "shared-18-D3y8YMFN.js#yO",
   "iN": "shared-18-D3y8YMFN.js#bO",
   "sN": "shared-18-D3y8YMFN.js#CO",
   "fN": "shared-18-D3y8YMFN.js#OO",
   "yN": "shared-18-D3y8YMFN.js#FO"
  }
 },
 {
  "target": "sidebar-pr-icon.mjs",
  "source": "shared-18-Cfqwgjc5.js",
  "exports": {
   "uM": "sidebarPrAppearance",
   "fM": "sidebarPrStateLabel",
   "hM": "SidebarPrIcon",
   "OJ": "sidebarPreviewCollisionPadding"
  },
  "aliases": {
   "uM": "Mc",
   "fM": "Fc",
   "hM": "Nc",
   "OJ": "Cn"
  },
  "features": {
   "uM": [
    "uM={open:{icon:\"GitPullRequest\",color:\"var(--cds-text-git-opened)\",textClass:\"text-git-opened\"},approved:{icon:\"CheckCircle\",color:\"var(--cds-text-git-opened)\",textClass:\"text-git-opened\"},changesRequested:{icon:\"XCircle\",color:\"var(--cds-text-git-closed)\",textClass:\"text-git-closed\"},conflicting:{icon:\"GitMergeConflict\",color:\"var(--cds-text-git-conflicting)\",textClass:\"text-git-conflicting\"},draft:{icon:\"GitPullRequestDraft\",color:\"var(--cds-text-git-draft)\",textClass:\"text-git-draft\"},queued:{icon:\"GitMergeQueue\",color:\"var(--cds-text-git-queued)\",textClass:\"text-git-queued\"},merged:{icon:\"GitMergedSimple\",color:\"var(--cds-text-git-merged)\",textClass:\"text-git-merged\"},closed:{icon:\"GitPullRequestClosed\",color:\"var(--cds-text-git-closed)\",textClass:\"text-git-closed\"},none:{icon:\"Placeholder\",color:lM,textClass:\"text-muted-as-secondary\"}}"
   ],
   "fM": [
    "function fM(e,t){return e.formatMessage(dM[t])}"
   ],
   "hM": [
    "function hM(e){let $=J9(9),{state:t,size:n,bold:r,className:i,alt:a}=e,o=n===void 0?12:n,{icon:s,color:c}=uM[t],l=r??o>=14,u=J1($,0,c)?K1($,0,c,{color:c}):$[1];return J5($,2,a,i,s,o,l,u)?K5($,2,a,i,s,o,l,u,m(X,{name:s,customSize:o,alt:a,bold:l,className:i,style:u})):$[8]}"
   ],
   "OJ": [
    "OJ={top:48,right:8,bottom:8,left:8}"
   ]
  },
  "previous": {
   "uM": "shared-18-D3y8YMFN.js#ED",
   "fM": "shared-18-D3y8YMFN.js#OD",
   "hM": "shared-18-D3y8YMFN.js#jD",
   "OJ": "shared-18-D3y8YMFN.js#wU"
  }
 },
 {
  "target": "sidebar-status-glyph.mjs",
  "source": "shared-18-Cfqwgjc5.js",
  "exports": {
   "yF": "SidebarStatusLabel",
   "bF": "sidebarStatusMessages",
   "GF": "SidebarStatusGlyph",
   "AN": "SidebarStatusLayout",
   "PN": "useSidebarStatusTooltips",
   "tN": "sidebarErrorKind",
   "QM": "sidebarErrorShapes",
   "$M": "sidebarErrorColors"
  },
  "aliases": {
   "yF": "gs",
   "bF": "ys",
   "GF": "Cs",
   "AN": "ac",
   "PN": "rc",
   "tN": "xc",
   "QM": "yc",
   "$M": "vc"
  },
  "features": {
   "yF": [
    "function yF(e){let $=J9(9),{label:t,detail:n,live:r,tooltip:i,triggerClassName:a,children:o}=e,s=r!==void 0&&r,c=i===void 0||i,l=a===void 0?\"\":a,u=PN(),d=s?\"status\":\"img\",f=`flex min-h-3.5 min-w-3.5 shrink-0 items-center justify-center ${l}`,p=J4($,0,o,t,d,f)?K4($,0,o,t,d,f,m(\"span\",{role:d,\"aria-label\":t,className:f,onPointerMove:vF,onPointerEnter:vF,onMouseMove:vF,children:o})):$[4];return!c||!u?p:J3($,5,n,t,p)?K3($,5,n,t,p,m(ve,{content:t,detail:n,delay:500,closeDelay:0,hoverable:!1,lazy:!0,className:\"pointer-events-none\",children:p})):$[8]}"
   ],
   "bF": [
    "bF=Sh({awaitingPermission:{defaultMessage:\"Awaiting input\",id:\"tM90hqjWj0\"},awaitingQuestion:{defaultMessage:\"Awaiting answer\",id:\"L+gTSub4gg\"},running:{defaultMessage:\"Running\",id:\"nDyaq/M7Oj\"},browsing:{defaultMessage:\"Using the browser\",id:\"+mNq/KY/9y\"},ready:{defaultMessage:\"Unread response\",id:\"74N95hPFV6\"},idle:{defaultMessage:\"Idle\",id:\"dDDdlNFks6\"},done:{defaultMessage:\"Done\",id:\"h+3shDP+Ic\"}})"
   ],
   "GF": [
    "function GF(e){let $=J9(17),{state:t,label:n,errorCategory:r,errorSurface:i,remote:a,tooltip:o,live:s}=e,c=i===void 0?\"cowork\":i,l=s===void 0||s,u=Q();if(t===\"error\")return J5($,0,r,c,l,a,o)?K5($,0,r,c,l,a,o,m(IF,{surface:c,errorCategory:r,remote:a,tooltip:o,live:l})):$[5];let d=J3($,6,u,n,t)?K3($,6,u,n,t,u.formatMessage(n??(t===\"awaiting\"?bF.awaitingPermission:bF[t]))):$[9],f=J1($,10,t)?K1($,10,t,m(OF,{kind:t})):$[11];return J4($,12,l,d,f,o)?K4($,12,l,d,f,o,m(yF,{live:l,tooltip:o,label:d,children:f})):$[16]}"
   ],
   "AN": [
    "AN=O(null)"
   ],
   "PN": [
    "function PN(){return A(NN)}"
   ],
   "tN": [
    "function tN(e){return e===\"rate_limit\"?\"usage\":e===\"network_error\"||KM(e)?\"offline\":\"warning\"}"
   ],
   "QM": [
    "QM={warning:\"Warning\",usage:\"UsageGaugeHigh\",offline:\"CloudSlash\",info:\"Info\"}"
   ],
   "$M": [
    "$M={warning:\"text-danger\",usage:\"text-danger\",offline:\"text-secondary\",info:\"text-secondary\"}"
   ]
  },
  "readBy": {
   "PN": "yF"
  },
  "uniqueBy": {
   "AN": "alias"
  },
  "reexports": {
   "SidebarStatusTooltips": {
    "cds": "HoverTooltipsEnabledContext",
    "binding": "shared-18-Cfqwgjc5.js#NN"
   }
  },
  "previous": {
   "yF": "shared-18-D3y8YMFN.js#DA",
   "bF": "shared-18-D3y8YMFN.js#OA",
   "GF": "shared-18-D3y8YMFN.js#$A",
   "AN": "shared-18-D3y8YMFN.js#KO",
   "PN": "shared-18-D3y8YMFN.js#XO",
   "tN": "shared-18-D3y8YMFN.js#_O",
   "QM": "shared-18-D3y8YMFN.js#mO",
   "$M": "shared-18-D3y8YMFN.js#hO"
  }
 },
 {
  "target": "sidebar-fade-label.mjs",
  "source": "shared-18-Cfqwgjc5.js",
  "exports": {
   "VP": "SidebarFadeLabel",
   "BP": "observeSidebarLabelOverflow",
   "TP": "sidebarLabelOverflows",
   "SP": "SidebarLabelMenuOpen",
   "yP": "sidebarDecorationMinimum",
   "bP": "sidebarDecorationProperty"
  },
  "aliases": {
   "VP": "js",
   "BP": null,
   "TP": null,
   "SP": "Hs",
   "yP": null,
   "bP": null
  },
  "features": {
   "VP": [
    "function VP(e){let $=J9(40),{children:t,cleared:n,decorated:r,endControls:i,wide:a,hint:o}=e,s=a!==void 0&&a,c=F(),l=!!r&&!n,u=l||!!i&&!n,d=PN(),f=P(null),h=P(null),_=ue(),v=A(SP),y=J3($,0,u,l,s)?K3($,0,u,l,s,(e,t)=>{if(!e||!t||e.offsetWidth===0)return null;let n=s?CP(e):0,r=u?wP(e):0;return r>0?t.scrollWidth-(e.offsetWidth-r)>0:TP(t.scrollWidth,e.offsetWidth,l,n)}):$[3],b=J3($,4,n,y,s)?K3($,4,n,y,s,()=>{let e=f.",
    "),children:o})]})}):$[30],L=J1($,31,c)?K1($,31,c,Zg(\"inline-end\",c)):$[32],R=J1($,33,n)?K1($,33,n,n?()=>f.current?.closest(\".df-described-title, [data-row]\")??f.current:void 0):$[34];return J4($,35,M,N,L,R)?K4($,35,M,N,L,R,m(ve,{content:N,side:L,anchor:R,hoverable:!1,lazy:!0,children:M})):$[39]}"
   ],
   "BP": [
    "function BP(e,t,n,r){let i=jn(e);if(!i)return;let a=zP.get(i);if(!a){let e=new Map;a={observer:new i.ResizeObserver(t=>{let n=new Map;for(let r of t){let t=e.get(r.target);t&&!n.has(t.label)&&n.set(t.label,t.readCutOff())}for(let n of new Set(t.map(t=>e.get(t.target))))n?.afterRead();for(let[e,t]of n)t!==null&&e.toggleAttribute(\"data-overflowing\",t)}),watches:e},zP.set(i,a)}let{observer:o,watches:s}=a,c={label:e,readCutOff:n,afterRead:r};for(let n of[e,t])s.set(n,c),o.observe(n);return()=>{for(let n of[e,t])s.delete(n),o.unobserve(n);e.removeAttribute(\"data-overflowing\")}}"
   ],
   "TP": [
    "function TP(e,t,n,r=0){return e-(t-(n?gP+r:0))>0}"
   ],
   "SP": [
    "SP=O(!1)"
   ],
   "yP": [
    "yP=12"
   ],
   "bP": [
    "bP=\"--df-deco-extra\""
   ]
  },
  "readBy": {
   "yP": "CP",
   "SP": "VP"
  },
  "previous": {
   "VP": "shared-18-D3y8YMFN.js#$k",
   "BP": "shared-18-D3y8YMFN.js#Qk",
   "TP": "shared-18-D3y8YMFN.js#Lk",
   "SP": "shared-18-D3y8YMFN.js#Ik",
   "yP": "shared-18-D3y8YMFN.js#Nk",
   "bP": "shared-18-D3y8YMFN.js#Pk"
  }
 },
 {
  "target": "sidebar-row-view.mjs",
  "source": "shared-18-Cfqwgjc5.js",
  "exports": {
   "hP": "CurrentSidebarRow",
   "dP": "sidebarRowClasses",
   "fP": "useSidebarRename",
   "pP": "SidebarRenameInput",
   "RP": "SidebarWideDecoration",
   "GP": "SidebarRowMoreControl",
   "iP": "SidebarRowShortcut"
  },
  "aliases": {
   "hP": "Vs",
   "dP": null,
   "fP": "Ks",
   "pP": null,
   "RP": null,
   "GP": "Fs",
   "iP": "zs"
  },
  "features": {
   "hP": [
    "function hP(e){let $=J9(176),t,n,r,i,a,o,s,c,l,u,d,f,h,_,v,y,b,S,C,w,E,D,O,A,j,N,P,F,I,R,z,B,V;J1($,0,e)?({variant:V,selected:w,multiSelected:O,href:o,icon:s,tail:z,tailBesideControls:A,menu:l,coveredCell:i,trailingAction:B,trailingActionAtRestOnTouch:j,trailingActionAtRest:N,nameSuffix:f,nameId:d,rightDecoration:C,wideDecoration:P,solidDecoration:F,menuOpen:u,contextMenuOpen:r,onRename:_,renameValue:S,",
    ":[B,at]})):$[163];return J5($,164,de,We,Ge,Ke,qe,Je,Ye,Xe,tt,nt,ot)?K5($,164,de,We,Ge,Ke,qe,Je,Ye,Xe,tt,nt,ot,g(\"div\",{\"data-row\":\"\",\"data-described\":We,className:Ge,style:Ke,\"data-selected\":de,\"data-menu-open\":qe,\"data-context-menu-open\":Je,\"data-touch-menu\":Ye,\"data-action-at-rest\":Xe,children:[tt,nt,ot]})):$[175]}"
   ],
   "dP": [
    "dP=v(\"w-full shrink-0 border-none text-start text-[length:var(--df-row-font)] text-secondary\",{variants:{variant:{nav:\"flex items-center gap-[var(--df-row-gap)] h-[var(--df-row-h)] px-[var(--df-row-px)] [&_.df-leading-slot]:text-secondary data-[selected=focused]:[&_.df-leading-slot]:text-primary\",recent:\"flex items-center gap-[var(--df-row-gap)] h-[var(--df-row-h)] px-[var(--df-row-px)]\",session:`flex ${oP} pe-[var(--df-row-px)]`},wrapLabel:{false:\"\",true:\"\"},described:{false:\"\",true:\"\"}},compoundVariants:[{variant:\"session\",described:!1,class:\"items-center gap-[var(--df-row-gap)]\"},{variant:\"session\",wrapLabel:!1,described:!1,class:\"h-[var(--df-row-h)]\"},{variant:\"session\",wrapLabel:!0,described:!1,class:\"min-h-[var(--df-row-h)]\"},{variant:\"session\",described:!0,class:\"df-described-row flex-col items-stretch justify-center\"}],defaultVariants:{variant:\"nav\",wrapLabel:!1,described:!1}})"
   ],
   "fP": [
    "function fP(e,t,n){let $=J9(39),{onEntered:r,onCleared:i,onEditingChange:a,quietFocusBack:o}=J1($,0,n)?K1($,0,n,n===void 0?{}:n):$[1],[s,c]=b(!1),[l,u]=b(\"\"),[d,f]=b(null),p=P(null),m=P(null),h=J0($,2)?K0($,2,{submitted:!1,entering:!1,pending:!1,refocus:!1,open:!1,openedWith:\"\"}):$[2],g=P(h),_,v;J3($,3,s,r,o)?(_=()=>{let e=g.current;if(!s){e.refocus&&(e.refocus=!1,m.current?.focus(o?.()?{focusVisible:!1}:void 0));",
    ",26,x)?K1($,26,x,()=>x(!0)):$[27],E=J1($,28,y)?K1($,28,y,()=>{g.current.submitted=!0,y(!0)}):$[29];return J5($,30,E,l,S,C,s,d,w,T)?K5($,30,E,l,S,C,s,d,w,T,{isEditing:s,editValue:l,setEditValue:u,optimisticLabel:d,inputRef:p,focusTargetRef:m,startEdit:w,handleDoubleClick:C,submitEdit:T,cancelEdit:E,handleBlur:S}):$[38]}"
   ],
   "pP": [
    "function pP(e){let $=J9(22),{inputRef:t,value:n,onValueChange:r,onSubmit:i,onCancel:a,onBlur:o,maxLength:s,className:c,\"aria-label\":l}=e,u=J1($,0,r)?K1($,0,r,e=>r(e.target.value)):$[1],d=J2($,2,a,i)?K2($,2,a,i,e=>{e.stopPropagation(),!e.nativeEvent.isComposing&&(e.key===\"Enter\"?(e.preventDefault(),i()):e.key===\"Escape\"&&(e.preventDefault(),a()))}):$[4],f=J1($,5,c)?K1($,5,c,p(\"hide-focus-ring bg-transparent text-primary border-none\",\"[text-align:-webkit-match-parent] [text-align:match-parent]\",c)):$[6],h=J5($,7,l,t,s,o,u,d,f,n)?K5($,7,l,t,s,o,u,d,f,n,m(\"input\",{ref:t,type:\"text\",dir:\"auto\",value:n,maxLength:s,\"aria-label\":l,onChange:u,onBlur:o,onKeyDown:d,className:f})):$[15],_=J2($,16,t,r)?K2($,16,t,r,m(Fh,{inputRef:t,onValueChange:r})):$[18];return J2($,19,h,_)?K2($,19,h,_,g(x,{children:[h,_]})):$[21]}"
   ],
   "RP": [
    "function RP(e){let $=J9(9),{menuOpen:t,topClass:n,children:r}=e,i=P(null),a,o;$[0]===J8?(a=()=>{let e=i.current,t=e?.closest(\"[data-row]\")??null;if(e===null||t===null)return;let n=()=>{let{offsetWidth:n,offsetHeight:r}=e;if(n>0&&r>0){let e=Math.max(yP,Math.round(n-r+vP));t.style.setProperty(bP,`${e}px`)}};n();let r=new ResizeObserver(n);return r.observe(e),()=>{r.disconnect(),t.style.removeProperty(bP)}},o=[],$[0]=a,$[1]=o):(a=$[0],o=$[1]),I(a,o);let s=t||void 0,c=t?\"opacity-0\":\"group-hover:opacity-0 group-has-[:focus-visible]:opacity-0\",l=J2($,2,c,n)?K2($,2,c,n,p(IP,n,\"w-max min-w-[calc(var(--df-row-ctl)+8px)] px-0.5\",LP,c)):$[4];return J3($,5,r,s,l)?K3($,5,r,s,l,m(\"span\",{ref:i,\"data-row-decoration\":\"\",\"data-size\":\"xs\",\"aria-hidden\":s,className:l,children:r})):$[8]}"
   ],
   "GP": [
    "function GP(e){let $=J9(18),t,n,r,i,a;J1($,0,e)?({icon:n,onClick:r,className:t,ref:a,...i}=e,K5($,0,e,t,n,r,i,a)):(t=$[1],n=$[2],r=$[3],i=$[4],a=$[5]);let o=n??\"DotsHorizontal\",s=J1($,6,o)?K1($,6,o,UP(o)):$[7],c=J1($,8,t)?K1($,8,t,p(\"size-[var(--df-row-ctl)] text-secondary hover:text-primary aria-expanded:text-primary\",t)):$[9],l=J1($,10,r)?K1($,10,r,e=>{e.stopPropagation(),e.preventDefault(),r?.(e)}):$[11];return J5($,12,i,a,s,c,l)?K5($,12,i,a,s,c,l,m(W,{ref:a,variant:\"ghost\",iconOnly:!0,...s,tooltip:!1,className:c,onClick:l,...i,\"data-row-action\":\"\",tabIndex:-1})):$[17]}"
   ],
   "iP": [
    "function iP(e){let $=J9(2),{keys:t}=e;return J1($,0,t)?K1($,0,t,m(ke,{keys:t,variant:\"text\",onFill:!0,\"aria-hidden\":\"true\",className:\"ms-1 me-[var(--df-radius-pill)] leading-none text-[color:var(--muted-as-secondary,var(--cds-text-muted))] opacity-0 group-hover:opacity-100\"})):$[1]}"
   ]
  },
  "previous": {
   "hP": "shared-18-D3y8YMFN.js#Ak",
   "dP": "shared-18-D3y8YMFN.js#Ek",
   "fP": "shared-18-D3y8YMFN.js#Dk",
   "pP": "shared-18-D3y8YMFN.js#Ok",
   "RP": "shared-18-D3y8YMFN.js#Xk",
   "GP": "shared-18-D3y8YMFN.js#rA",
   "iP": "shared-18-D3y8YMFN.js#yk"
  }
 },
 {
  "target": "sessions-page-band.mjs",
  "source": "shared-18-Cfqwgjc5.js",
  "exports": {
   "ES": "sessionsPageBand"
  },
  "aliases": {
   "ES": null
  },
  "features": {
   "ES": [
    "function ES({hasFrameShell:e,frameHeader:t,hasDesktopTopBar:n,isClaudeApp:r}){return e&&t!==\"owned\"&&t!==\"belowMd\"||n&&!e?\"compact\":e&&r?\"tall-frame\":\"tall\"}"
   ]
  },
  "previous": {
   "ES": "shared-18-D3y8YMFN.js#mb"
  }
 },
 {
  "target": "sessions-page-awaiting-label.mjs",
  "source": "shared-18-Cfqwgjc5.js",
  "exports": {
   "xF": "sessionsPageAwaitingLabel"
  },
  "aliases": {
   "xF": "Ts"
  },
  "features": {
   "xF": [
    "function xF(e){return e===\"question\"?bF.awaitingQuestion:bF.awaitingPermission}"
   ]
  },
  "previous": {
   "xF": "shared-18-D3y8YMFN.js#kA"
  }
 },
 {
  "target": "sidebar-group-copy.mjs",
  "source": "shared-18-Cfqwgjc5.js",
  "exports": {
   "KN": "sidebarGroupMessages"
  },
  "aliases": {
   "KN": null
  },
  "features": {
   "KN": [
    "KN=Sh({moveTo:{defaultMessage:\"Move to group\",id:\"GJD89iLOVK\"},moveCountTo:{defaultMessage:\"Move {count} to group\",id:\"nX1+Eie4aq\"},removeFrom:{defaultMessage:\"Ungrouped\",id:\"97vzU+lFpS\"},removeFromSeveral:{defaultMessage:\"Ungrouped\",id:\"97vzU+lFpS\"},newEllipsis:{defaultMessage:\"New group\\u2026\",id:\"ZLhKz4Rw7U\"},newTitle:{defaultMessage:\"New group\",id:\"ygnzUaOi0O\"},nameLabel:{defaultMessage:\"Group name\",id:",
    ":{defaultMessage:\"Ungroup\",id:\"spDZoJMDpt\"},waiting:{defaultMessage:\"A session in this group is waiting on you\",id:\"m9de2ymf/O\"},createAndSwitch:{defaultMessage:\"Create and group by custom\",id:\"nF/BSwAl07\"},switchNote:{defaultMessage:\"The list will switch to Custom groups to show it.\",id:\"OPBWeZTVgv\"}})"
   ]
  },
  "previous": {
   "KN": "shared-18-D3y8YMFN.js#ck"
  }
 },
 {
  "target": "titlebar-title-rect.mjs",
  "source": "shared-18-Cfqwgjc5.js",
  "exports": {
   "Pw": "titleGroupRect"
  },
  "aliases": {
   "Pw": "Gf"
  },
  "features": {
   "Pw": [
    "function Pw(e){return(e.closest(\".cc-lined-title-group\")??e).getBoundingClientRect()}"
   ]
  },
  "previous": {
   "Pw": "shared-18-D3y8YMFN.js#aS"
  }
 },
 {
  "target": "titlebar-lead-parts--shared-18.mjs",
  "source": "shared-18-Cfqwgjc5.js",
  "auxiliaryOf": "titlebar-lead-parts.mjs",
  "exports": {
   "Bw": "panelsTitleLeadClass"
  },
  "aliases": {
   "Bw": "xf"
  },
  "features": {
   "Bw": [
    "Bw=`${Nw} flex items-center gap-[calc(var(--cds-pad-md)_-_--spacing(1.5))] min-w-[calc(32px+var(--cds-h-control,24px)+var(--cds-pad-md)_-_--spacing(1.5))] group-data-[pills-compact]/lead:min-w-[calc(8px+var(--cds-h-control,24px)+var(--cds-pad-md)_-_--spacing(1.5))]`"
   ]
  },
  "previous": {
   "Bw": "shared-18-D3y8YMFN.js#dS"
  }
 },
 {
  "target": "electron-environment-parent.mjs",
  "source": "shared-18-Cfqwgjc5.js",
  "electron": "electron/generated/environment-parent.mjs",
  "exports": {
   "qz": "environmentParent"
  },
  "aliases": {
   "qz": null
  },
  "features": {
   "qz": [
    "function qz(e){let t=e.replace(/[\\\\/]$/,\"\"),n=Math.max(t.lastIndexOf(\"/\"),t.lastIndexOf(\"\\\\\"));return n<=0?\"\":$d(t.slice(0,n))}"
   ]
  },
  "previous": {
   "qz": "shared-18-D3y8YMFN.js#lU"
  }
 },
 {
  "target": "nested-session-parts.mjs",
  "source": "shared-18-Cfqwgjc5.js",
  "exports": {
   "Gb": "NestedStatusDot",
   "Ub": "synchronizeStatusAnimation",
   "rP": "sidebarHitRowMainClass",
   "PF": "NestedErrorIcon"
  },
  "aliases": {
   "Gb": "hh",
   "Ub": "gh",
   "rP": "Ys",
   "PF": "hs"
  },
  "features": {
   "Gb": [
    "function Gb(e){let $=J9(2),{kind:t}=e;return J1($,0,t)?K1($,0,t,m(\"span\",{className:\"status-dot\",\"data-kind\":t,onAnimationStart:Ub})):$[1]}"
   ],
   "Ub": [
    "function Ub(e){let t=e.target;Vb(t)&&Hb(t,t.getAnimations())}"
   ],
   "rP": [
    "rP=`${nP} hit-row-main`"
   ],
   "PF": [
    "function PF(e){let $=J9(3),{color:t,shape:n}=e,r=n===void 0?\"Warning\":n;return J2($,0,t,r)?K2($,0,t,r,m(X,{name:r,size:\"sm\",className:t})):$[2]}"
   ]
  },
  "reexports": {
   "nestedFocusClass": {
    "module": "sidebar-row-primitive.mjs",
    "name": "sidebarFocusClass"
   }
  },
  "previous": {
   "Gb": "shared-18-D3y8YMFN.js#qv",
   "Ub": "shared-18-D3y8YMFN.js#Kv",
   "rP": "shared-18-D3y8YMFN.js#vk",
   "PF": "shared-18-D3y8YMFN.js#HA"
  }
 },
 {
  "target": "session-cycle-focus.mjs",
  "source": "shared-183-B2N6Zy4J.js",
  "exports": {
   "GU": "activeElementHops",
   "qU": "anyActiveElementHop"
  },
  "aliases": {
   "GU": "Ea",
   "qU": "Da"
  },
  "features": {
   "GU": [
    "function GU(e){let t=[];try{let n=e??null;for(let e=0;e<UU;e+=1){if(n===null||n.nodeType!==1)return{hops:t,isTruncated:!1};let e=n.shadowRoot?.activeElement??null;if(e===null||e===n||e.nodeType!==1)return{hops:t,isTruncated:!1};t.push(e),n=e}return{hops:t,isTruncated:!0}}catch{return{hops:t,isTruncated:!0}}}"
   ],
   "qU": [
    "function qU(e,t){return e.isTruncated||e.hops.some(t)}"
   ]
  },
  "reexports": {
   "asProgrammaticClick": {
    "cds": "asProgrammaticClick",
    "binding": "shared-183-B2N6Zy4J.js#Ph"
   }
  },
  "previous": {
   "GU": "shared-156-BLTosN8U.js#IK",
   "qU": "shared-156-BLTosN8U.js#RK"
  }
 },
 {
  "target": "visible-box.mjs",
  "source": "shared-183-B2N6Zy4J.js",
  "exports": {
   "EG": "visibleBox"
  },
  "aliases": {
   "EG": "na"
  },
  "features": {
   "EG": [
    "function EG(e,{box:t=e.getBoundingClientRect(),ownScope:n=null}={}){let r=mr(e);if(!r||t.width===0&&t.height===0)return null;let i=t.top,a=t.bottom,o=t.left,s=t.right;for(let t=e.parentElement;t!==null&&t!==e.ownerDocument.body;t=t.parentElement){let e=r.getComputedStyle(t),c=e.overflowY!==\"visible\",l=e.overflowX!==\"visible\";if(!c&&!l)continue;let u=t.getBoundingClientRect();if(c){let r=n===null||!n.contains(t);i=Math.max(i,u.top+(r?CG(e.scrollPaddingTop):0)),a=Math.min(a,u.bottom-(r?CG(e.scrollPaddingBottom):0))}l&&(o=Math.max(o,u.left),s=Math.min(s,u.right))}return{top:i,bottom:a,left:o,right:s}}"
   ]
  },
  "previous": {
   "EG": "shared-156-BLTosN8U.js#Uq"
  }
 },
 {
  "target": "surface-chord-layers.mjs",
  "source": "shared-183-B2N6Zy4J.js",
  "exports": {
   "OW": "surfaceChordLayerSelector"
  },
  "aliases": {
   "OW": "ca"
  },
  "features": {
   "OW": [
    "OW=`[role=\"menu\"],[role=\"listbox\"],[role=\"dialog\"],[role=\"alertdialog\"],dialog[open],${EW}`"
   ]
  },
  "previous": {
   "OW": "shared-156-BLTosN8U.js#qK"
  }
 },
 {
  "target": "electron-string-grapheme-limit.mjs",
  "source": "shared-2-CsjIBQD8.js",
  "electron": "electron/generated/string-grapheme-limit.mjs",
  "exports": {
   "tB": "graphemeSafeLimit"
  },
  "aliases": {
   "tB": "gc"
  },
  "features": {
   "tB": [
    "function tB(e,t){if(e.length<=t)return e;let n=Yz();if(n)try{let r=0;for(let{segment:i}of n.segment(e)){if(r+i.length>t)break;r+=i.length}return e.slice(0,r)}catch{}return e.slice(0,t)}"
   ]
  },
  "previous": {
   "tB": "shared-2-TF8v67kg.js#fU"
  }
 },
 {
  "target": "grapheme-prefix.mjs",
  "source": "shared-2-CsjIBQD8.js",
  "exports": {
   "Qz": "graphemePrefix"
  },
  "aliases": {
   "Qz": null
  },
  "features": {
   "Qz": [
    "function Qz(e,t,n){let r=Yz();if(r)try{let i=0,a=n?Zz(r,e):r.segment(e);for(let{index:n}of a){if(i===t)return e.slice(0,n);i+=1}return e}catch{}return Array.from(e).slice(0,t).join(\"\")}"
   ]
  },
  "previous": {
   "Qz": "shared-2-TF8v67kg.js#dU"
  }
 },
 {
  "target": "sidebar-pr-card.mjs",
  "source": "shared-20-DUEo90UF.js",
  "exports": {
   "MM": "SidebarPrCardContext",
   "FM": "sidebarPrMessages",
   "BM": "sidebarPrEntryLabel",
   "eN": "SidebarPrEntry",
   "oN": "SidebarPrCard",
   "cN": "sidebarPrCoveredControl",
   "lN": "SidebarPrGlyph",
   "fN": "sidebarPrTitle",
   "nN": "SidebarDetailTooltip"
  },
  "aliases": {
   "MM": null,
   "FM": null,
   "BM": null,
   "eN": null,
   "oN": null,
   "cN": "xn",
   "lN": null,
   "fN": "jn",
   "nN": null
  },
  "features": {
   "MM": [
    "MM=g(null)"
   ],
   "FM": [
    "FM=zu({blocked:{defaultMessage:\"Waiting\",id:\"3vGE6DB/KP\"},error:{defaultMessage:\"Error\",id:\"KN7zKn8z4F\"},working:{defaultMessage:\"Working\",id:\"gAR0atqpRn\"},connected:{defaultMessage:\"Connected\",id:\"IvjoDSPGEQ\"},offline:{defaultMessage:\"Offline\",id:\"7UOvbTyDYx\"},selfHosted:{defaultMessage:\"Self-hosted\",id:\"08itlpYbB9\"},pullRequests:{defaultMessage:\"Pull requests\",id:\"uDMSR+gnHL\"},prGlyph:{defaultMessage:\"{count, plural, one {Pull request} other {Pull requests}} \\u00B7 {state}\",id:\"skKd6wp98q\"},prCount:{defaultMessage:\"{count, plural, one {# pull request} other {# pull requests}}\",id:\"LBbSp73Fvx\"}})"
   ],
   "BM": [
    "function BM(e,t){let n=t.state===\"open\"&&t.ciState!==\"passed\"?t.ciState:void 0;return n?e.formatMessage(RM[n]):zM(e,t)}"
   ],
   "eN": [
    "function eN(e){let $=J9(16),{entry:t}=e,n=Z(),{icon:r,textClass:a}=Ks[t.state],o=t.url,s=J2($,0,r,a)?K2($,0,r,a,{name:r,className:a}):$[2],c=t.number===void 0?void 0:`#${t.number}`,l=t.title,u=t.additions,d=t.deletions,f=J1($,3,t.ciState)||J2($,4,t.state,n)?I2($,4,Z1($,3,BM(n,{state:t.state,count:1,ciState:t.ciState}),t.ciState),t.state,n):$[6];return J1($,7,t.additions)||J1($,8,t.deletions)||J1($,9,t.repo)||J1($,10,t.title)||J4($,11,t.url,s,c,f)?I4($,11,Z1($,10,Z1($,9,Z1($,8,Z1($,7,i(jM,{href:o,onClick:tN,glyph:s,numberText:c,title:l,additions:u,deletions:d,stateLine:f,repo:t.repo}),t.additions),t.deletions),t.repo),t.title),t.url,s,c,f):$[15]}"
   ],
   "oN": [
    "function oN(e){let $=J9(33),{entries:t,keyboardOnly:n,pastTheSlot:r,children:a}=e,s=n!==void 0&&n,l=r!==void 0&&r,u=Z(),d=C(),f=_(MM),p=f?.onPrCardOpenChange,m,g;J1($,0,p)?(m=()=>()=>p?.(!1),g=[p],K2($,0,p,m,g)):(m=$[1],g=$[2]),h(m,g);let[v,y]=c(!1),[x,S]=c(!1),[w,T]=c(!1),E=J2($,3,v,x)?K2($,3,v,x,e=>(v||x)&&e.overflowMenuOpen):$[5],D=rs(E),O=J0($,6)?K0($,6,e=>{T(e.currentTarget.contains(e.target))}):$[6],k;if(J1($,7",
    ",P,F,I,R)?K4($,23,P,F,I,R,i(fo.Popup,{side:P,align:\"start\",sideOffset:F,padding:\"none\",\"aria-label\":I,collisionPadding:js,className:wM,onClick:tN,onDoubleClick:tN,onPointerDown:tN,children:R})):$[27];return J4($,28,N,z,j,M)?K4($,28,N,z,j,M,o(fo.Root,{delay:250,lazy:!0,disabled:j,onOpenChange:M,children:[N,z]})):$[32]}"
   ],
   "cN": [
    "function cN(e){let t=e?.entries??QM;if(t.length!==0)return e=>i(oN,{entries:t,keyboardOnly:!0,children:i(\"span\",{className:\"flex items-center\",\"data-arrows-only\":\"\",children:e})})}"
   ],
   "lN": [
    "function lN(e){let $=J9(15),{pr:t,place:n}=e,r=Z(),a=t.entries??QM,s=J2($,0,a.length,n)||J1($,2,t.state)?I1($,2,Z2($,0,n===\"title\"?o(\"span\",{\"aria-hidden\":!0,\"data-pr-glyph\":t.state,className:",
    "4,r)||J1($,5,t.count)||J1($,6,t.state)?I1($,6,Z1($,5,Z1($,4,r.formatMessage(FM.prGlyph,{count:t.count,state:Ls(r,t.state)}),r),t.count),t.state):$[7];return J2($,8,s,e)?K2($,8,s,e,i(nN,{content:e,children:s})):$[10]}let c=n===\"title\";return J3($,11,a,s,c)?K3($,11,a,s,c,i(oN,{entries:a,pastTheSlot:c,children:s})):$[14]}"
   ],
   "fN": [
    "function fN(e){return i(lN,{pr:e,place:\"title\"})}"
   ],
   "nN": [
    "function nN(e){let $=J9(3),{content:t,children:n}=e;return Gc()?J2($,0,n,t)?K2($,0,n,t,i(U,{content:t,delay:500,closeDelay:0,hoverable:!1,lazy:!0,className:\"pointer-events-none\",children:n})):$[2]:n}"
   ]
  },
  "readBy": {
   "MM": "oN"
  },
  "previous": {
   "MM": "shared-20-mUr7IqZY.js#HE",
   "FM": "shared-20-mUr7IqZY.js#GE",
   "BM": "shared-20-mUr7IqZY.js#XE",
   "eN": "shared-20-mUr7IqZY.js#sD",
   "oN": "shared-20-mUr7IqZY.js#pD",
   "cN": "shared-20-mUr7IqZY.js#hD",
   "lN": "shared-20-mUr7IqZY.js#gD",
   "fN": "shared-20-mUr7IqZY.js#yD",
   "nN": "shared-20-mUr7IqZY.js#lD"
  }
 },
 {
  "target": "sidebar-details-model.mjs",
  "source": "shared-20-DUEo90UF.js",
  "exports": {
   "UM": "sidebarDescription",
   "wN": "sidebarFolder",
   "TN": "sidebarEnvironment",
   "DN": "sidebarRemoteEnvironment",
   "NA": "sidebarEnvironmentPlace"
  },
  "aliases": {
   "UM": "wn",
   "wN": "Dn",
   "TN": null,
   "DN": "Sn",
   "NA": "Yr"
  },
  "features": {
   "UM": [
    "function UM({status:e,underStatusHeading:t,reason:n,message:r,place:i,heading:a}){let o=t?void 0:e,s=e===\"blocked\"&&(o!==void 0||n!==void 0),c=s?n??r:r,l=s||c===void 0?o:void 0;return{word:l,text:c,place:HM(a,i.text)&&(l!==void 0||c!==void 0)?void 0:i}}"
   ],
   "wN": [
    "function wN(e){if(!e.isScratchWorkspace)return e.repoInfo?.name||(e.cwd?cs(e.cwd):void 0)||void 0}"
   ],
   "TN": [
    "function TN(e){let t=wN(e);switch(e.type){case\"remote\":{let n=e._originalSession;return{kind:(n?NA({environmentId:n.environment_id,poolId:n.self_hosted_runner_pool_id}):e.pendingCloudPlace?.worker)?.type===\"pool\"?\"selfHosted\":\"cloud\",label:t}}case\"bridge\":return{kind:\"bridge\",label:e.bridgeMachineName??t,offline:e.isBridgeOffline};case\"local\":case\"cli\":return e.remote?.kind===\"ssh\"?{kind:\"ssh\",label:t??Vi(e.remote)}:t===void 0?void 0:{kind:\"local\",label:t};default:e.type;return}}"
   ],
   "DN": [
    "function DN(e){let t=TN(e);return t===void 0||t.kind===\"local\"?void 0:t}"
   ],
   "NA": [
    "function NA(e){return e.environmentId?{type:\"environment\",id:e.environmentId}:e.poolId?{type:\"pool\",id:e.poolId}:null}"
   ]
  },
  "previous": {
   "UM": "shared-20-mUr7IqZY.js#$E",
   "wN": "shared-20-mUr7IqZY.js#jD",
   "TN": "shared-20-mUr7IqZY.js#ND",
   "DN": "shared-20-mUr7IqZY.js#PD",
   "NA": "shared-20-mUr7IqZY.js#eT"
  }
 },
 {
  "target": "sidebar-details-view.mjs",
  "source": "shared-20-DUEo90UF.js",
  "exports": {
   "XM": "SidebarDescription",
   "uN": "SidebarEnvironmentGlyph",
   "dN": "sidebarEnvironmentLabel",
   "mN": "sidebarRightDecoration"
  },
  "aliases": {
   "XM": "hn",
   "uN": null,
   "dN": null,
   "mN": "kn"
  },
  "features": {
   "XM": [
    "function XM(e){let $=J9(31),{line:t}=e,n=Z(),a=C(),s=Gc(),c=L(),l=_(Vs),u=S(null),d=J1($,0,n)||J1($,1,t.word)?I1($,1,Z1($,0,t.word&&n.formatMessage(JM[t.word]),n),t.word):$[2],f=J1($,3,n)||J1($,4,t.place?.text)||J2($,5,t.text,d)?I2($,5,Z1($,4,Z1($,3,n.formatList([d,t.text,t.place?.text].filter(ZM),{type:\"unit\"}),n),t.place?.text),t.text,d):$[7],p=s&&!c&&!l,m=t.word===\"idle\"||t.text!==void 0||t.place?.spoken===!0?void",
    ",children:[y,b]})):$[22];if(!p)return x;let w=J1($,23,f)?K1($,23,f,()=>YM(u.current)?i(\"span\",{dir:\"auto\",className:\"block\",children:f}):void 0):$[24],T=J1($,25,a)?K1($,25,a,jf(\"inline-end\",a)):$[26];return J3($,27,x,w,T)?K3($,27,x,w,T,i(U,{content:w,side:T,lazy:!0,children:x})):$[30]}"
   ],
   "uN": [
    "function uN(e){let $=J9(9),{env:t,named:n}=e,r=n!==void 0&&n,a=Z(),o=t.kind===\"bridge\"&&t.offline===!0,s=o?\"LaptopSlash\":PM[t.kind],c=o||void 0,l=J3($,0,t.kind,s,c)?I3($,0,i(\"span\",{\"aria-hidden\":!0,className:\"flex size-[var(--df-row-ctl)] shrink-0 items-center justify-center\",children:i(G,{name:s,size:\"sm\",\"data-env-glyph\":t.kind,\"data-env-offline\":c,className:\"shrink-0 text-[color:var(--muted-as-secondary,var(--cds-text-muted))]\"})}),t.kind,s,c):$[3];return J4($,4,t,l,a,r)?K4($,4,t,l,a,r,r?i(nN,{content:dN(a,t),children:l}):l):$[8]}"
   ],
   "dN": [
    "function dN(e,t){let n=e.formatMessage(IM[t.kind]);return t.kind===\"bridge\"?`${t.label||n} \\u00B7 ${e.formatMessage(t.offline===!0?FM.offline:FM.connected)}`:n}"
   ],
   "mN": [
    "function mN({mark:e,env:t}){return e===void 0?t===void 0?null:i(uN,{env:t}):i(\"span\",{\"aria-hidden\":!0,className:\"flex items-center\",children:e})}"
   ]
  },
  "previous": {
   "XM": "shared-20-mUr7IqZY.js#rD",
   "uN": "shared-20-mUr7IqZY.js#_D",
   "dN": "shared-20-mUr7IqZY.js#vD",
   "mN": "shared-20-mUr7IqZY.js#xD"
  }
 },
 {
  "target": "sessions-page-load-deadline.mjs",
  "source": "shared-20-DUEo90UF.js",
  "exports": {
   "MA": "sessionsPageLoadDeadline"
  },
  "aliases": {
   "MA": "Xr"
  },
  "features": {
   "MA": [
    "MA=1e4"
   ]
  },
  "uniqueBy": {
   "MA": "alias"
  },
  "previous": {
   "MA": "shared-20-mUr7IqZY.js#$w"
  }
 },
 {
  "target": "environment-wsl-folder.mjs",
  "source": "shared-20-DUEo90UF.js",
  "exports": {
   "OL": "wslFolderPath"
  },
  "aliases": {
   "OL": "z"
  },
  "features": {
   "OL": [
    "function OL(e,t){return e.startsWith(\"/\")?e:EL(e,[{distro:{name:t},selectable:!0}])?.posixPath??null}"
   ]
  },
  "previous": {
   "OL": "shared-20-mUr7IqZY.js#QA"
  }
 },
 {
  "target": "nested-session-copy.mjs",
  "source": "shared-20-DUEo90UF.js",
  "exports": {
   "fM": "nestedToggleLabel",
   "pM": "nestedSessionLabel",
   "mM": "nestedStatusLabels",
   "bM": "nestedRevealLabel"
  },
  "aliases": {
   "fM": "Kn",
   "pM": "Bn",
   "mM": "zn",
   "bM": "qn"
  },
  "features": {
   "fM": [
    "function fM(e,t){return e.formatMessage(t?lM.showNested:lM.hideNested)}"
   ],
   "pM": [
    "function pM(e,t,n){return e.formatMessage(n?lM.hiddenMoreCount:lM.hiddenCount,{count:t})}"
   ],
   "mM": [
    "function mM(e,{failed:t,unread:n,working:r}){return{failed:t>0?e.formatMessage(lM.hiddenFailed,{count:t}):void 0,unread:n>0?e.formatMessage(lM.hiddenUnread,{count:n}):void 0,working:r>0?e.formatMessage(lM.hiddenWorking,{count:r}):void 0}}"
   ],
   "bM": [
    "function bM(e,t,n){let r=n.filter(e=>e!==void 0);return r.length===0?e.formatMessage(lM.showHidden,{sessions:t}):e.formatMessage(lM.showHiddenWithNews,{sessions:t,news:e.formatList(r,{type:\"unit\"})})}"
   ]
  },
  "previous": {
   "fM": "shared-20-mUr7IqZY.js#DE",
   "pM": "shared-20-mUr7IqZY.js#OE",
   "mM": "shared-20-mUr7IqZY.js#kE",
   "bM": "shared-20-mUr7IqZY.js#AE"
  }
 },
 {
  "target": "sidebar-family-sort.mjs",
  "source": "shared-21-CuohtEoj.js",
  "exports": {
   "hF": "sidebarFamilyPivot",
   "gF": "sidebarFamilyHead",
   "xF": "orderSidebarFamilies",
   "CF": "splitSidebarFamilies"
  },
  "aliases": {
   "hF": "at",
   "gF": "it",
   "xF": "lt",
   "CF": "ct"
  },
  "features": {
   "hF": [
    "function hF(e,t,n){let r=n?yF(e):wF;if(r.size===0)return _F;let i=new Map(e.flatMap(e=>e.ref.kind===\"code\"?[[e.ref.id,e]]:[])),a=new Map;for(let t of e){let e=r.get(t.ref.id),n=e===void 0?void 0:i.get(e);if(n===void 0)continue;let o=a.get(n.ref.id)??[n];o.push(t),a.set(n.ref.id,o)}let o=new Map;for(let e of a.values()){let n=t(e);for(let t of e)o.set(t.ref.id,n)}return e=>(e.ref.kind===\"code\"?o.get(e.ref.id):void 0)??e}"
   ],
   "gF": [
    "function gF(e){return e[0]}"
   ],
   "xF": [
    "function xF(e,t){let n=yF(e);if(n.size===0)return{ordered:[...e],parentOf:wF};let r=new Map,i=new Set,a=new Map(e.map(e=>[e.ref.id,e]));for(let t of e){let e=n.get(t.ref.id);if(e===void 0)continue;let i=vF(t),a=i!==void 0&&n.get(i)===e?i:e,o=r.get(a)??[];o.push(t),r.set(a,o)}let o=[],s=(e,t)=>{if(!(t>bF))for(let n of r.get(e)??[])i.has(n.ref.id)||(i.add(n.ref.id),o.push(n),s(n.ref.id,t+1))};for(let r of e){let e=n.get(r.ref.id);if(e!==void 0&&t===\"parent\")continue;let c=e??r.ref.id;if(i.has(c))continue;i.add(c);let l=a.get(c);l&&o.push(l),s(c,0)}return{ordered:o,parentOf:n}}"
   ],
   "CF": [
    "function CF(e,t){if(t.size===0)return e.length===0?[]:[{parentId:void 0,rows:[...e]}];let n=[],r;for(let i of e){let e=t.get(i.ref.id),a=n[n.length-1];e!==void 0&&a?.parentId===e?a.rows.push(i):e!==void 0&&r===e?n.push({parentId:e,rows:[i]}):a&&a.parentId===void 0?(a.rows.push(i),r=i.ref.id):(n.push({parentId:void 0,rows:[i]}),r=i.ref.id)}return n}"
   ]
  },
  "previous": {
   "hF": "shared-21-R7LldJ05.js#HU",
   "gF": "shared-21-R7LldJ05.js#UU",
   "xF": "shared-21-R7LldJ05.js#JU",
   "CF": "shared-21-R7LldJ05.js#XU"
  }
 },
 {
  "target": "sidebar-sort-order.mjs",
  "source": "shared-21-CuohtEoj.js",
  "exports": {
   "rF": "sidebarDescendingComparators",
   "iF": "sidebarAscendingComparators"
  },
  "aliases": {
   "rF": "ht",
   "iF": "gt"
  },
  "features": {
   "rF": [
    "rF={recency:Ah,alpha:xh,created:Xh}"
   ],
   "iF": [
    "iF={recency:(e,t)=>Ah(t,e),alpha:(e,t)=>e.title&&t.title?xh(t,e):xh(e,t),created:(e,t)=>Xh(t,e)}"
   ]
  },
  "previous": {
   "rF": "shared-21-R7LldJ05.js#AU",
   "iF": "shared-21-R7LldJ05.js#jU"
  }
 },
 {
  "target": "sidebar-search.mjs",
  "source": "shared-21-CuohtEoj.js",
  "exports": {
   "hj": "sidebarSearchPlacement",
   "gj": "SidebarSearchField"
  },
  "aliases": {
   "hj": "vn",
   "gj": null
  },
  "features": {
   "hj": [
    "function hj(e,t,n){let r=e&&t,i=nj(e);return{fieldAboveNew:r,recentsHeaderIcon:(e||n)&&!i&&!r}}"
   ],
   "gj": [
    "function gj(e){let $=J9(19),{trailing:t}=J1($,0,e)?K1($,0,e,e===void 0?{}:e):$[1],n=Wu(\"default\",\"sidebar_field\"),{shortcutString:r}=An(\"command_palette\"),i=re(),a=t!==void 0,o=a?\"mb-2 flex items-start gap-0.5\":\"mb-2\",s=J2($,2,i,r)?K2($,2,i,r,r?K(r,i):void 0):$[4],c=",
    ",children:l(oe,{keys:r})})):$[8],g=J5($,9,s,c,u,f,h)?K5($,9,s,c,u,f,h,d(Ql,{\"data-row\":\"\",\"data-roving-item\":\"\",\"aria-keyshortcuts\":s,className:c,...u,onMouseDown:_j,onClick:f,children:[p,m,h]})):$[14];return J3($,15,g,o,t)?K3($,15,g,o,t,d(\"div\",{className:o,\"data-tab-section\":\"\",children:[g,t]})):$[18]}"
   ]
  },
  "adapters": {
   "shared-20-DUEo90UF.js": {
    "Ha": {
     "name": "useSidebarSearchIntent",
     "module": "../../source-sidebar-current-adapters.jsx",
     "features": [
      "function Fw(e,t){let $=J9(16),n=e===void 0?\"search\":e,r=tf(),i=vi(Dw.handle),a,o;J1($,0,i)?(a=()=>{i.onFocus(),Cw.reachedFor(!1)},o=e=>{i.onPointerDown(),e?.pointerType!==\"touch\"&&Cw.reachedFor(!1)},K2($,0,i,a,o)):(a=$[1"
     ]
    }
   },
   "shared-1-D1bGaTaN.js": {
    "Vn": {
     "name": "useSidebarSearchShortcut",
     "module": "../../source-sidebar-current-adapters.jsx",
     "features": [
      "function C6(e,t){let $=J9(25),n=jc(),r=tn(),i=vd(),a=Ko(),o=J1($,0,e)?K1($,0,e,x6.has(e)):$[1],s=du(o),c=h6[e],l=t?.override,u=l!==void 0,d=n?\"mac\":\"non-mac\",f=r?\"desktop\":\"web\";c?.bindings;let p;bb0:{if(iu()&&!SE.has(e)"
     ]
    }
   }
  },
  "previous": {
   "hj": "shared-21-R7LldJ05.js#Vz",
   "gj": "shared-21-R7LldJ05.js#Hz"
  }
 },
 {
  "target": "nested-session-model.mjs",
  "source": "shared-21-CuohtEoj.js",
  "exports": {
   "AF": "nestedSessionCounts"
  },
  "aliases": {
   "AF": "ft"
  },
  "features": {
   "AF": [
    "function AF(e){let t=0,n=0,r=0;for(let i of e)i.hasError?t+=1:i.isUnread?n+=1:(i.liveStatus===\"running\"||i.isResponding===!0)&&(r+=1);return{count:e.length,failed:t,unread:n,working:r}}"
   ]
  },
  "reexports": {
   "nestedSessionNeedsInput": {
    "module": "nested-session-needs-input.mjs",
    "name": "nestedSessionNeedsInput"
   }
  },
  "previous": {
   "AF": "shared-21-R7LldJ05.js#rW"
  }
 },
 {
  "target": "string-count.mjs",
  "source": "shared-212-BHMAi0oa.js",
  "exports": {
   "Pw": "countOccurrences"
  },
  "aliases": {
   "Pw": "sv"
  },
  "features": {
   "Pw": [
    "function Pw(e,t){if(t===\"\")return 0;let n=0;for(let r=e.indexOf(t);r!==-1;r=e.indexOf(t,r+t.length))n++;return n}"
   ]
  },
  "previous": {
   "Pw": "shared-78-D5Fw2h0a.js#Ky"
  }
 },
 {
  "target": "sidebar-date-pivot.mjs",
  "source": "shared-22-BACJUrcb.js",
  "exports": {
   "LD": "sidebarLatestFamilyMember"
  },
  "aliases": {
   "LD": null
  },
  "features": {
   "LD": [
    "function LD(e){return e.reduce((e,t)=>t.updatedAtMs>e.updatedAtMs||Number.isNaN(e.updatedAtMs)?t:e)}"
   ]
  },
  "previous": {
   "LD": "shared-22-Bwn3sJTG.js#IT"
  }
 },
 {
  "target": "sidebar-date-groups.mjs",
  "source": "shared-22-BACJUrcb.js",
  "exports": {
   "ID": "currentSidebarDateGroups"
  },
  "aliases": {
   "ID": null
  },
  "features": {
   "ID": [
    "function ID(e,t,n,r,i=!1,{byCreated:a=!1,oldestFirst:o=!1}={}){let s=bD(7,r),c=Mv(e,a?oy:LD,i),l=a?Mv(e,LD,i):c,u=Array.from({length:7},()=>[]),d=[];for(let t of e){let e=c(t),n=xD(a?ag(e):e.updatedAtMs,s);n<7?u[n].push(t):d.push(t)}let f=[];for(let e=0;e<7;e++){let r=u[e];if(r.length===0)continue;let i=e===0?n.formatMessage(FD.today):e===1?n.formatMessage(FD.yesterday):n.formatDate(s[e],{month:\"short\",day:\"numeric\"});f.push({key:`day-${e}`,label:i,sessions:r.slice(0,t),hiddenByCap:Math.max(0,r.length-t)})}if(d.length>0){let e=d.slice(0,t);f.push({key:\"older\",label:n.formatMessage(FD.older),sessions:e,hiddenByCap:Math.max(0,d.length-t),bulkScope:a?e.filter(e=>xD(l(e).updatedAtMs,s)>=7):void 0})}return o?f.reverse():f}"
   ]
  },
  "previous": {
   "ID": "shared-22-Bwn3sJTG.js#FT"
  }
 },
 {
  "target": "split-drag-registry.mjs",
  "source": "shared-23-BRmsPtuN.js",
  "exports": {
   "MO": "splitPointerDrags",
   "NO": "markSplitPointerDrag"
  },
  "aliases": {
   "MO": null,
   "NO": null
  },
  "features": {
   "MO": [
    "MO=new WeakMap"
   ],
   "NO": [
    "function NO(e,t,n){if(!e)return;let r=MO.get(e)??new Set;MO.set(e,r),n?r.add(t):r.delete(t)}"
   ]
  },
  "readBy": {
   "MO": "NO"
  },
  "previous": {
   "MO": "shared-23-BZ6ZY5fu.js#FO",
   "NO": "shared-23-BZ6ZY5fu.js#IO"
  }
 },
 {
  "target": "owner-document.mjs",
  "source": "shared-25-D-aF0gt9.js",
  "exports": {
   "yd": "ownerDocument"
  },
  "aliases": {
   "yd": "Bp"
  },
  "features": {
   "yd": [
    "function yd(e){return e?gd(e)?e:e.ownerDocument??globalThis.document:globalThis.document}"
   ]
  },
  "previous": {
   "yd": "shared-25-DOWZRSlq.js#hf"
  }
 },
 {
  "target": "owner-window.mjs",
  "source": "shared-25-D-aF0gt9.js",
  "exports": {
   "vd": "ownerWindowOrGlobal"
  },
  "aliases": {
   "vd": "Wp"
  },
  "features": {
   "vd": [
    "function vd(e){return _d(e)??globalThis.window}"
   ]
  },
  "reexports": {
   "ownerWindow": {
    "cds": "ownerWindow"
   }
  },
  "previous": {
   "vd": "shared-25-DOWZRSlq.js#mf"
  }
 },
 {
  "target": "terminal-title-wellformed.mjs",
  "source": "shared-25-D-aF0gt9.js",
  "exports": {
   "FW": "stripLoneSurrogates",
   "NW": "isWellFormedText"
  },
  "aliases": {
   "FW": "er",
   "NW": "$n"
  },
  "features": {
   "FW": [
    "function FW(e){return NW(e)?e:MW(e,\"\")}"
   ],
   "NW": [
    "function NW(e){let t=e.isWellFormed;if(typeof t==\"function\")return t.call(e);for(let t=0;t<e.length;t++){let n=e.charCodeAt(t);if(n>=55296&&n<=56319){let n=t+1<e.length?e.charCodeAt(t+1):0;if(n<56320||n>57343)return!1;t++}else if(n>=56320&&n<=57343)return!1}return!0}"
   ]
  },
  "previous": {
   "FW": "shared-25-DOWZRSlq.js#FH",
   "NW": "shared-25-DOWZRSlq.js#NH"
  }
 },
 {
  "target": "sidebar-session-priority.mjs",
  "source": "shared-26-B-POtn5S.js",
  "exports": {
   "sV": "resolveSessionStatePriority",
   "iV": "sessionStatePriorities"
  },
  "aliases": {
   "sV": "Wi",
   "iV": null
  },
  "features": {
   "sV": [
    "function sV(e){if(!e.isArchived){if(e.hasError)return iV.error;if(e.liveStatus===\"awaiting\"||e.liveStatus===\"running\")return iV[e.liveStatus]}return e.hasCompleted&&e.isUnread?iV.ready:iV.idle}"
   ],
   "iV": [
    "iV={awaiting:{state:\"awaiting\",priority:0},error:{state:\"error\",priority:1},ready:{state:\"ready\",priority:2},running:{state:\"running\",priority:3},idle:{state:\"idle\",priority:4}}"
   ]
  },
  "previous": {
   "sV": "shared-26-CGuBxVt9.js#Ij",
   "iV": "shared-26-CGuBxVt9.js#Nj"
  }
 },
 {
  "target": "sessions-page-coordinator.mjs",
  "source": "shared-26-B-POtn5S.js",
  "exports": {
   "_V": "coordinatorSessionTag",
   "vV": "isCoordinatorSession"
  },
  "aliases": {
   "_V": null,
   "vV": "Mi"
  },
  "features": {
   "_V": [
    "_V=\"_coordinator\""
   ],
   "vV": [
    "function vV(e){return e.tags?.includes(_V)??!1}"
   ]
  },
  "previous": {
   "_V": "shared-26-CGuBxVt9.js#qj",
   "vV": "shared-26-CGuBxVt9.js#Jj"
  }
 },
 {
  "target": "nested-session-needs-input.mjs",
  "source": "shared-26-B-POtn5S.js",
  "exports": {
   "cV": "nestedSessionNeedsInput"
  },
  "aliases": {
   "cV": "Gi"
  },
  "features": {
   "cV": [
    "function cV(e){return e.liveStatus===\"awaiting\"||e.pendingPermissions>0}"
   ]
  },
  "previous": {
   "cV": "shared-26-CGuBxVt9.js#Lj"
  }
 },
 {
  "target": "file-output-root.mjs",
  "source": "shared-26-B-POtn5S.js",
  "exports": {
   "MA": "windowsAbsolutePath",
   "FA": "isUncPath"
  },
  "aliases": {
   "MA": "fu",
   "FA": "pu"
  },
  "features": {
   "MA": [
    "MA=/^[A-Za-z]:[\\\\/]/"
   ],
   "FA": [
    "function FA(e){return NA.test(e)}"
   ]
  },
  "uniqueBy": {
   "FA": "alias"
  },
  "previous": {
   "MA": "shared-26-CGuBxVt9.js#DS",
   "FA": "shared-26-CGuBxVt9.js#AS"
  }
 },
 {
  "target": "attachment-file-name.mjs",
  "source": "shared-3-IQTrO7Gx.js",
  "exports": {
   "xl": "AttachmentFileName",
   "Xc": "attachmentNameSplit",
   "Uc": "attachmentNameExtension"
  },
  "aliases": {
   "xl": null,
   "Xc": null,
   "Uc": null
  },
  "features": {
   "xl": [
    "function xl(e){let $=J9(37),{name:t,lines:n}=e,r=J1($,0,t)?K1($,0,t,Bc(t)):$[1],i=A(null),a=bl(i,r),o,s,c,l,u,d,m;if(J3($,2,n,a,r)){m=Symbol.for(\"react.early_return_sentinel\");bb0:{o=Xc(r,n,a);let e=J1($,12,r)?K1($,12,r,W(r)):$[13];if(o===null){let t=Jc[n],a=J1($,14,t)?K1($,14,t,Pe(\"text-footnote font-normal text-primary\",t,\"break-words [overflow-wrap:anywhere]\")):$[15],o=J1($,16,r)?K1($,16,r,p(\"bdi\",{children:r})):$",
    "I1($,26,Z1($,25,p(qc,{stem:o.tailStem,extension:o.tailExt,stemClass:\"truncate py-[0.125em] -my-[0.125em]\"}),o.tailExt),o.tailStem):$[27],_=J2($,28,s,h)?K2($,28,s,h,p(\"span\",{className:s,children:h})):$[30];return J5($,31,c,l,u,d,_)?K5($,31,c,l,u,d,_,g(\"span\",{\"aria-hidden\":c,title:l,className:u,children:[d,_]})):$[36]}"
   ],
   "Xc": [
    "function Xc(e,t,n){let r=Uo(e);if(r.length<=Gc||!n&&r.length<=Wc*t)return null;let i=r.slice(-12).join(\"\"),a=Uc(e)[1],o=a===\"\"?\"\":`.${a}`,s=o!==\"\"&&i.endsWith(o)&&i!==o;return{head:r.slice(0,-12).join(\"\"),tailStem:s?i.slice(0,-o.length):i,tailExt:s?o:\"\"}}"
   ],
   "Uc": [
    "function Uc(e){let t=e.lastIndexOf(\".\");return t<=0||t===e.length-1?[e,\"\"]:[e.slice(0,t),e.slice(t+1)]}"
   ]
  },
  "previous": {
   "xl": "shared-2-TF8v67kg.js#Km",
   "Xc": "shared-2-TF8v67kg.js#xm",
   "Uc": "shared-2-TF8v67kg.js#hm"
  }
 },
 {
  "target": "file-document-types.mjs",
  "source": "shared-3-IQTrO7Gx.js",
  "exports": {
   "qN": "isOfficeDocument",
   "eP": "binaryFileExtension"
  },
  "aliases": {
   "qN": "kt",
   "eP": "st"
  },
  "features": {
   "qN": [
    "function qN(e){return GN.test(e)}"
   ],
   "eP": [
    "opus|aiff?|wma|midi?|ico|tiff?|heic|heif|jfif|psd|tga|dng|svgz)$/i"
   ]
  },
  "uniqueBy": {
   "qN": "alias"
  },
  "previous": {
   "qN": "shared-28-DNYlf4wu.js#dN",
   "eP": "shared-28-DNYlf4wu.js#vN"
  }
 },
 {
  "target": "file-output-normalize.mjs",
  "source": "shared-3-IQTrO7Gx.js",
  "exports": {
   "eN": "normalizeOutputPath",
   "qM": "isAbsolutePath"
  },
  "aliases": {
   "eN": "Bt",
   "qM": "xt"
  },
  "features": {
   "eN": [
    "function eN(e){return iN(e,/[\\\\/]+/)}"
   ],
   "qM": [
    "function qM(e){return e.startsWith(\"/\")||io.test(e)}"
   ]
  },
  "previous": {
   "eN": "shared-28-DNYlf4wu.js#SM",
   "qM": "shared-28-DNYlf4wu.js#_M"
  }
 },
 {
  "target": "path-parts.mjs",
  "source": "shared-3-IQTrO7Gx.js",
  "exports": {
   "aN": "splitPath"
  },
  "aliases": {
   "aN": "Qt"
  },
  "features": {
   "aN": [
    "function aN(e,{posix:t=!1}={}){let n=(t?/\\/$/:/[\\\\/]$/).test(e)?e.length-1:e.length,r=t?e.lastIndexOf(\"/\",n-1):Math.max(e.lastIndexOf(\"/\",n-1),e.lastIndexOf(\"\\\\\",n-1));return r<0?[\"\",e]:[e.slice(0,r+1),e.slice(r+1)]}"
   ]
  },
  "previous": {
   "aN": "shared-28-DNYlf4wu.js#DM"
  }
 },
 {
  "target": "tab-focus-key-scroll--shared-31.mjs",
  "source": "shared-31-C9BqSSuD.js",
  "auxiliaryOf": "tab-focus-key-scroll.mjs",
  "exports": {
   "rT": "keyScrollEditable"
  },
  "aliases": {
   "rT": null
  },
  "features": {
   "rT": [
    "rT='input,textarea,select,[contenteditable=\"\"],[contenteditable=\"true\"],[contenteditable=\"plaintext-only\"]'"
   ]
  },
  "previous": {
   "rT": "c7f8992b4-DUZwS58e.js#m"
  }
 },
 {
  "target": "session-cycle-terminal.mjs",
  "source": "shared-36-fqRFYwOb.js",
  "exports": {
   "TM": "terminalHasFocus"
  },
  "aliases": {
   "TM": "H"
  },
  "features": {
   "TM": [
    "function TM(e=document){let t=e.activeElement;return!!t&&t.closest(\"[data-ccd-terminal]\")!==null}"
   ]
  },
  "previous": {
   "TM": "shared-7-DBAgAi5H.js#zB"
  }
 },
 {
  "target": "titlebar-lead-classes.mjs",
  "source": "shared-38-DyF0_Fim.js",
  "exports": {
   "jn": "titleLeadClass",
   "An": "titleSlotClass",
   "Dn": "titleTextClass",
   "Mn": "titleCaretSlotClass",
   "Pn": "titleGhostClass"
  },
  "aliases": {
   "jn": "Ar",
   "An": "Er",
   "Dn": "Mr",
   "Mn": "Dr",
   "Pn": "Or"
  },
  "features": {
   "jn": [
    "jn=\"flex items-center min-w-[calc(32px+var(--cds-h-control,24px))] group-data-[pills-compact]/lead:min-w-[calc(8px+var(--cds-h-control,24px))]\""
   ],
   "An": [
    "An=`flex items-center ${kn}`"
   ],
   "Dn": [
    "Dn=\"truncate text-body font-medium font-control text-primary select-none\""
   ],
   "Mn": [
    "Mn=\"aspect-square w-control shrink-0\""
   ],
   "Pn": [
    "Pn=`${Nn} motion-safe:animate-pulse`"
   ]
  },
  "uniqueBy": {
   "Mn": "alias"
  },
  "previous": {
   "jn": "shared-6-sd9jbJqs.js#cg",
   "An": "shared-6-sd9jbJqs.js#sg",
   "Dn": "shared-6-sd9jbJqs.js#ig",
   "Mn": "shared-6-sd9jbJqs.js#lg",
   "Pn": "shared-6-sd9jbJqs.js#dg"
  }
 },
 {
  "target": "titlebar-origin-classes.mjs",
  "source": "shared-38-DyF0_Fim.js",
  "exports": {
   "fn": "originRowClass",
   "pn": "originBoxClass",
   "gn": "panelsNoOriginClass",
   "mn": "panelsOriginBoxClass"
  },
  "aliases": {
   "fn": "Br",
   "pn": "tr",
   "gn": "Zn",
   "mn": "Pn"
  },
  "features": {
   "fn": [
    "fn=\"flex min-w-0 items-center\""
   ],
   "pn": [
    "pn=\"flex h-[calc(1.5rem*var(--cds-rem-scale,1))] w-[var(--chat-gutter-start,32px)] min-w-[calc(var(--origin-box-end-clearance,0)*1.75rem*var(--cds-rem-scale,1))] pe-[calc(var(--origin-box-end-clearance,0)*0.25rem*var(--cds-rem-scale,1))] [[data-chat-gutter-start=shave]_&]:w-[var(--chat-gutter-start,calc(var(--chat-gutter)-(var(--tiles-gap)-var(--tiles-padding))))] shrink-0 items-center justify-center\""
   ],
   "gn": [
    "gn=\"ps-md shrink-0\""
   ],
   "mn": [
    "mn=\"flex size-control shrink-0 items-center justify-center me-[calc(--spacing(1)+var(--cds-pad-md))]\""
   ]
  },
  "uniqueBy": {
   "fn": "alias"
  },
  "previous": {
   "fn": "shared-6-sd9jbJqs.js#Yh",
   "pn": "shared-6-sd9jbJqs.js#Wh",
   "gn": "shared-6-sd9jbJqs.js#Jh",
   "mn": "shared-6-sd9jbJqs.js#Gh"
  }
 },
 {
  "target": "sessions-page-model.mjs",
  "source": "shared-39-ZCs0lAwB.js",
  "exports": {
   "LE": "isSessionArchived",
   "KT": "withSessionResponding",
   "PE": "sessionPageState",
   "tE": "sessionPageMatches",
   "eE": "sortSessionPageRows",
   "RE": "isCoordinatorSessionRow",
   "zE": "isListedSession"
  },
  "aliases": {
   "LE": "at",
   "KT": null,
   "PE": "vt",
   "tE": "mt",
   "eE": "bt",
   "RE": null,
   "zE": "dt"
  },
  "features": {
   "LE": [
    "function LE(e){switch(e.source.kind){case\"chat\":return e.source.data.is_archived===!0;case\"cowork\":case\"code\":return!!e.source.data.isArchived;default:return!1}}"
   ],
   "KT": [
    "function KT(e,t){if(!t||e.source.kind!==\"code\")return e;let n=e.hasPendingApproval===!0,r=e.source.data.isArchived?\"idle\":n?\"awaiting\":\"running\",i=+(r===\"awaiting\");return e.isResponding===!0&&e.liveStatus===r&&e.isRunning===(r!==\"idle\")&&e.hasError===!1&&e.pendingPermissions===i?e:{...e,liveStatus:r,isRunning:r!==\"idle\",isResponding:!0,hasError:!1,pendingPermissions:i}}"
   ],
   "PE": [
    "function PE(e,t){if(e.ref.kind===\"chat\")return LE(e)?\"idle\":Eo(e);let n=e.ref.kind===\"code\";return n&&e.source.kind===\"code\"&&e.source.data.isArchived?\"idle\":Po({kind:n?\"code\":\"cowork\",hasError:e.source.kind===\"cowork\"?!!e.source.data.error:e.hasError,liveStatus:e.liveStatus,hasCompleted:e.hasCompleted,isUnread:t?.isUnread??e.isUnread,prState:t?.prState??\"none\",explicitUnread:t?.explicitUnread??!1,isArchived:e.source.kind===\"cowork\"?e.source.data.isArchived:void 0})}"
   ],
   "tE": [
    "function tE(e,t){return e.ref.kind===\"chat\"||(e.title??\"\").toLowerCase().includes(t)}"
   ],
   "eE": [
    "function eE(e,t){if(!t)return e.sort(ZT);let n=[],r=[];for(let t of e)(t.ref.kind===\"chat\"?n:r).push(t);return[...n,...r.sort(ZT)]}"
   ],
   "RE": [
    "function RE(e){return e._originalSession!==void 0&&Er(e._originalSession)}"
   ],
   "zE": [
    "function zE(e){return!e.scheduledTaskId&&!e.shownInParentTabs&&!RE(e)}"
   ]
  },
  "previous": {
   "LE": "shared-11-_AVGLHEz.js#dw",
   "KT": "shared-11-_AVGLHEz.js#SC",
   "PE": "shared-11-_AVGLHEz.js#cw",
   "tE": "shared-11-_AVGLHEz.js#jC",
   "eE": "shared-11-_AVGLHEz.js#AC",
   "RE": "shared-11-_AVGLHEz.js#fw",
   "zE": "shared-11-_AVGLHEz.js#pw"
  }
 },
 {
  "target": "sidebar-sort-model.mjs",
  "source": "shared-39-ZCs0lAwB.js",
  "exports": {
   "ZT": "compareSidebarUpdated",
   "QT": "sidebarCreatedTimestamp",
   "$T": "compareSidebarCreated",
   "nE": "compareSidebarTitle"
  },
  "aliases": {
   "ZT": "Y",
   "QT": "Z",
   "$T": "q",
   "nE": "J"
  },
  "features": {
   "ZT": [
    "function ZT(e,t){return t.updatedAtMs-e.updatedAtMs}"
   ],
   "QT": [
    "function QT(e){return Number.isFinite(e.createdAtMs)&&e.createdAtMs>0&&e.createdAtMs<=e.updatedAtMs?e.createdAtMs:e.updatedAtMs}"
   ],
   "$T": [
    "function $T(e,t){return QT(t)-QT(e)}"
   ],
   "nE": [
    "function nE(e,t){let n=e.title||null,r=t.title||null;return n===r?0:n===null?1:r===null?-1:wg(n,r)}"
   ]
  },
  "previous": {
   "ZT": "shared-11-_AVGLHEz.js#DC",
   "QT": "shared-11-_AVGLHEz.js#OC",
   "$T": "shared-11-_AVGLHEz.js#kC",
   "nE": "shared-11-_AVGLHEz.js#MC"
  }
 },
 {
  "target": "nested-session-parent-tabs.mjs",
  "source": "shared-39-ZCs0lAwB.js",
  "exports": {
   "th": "sideSessionsSupported",
   "oh": "sideSessionNesting",
   "sp": "projectThreadNotStarted",
   "bT": "btwChildrenInParentTabs",
   "Ip": "withoutParentTabChildren"
  },
  "aliases": {
   "th": null,
   "oh": null,
   "sp": "Ya",
   "bT": "Ft",
   "Ip": null
  },
  "features": {
   "th": [
    "function th(e){return e.appFeatures?.sideSessions?.status===\"supported\"}"
   ],
   "oh": [
    "function oh(e){return th(e)?Hm(e)?\"nested_less_side_chats\":\"nested\":\"flat\"}"
   ],
   "sp": [
    "function sp(e){return e.projectThreadStarted!==!0}"
   ],
   "bT": [
    "function bT(e,t,n){if(t.length===0)return e;let r=new Set(e.map(e=>mr(e.sessionId))),i=t.filter(e=>!r.has(mr(e.sessionId))&&n?.(e)!==!0);return i.length===0?e:[...e,...i]}"
   ],
   "Ip": [
    "function Ip(e,t){return t.size===0?e:new Map([...e].filter(([e])=>!t.has(e)))}"
   ]
  },
  "previous": {
   "th": "shared-11-_AVGLHEz.js#Rf",
   "oh": "shared-11-_AVGLHEz.js#Uf",
   "sp": "shared-11-_AVGLHEz.js#jl",
   "bT": "shared-11-_AVGLHEz.js#jd",
   "Ip": "shared-11-_AVGLHEz.js#Md"
  }
 },
 {
  "target": "sidebar-bulk-worktree-copy--shared-46.mjs",
  "source": "shared-46-Cx3Fc1bY.js",
  "auxiliaryOf": "sidebar-bulk-worktree-copy.mjs",
  "exports": {
   "Xe": "worktreeListLimit"
  },
  "aliases": {
   "Xe": null
  },
  "features": {
   "Xe": [
    "Xe=10"
   ]
  },
  "previous": {
   "Xe": "shared-46-BIbZBGFq.js#RD"
  }
 },
 {
  "target": "sidebar-upgrade-badge.mjs",
  "source": "shared-5-u8kha2eH.js",
  "exports": {
   "uF": "SidebarUpgradeBadge"
  },
  "aliases": {
   "uF": "Va"
  },
  "features": {
   "uF": [
    "function uF(e){let $=J9(10),{className:t,onClick:n,as:r,children:i}=e,a=r===void 0?\"span\":r,o=n&&\"cursor-interactive hover:border-border-300 transition-colors\",s=J2($,0,t,o)?K2($,0,t,o,u(\"border-0.5 border-border-400 text-accent px-1.5 py-px rounded-3xl text-caption-regular\",o,t)):$[2],c=J1($,3,i)?K1($,3,i,i??d(Nl,{defaultMessage:\"Upgrade\",id:\"0h/lPMeYkq\"})):$[4];return J4($,5,a,n,s,c)?K4($,5,a,n,s,c,d(a,{className:s,onClick:n,children:c})):$[9]}"
   ]
  },
  "previous": {
   "uF": "shared-3-BCEbd8Fv.js#LR"
  }
 },
 {
  "target": "composer-composition.mjs",
  "source": "shared-5-u8kha2eH.js",
  "exports": {
   "TZ": "finishCompositionBeforePaste",
   "SZ": "trackComposition",
   "EY": "clearCompositionEdge",
   "SY": "compositionEdgeKey",
   "TY": "isNonInclusiveMarkEdge"
  },
  "aliases": {
   "TZ": null,
   "SZ": null,
   "EY": null,
   "SY": null,
   "TY": null
  },
  "features": {
   "TZ": [
    "TZ=(e,t)=>{if(t)try{t.type===\"paste\"&&e.composing&&e.editable&&!/Android \\d/.test(navigator.userAgent)&&CZ(e)}finally{wZ.set(t,e.state.doc)}}"
   ],
   "SZ": [
    "SZ=(e,t)=>(xZ.set(e,t.type===\"compositionend\"?\"\":t.data),!1)"
   ],
   "EY": [
    "EY=(e,t)=>{let n=Math.min((t??0)+1,e.doc.content.size);return t!==null&&e.doc.textBetween(t,n)===\"\\u200B\"&&e.delete(t,n),e.setMeta(SY,null).setMeta(\"addToHistory\",!1).setMeta(\"preventAutolink\",!0)}"
   ],
   "SY": [
    "SY=new Du(\"compositionEdgeGuard\")"
   ],
   "TY": [
    "TY=(e,t=e.marks())=>e.textOffset===0&&(e.nodeBefore?.marks.some(e=>e.type.spec.inclusive===!1&&!e.isInSet(t))??!1)"
   ]
  },
  "previous": {
   "TZ": "shared-28-DNYlf4wu.js#RS",
   "SZ": "shared-28-DNYlf4wu.js#FS",
   "EY": "shared-28-DNYlf4wu.js#Jb",
   "SY": "shared-28-DNYlf4wu.js#Wb",
   "TY": "shared-28-DNYlf4wu.js#qb"
  }
 },
 {
  "target": "sidebar-menu-order.mjs",
  "source": "shared-55-BRv2XBP7.js",
  "exports": {
   "rM": "sidebarMenuGroupOrder",
   "iM": "SidebarOrderedMenu"
  },
  "aliases": {
   "rM": "Di",
   "iM": "Ei"
  },
  "features": {
   "rM": [
    "rM=[\"new\",\"open\",\"edit\",\"share\",\"organize\",\"settings\",\"view\",\"staff\",\"panes\",\"remove\",\"removeGroup\"]"
   ],
   "iM": [
    "function iM(e){let $=J9(2),{groups:t}=e;return J1($,0,t)?K1($,0,t,a(Su,{order:rM,groups:t})):$[1]}"
   ]
  },
  "previous": {
   "rM": "shared-46-BIbZBGFq.js#EO",
   "iM": "shared-46-BIbZBGFq.js#DO"
  }
 },
 {
  "target": "sidebar-group-view.mjs",
  "source": "shared-55-BRv2XBP7.js",
  "exports": {
   "uI": "SidebarListContext",
   "FI": "sidebarGroupToggles",
   "II": "sidebarHasCollapsedGroups",
   "LI": "sidebarToggleVisible",
   "RI": "sidebarPrecedingToggles",
   "zI": "SidebarGroupViewItems",
   "lM": "sidebarListMenuReasons"
  },
  "aliases": {
   "uI": "On",
   "FI": null,
   "II": "xn",
   "LI": null,
   "RI": null,
   "zI": "bn",
   "lM": null
  },
  "features": {
   "uI": [
    "uI=_(null)"
   ],
   "FI": [
    "function FI(e,t){return Array.from(e?.querySelectorAll(`[data-group-toggle][aria-expanded=\"${t===\"expanded\"}\"]`)??[]).filter(e=>e.closest(\"[inert]:not([data-cds-sheet-inert])\")===null)}"
   ],
   "II": [
    "function II(e){return FI(e,\"collapsed\").length>0}"
   ],
   "LI": [
    "function LI(e){return e.checkVisibility?.()!==!1}"
   ],
   "RI": [
    "function RI(e,t){return Array.from(e?.querySelectorAll(\"[data-group-toggle]\")??[]).filter(e=>e.compareDocumentPosition(t)&Node.DOCUMENT_POSITION_FOLLOWING)}"
   ],
   "zI": [
    "function zI(){let $=J9(27),e=v(uI)?.getList,t=J1($,0,e)?K1($,0,e,()=>{let t=e?.()??null,n=t?.ownerDocument.activeElement??null;return{canCollapse:FI(t,\"expanded\").some(LI),canExpand:II(t),opener:n!==null&&t?.contains(n)?n:null}}):$[1],[n]=l(t),r=J1($,2,e)?K1($,2,e,t=>{for(let n of FI(e?.()??null,t))n.click()}):$[3],i=J3($,4,r,n,e)?K3($,4,r,n,e,()=>{let{opener:t}=n,i=t?.isConnected?RI(e?.()??null,t):[];if(r(\"expanded\"",
    "$,17,n.canExpand)?I1($,17,n.canExpand?void 0:a(Q,{...lM.expandAll}),n.canExpand):$[18],g=J0($,19)?K0($,19,a(Q,{defaultMessage:\"Expand all\",id:\"u6c1aDVosk\"})):$[19],_=J3($,20,p,m,h)?K3($,20,p,m,h,a(Du,{onClick:p,disabled:m,disabledReason:h,children:g})):$[23];return J2($,24,_,f)?K2($,24,_,f,s(u,{children:[f,_]})):$[26]}"
   ],
   "lM": [
    "lM=vu({archiveAllEmpty:{defaultMessage:\"Nothing to archive right now.\",id:\"ZtngfDoaOw\"},archiveAllNone:{defaultMessage:\"Every item here is pinned, open in a pane or window, already archived, or can\\u2019t be archived from here.\",id:\"WcEgwHn3hX\"},deleteAllEmpty:{defaultMessage:\"Nothing to delete right now.\",id:\"+HvNPGpYj/\"},deleteAllNone:{defaultMessage:\"Every item here is pinned, open in a pane or window, or can\\u2019t be deleted from here.\",id:\"5ogpc/hZ1i\"},collapseAll:{defaultMessage:\"Everything shown is already collapsed.\",id:\"YbG7pENd2I\"},expandAll:{defaultMessage:\"Everything is already expanded.\",id:\"WVqS3QU7Yg\"}})"
   ]
  },
  "readBy": {
   "uI": "zI"
  },
  "previous": {
   "uI": "shared-46-BIbZBGFq.js#YO",
   "FI": "shared-46-BIbZBGFq.js#mk",
   "II": "shared-46-BIbZBGFq.js#hk",
   "LI": "shared-46-BIbZBGFq.js#gk",
   "RI": "shared-46-BIbZBGFq.js#_k",
   "zI": "shared-46-BIbZBGFq.js#vk",
   "lM": "shared-46-BIbZBGFq.js#MO"
  }
 },
 {
  "target": "sidebar-bulk-family.mjs",
  "source": "shared-55-BRv2XBP7.js",
  "exports": {
   "QF": "bulkNestedFamilies"
  },
  "aliases": {
   "QF": "Bn"
  },
  "features": {
   "QF": [
    "function QF(e,t,n,r){let i=new Set(n.flatMap(e=>r(e)?.codeRef.id??[])),a=n.flatMap(n=>{let i=r(n),a=i&&e.nestedSessionsToAsk(i.codeRef,t);return i&&a?[{t:n,...i,...a}]:[]}),o=new Set(a.filter(e=>e.canStay.some(e=>!i.has(e))).map(e=>e.codeRef.id)),s=a.filter(e=>o.has(e.codeRef.id)||e.nested.some(e=>o.has(e))),c=new Set(s.map(e=>e.t)),l=({codeRef:e})=>s.filter(t=>t.nested.includes(e.id)).length;return{bulk:n.filter(e=>!c.has(e)),asking:s.sort((e,t)=>l(t)-l(e))}}"
   ]
  },
  "previous": {
   "QF": "shared-46-BIbZBGFq.js#LO"
  }
 },
 {
  "target": "sidebar-bulk-delete-copy.mjs",
  "source": "shared-55-BRv2XBP7.js",
  "exports": {
   "jj": "bulkDeleteMessages",
   "kj": "remoteDeleteMessages",
   "Mj": "bulkDeleteCopy"
  },
  "aliases": {
   "jj": null,
   "kj": null,
   "Mj": null
  },
  "features": {
   "jj": [
    "jj=vu({groupTitle:{defaultMessage:\"{count, plural, one {Delete # session in \\u201C{groupName}\\u201D?} other {Delete # sessions in \\u201C{groupName}\\u201D?}}\",id:\"jW3YB6Yt22\"},someArchived:{defaultMessage:\"{archivedCount, plural, =1 {One of them is archived.} one {# of them is archived.} other {# of them are archived.}}\",id:\"thSLjfjt0Q\"},someStillWorking:{defaultMessage:",
    "onlyOneStillWorking:{defaultMessage:\"It\\u2019s still working, and deleting stops it.\",id:\"WLDlSLqSkB\"},unloadedStay:{defaultMessage:\"Sessions that haven\\u2019t loaded yet won\\u2019t be deleted.\",id:\"XfgjqB+jrQ\"},confirmLabel:{defaultMessage:\"Delete {count, plural, one {# session} other {# sessions}}\",id:\"ygN3/8ScC7\"}})"
   ],
   "kj": [
    "kj=vu({namedWillBeDeleted:{defaultMessage:\"\\u201C{sessionTitle}\\u201D will be deleted. This can\\u2019t be undone, but the conversation isn\\u2019t deleted from {place}.\",id:\"U8GvBEh9tQ\"},willBeDeleted:{defaultMessage:\"{count, plural, one {This session} other {These # sessions}} will be deleted.\",id:\"9v2650Xhlj\"},allArchived:{defaultMessage:\"{count, plural, one {This archived session} other {These # archived sessions}} will be deleted. This can\\u2019t be undone, but SSH and WSL conversations aren\\u2019t deleted from where they ran.\",id:\"pqZgw5BFVm\"},cantBeUndone:{defaultMessage:\"This can\\u2019t be undone, but SSH and WSL conversations aren\\u2019t deleted from where they ran.\",id:\"8RBHjn1Tal\"},cantBeUndoneThere:{defaultMessage:\"This can\\u2019t be undone, but the conversation isn\\u2019t deleted from {place}.\",id:\"ktgQM52K0g\"}})"
   ],
   "Mj": [
    "function Mj(e,t,{groupName:n,archivedCount:r,workingCount:i=0,unloadedRemain:a=!1,someRanElsewhere:o=!1},s){let c=o?e.formatMessage(kj.willBeDeleted,{count:t}):Gc(e,s,t),l=o?e.formatMessage(kj.allArchived,{count:t}):sl(e,s,t),u=o?[e.formatMessage(kj.cantBeUndone)]:[],d=i===0?[]:[t===1?e.formatMessage(jj.onlyOneStillWorking):e.formatMessage(jj.someStillWorking,{workingCount:i})],f=r>=t&&r>0?[l]:r>0?[c,...d,e.formatMessage(jj.someArchived,{archivedCount:r}),...u]:a||o||i>0?[c,...d,...u]:null;return f&&a&&f.push(e.formatMessage(jj.unloadedStay)),{title:n?e.formatMessage(jj.groupTitle,{count:t,groupName:n}):void 0,description:f?.join(\" \"),confirmLabel:e.formatMessage(jj.confirmLabel,{count:t})}}"
   ]
  },
  "previous": {
   "jj": "shared-46-BIbZBGFq.js#eO",
   "kj": "shared-46-BIbZBGFq.js#$D",
   "Mj": "shared-46-BIbZBGFq.js#tO"
  }
 },
 {
  "target": "sidebar-bulk-worktree-copy.mjs",
  "source": "shared-55-BRv2XBP7.js",
  "exports": {
   "mj": "worktreeFolderMessages",
   "vj": "worktreeConfirmCopyOf",
   "Cj": "WorktreeSessionTitles"
  },
  "aliases": {
   "mj": null,
   "vj": null,
   "Cj": null
  },
  "features": {
   "mj": [
    "mj=vu({dirty:{defaultMessage:\"This session\\u2019s worktrees have {count, plural, one {# uncommitted change} other {# uncommitted changes}} that will be discarded.\",id:\"3EPOoWk4T5\"},discardDirty:{defaultMessage:\"Discarding deletes {count, plural, one {# uncommitted change} other {# uncommitted changes}} in this session\\u2019s worktrees. The session stays archived.\",id:\"3LJaqzEOOm\"},discardUnknown:{defaultMessage:\"This session\\u2019s worktrees have uncommitted changes. Discarding deletes them. The session stays archived.\",id:\"0VJ+apUaPr\"},folderDirty:{defaultMessage:\"{folder}: {count, plural, one {# uncommitted change} other {# uncommitted changes}}\",id:\"+sPwOqR8AG\"},folderUnreadable:{defaultMessage:\"{folder}: couldn\\u2019t check\",id:\"u54/dZCPD0\"}})"
   ],
   "vj": [
    "function vj(e,t,n,{changes:r,folders:i,committedOn:o,sessions:s}){if(s!==void 0)return{title:e.formatMessage({defaultMessage:\"Delete {count, plural, one {session} other {# sessions}}?\",id:\"kT5Jg7Fz/u\"},{count:s}),confirmLabel:e.formatMessage({defaultMessage:\"Delete {count, plural, one {# session} other {# sessions}}\",id:\"ygN3/8ScC7\"},{count:s}),description:a(Q,{defaultMessage:",
    ",id:\"6QNLixJ0A2\",values:{count:l}}):a(Q,{defaultMessage:\"This session\\u2019s worktree has {count, plural, one {# uncommitted change} other {# uncommitted changes}} that will be discarded.\",id:\"I5Fw/kFWMk\",values:{count:c}}))}}"
   ],
   "Cj": [
    "function Cj(e){let $=J9(7),{titles:t}=e,n=t.length-dj,r=J1($,0,t)?K1($,0,t,t.slice(0,dj).map(wj)):$[1],i=J1($,2,n)?K1($,2,n,n>0&&a(\"li\",{children:a(Q,{defaultMessage:\"\\u2026 and {more} more\",id:\"wHChJytals\",values:{more:n}})})):$[3];return J2($,4,r,i)?K2($,4,r,i,s(\"ul\",{className:\"mt-md flex flex-col gap-xs break-words\",children:[r,i]})):$[6]}"
   ]
  },
  "reexports": {
   "worktreeListLimit": {
    "module": "sidebar-bulk-worktree-copy--shared-46.mjs",
    "name": "worktreeListLimit"
   }
  },
  "previous": {
   "mj": "shared-46-BIbZBGFq.js#VD",
   "vj": "shared-46-BIbZBGFq.js#WD",
   "Cj": "shared-46-BIbZBGFq.js#qD"
  }
 },
 {
  "target": "environment-picker-keys.mjs",
  "source": "shared-55-BRv2XBP7.js",
  "exports": {
   "QC": "environmentStarKey",
   "$C": "environmentStarKeys",
   "ew": "thisComputerStarKey",
   "lw": "starredIncludes"
  },
  "aliases": {
   "QC": "ys",
   "$C": "bs",
   "ew": "gs",
   "lw": "Ss"
  },
  "features": {
   "QC": [
    "function QC(e){return XC[e.target?.kind??\"local\"]?`machine-preset:${e.id}`:`preset:${e.id}`}"
   ],
   "$C": [
    "function $C(e){return[`preset:${e.id}`,`machine-preset:${e.id}`]}"
   ],
   "ew": [
    "ew=\"local:this-computer\""
   ],
   "lw": [
    "function lw(e,t){return t.some(t=>e.includes(t))}"
   ]
  },
  "previous": {
   "QC": "shared-46-BIbZBGFq.js#qx",
   "$C": "shared-46-BIbZBGFq.js#Jx",
   "ew": "shared-46-BIbZBGFq.js#Yx",
   "lw": "shared-46-BIbZBGFq.js#iS"
  }
 },
 {
  "target": "path-tooltip.mjs",
  "source": "shared-55-BRv2XBP7.js",
  "exports": {
   "mV": "pathTooltipOptions",
   "gV": "pathTooltipContent"
  },
  "aliases": {
   "mV": "D",
   "gV": "k"
  },
  "features": {
   "mV": [
    "mV={side:\"bottom\",align:\"start\",className:\"max-w-[min(480px,var(--available-width))]\"}"
   ],
   "gV": [
    "function gV(e){return a(\"span\",{dir:\"ltr\",children:e.split(/(?<=[\\\\/])/).map((e,t)=>a(\"span\",{className:\"inline-block max-w-full whitespace-pre-wrap\",children:e},t))})}"
   ]
  },
  "previous": {
   "mV": "cc5c56f5c-BoRtnbt1.js#t",
   "gV": "cc5c56f5c-BoRtnbt1.js#n"
  }
 },
 {
  "target": "sidebar-nav-badge.mjs",
  "source": "shared-57-grpFrBWt.js",
  "exports": {
   "Mb": "SidebarNavBadge"
  },
  "aliases": {
   "Mb": null
  },
  "features": {
   "Mb": [
    "function Mb(e){let $=J9(9),{badge:t}=e;if(t===\"new\"){let e=J1($,0,t)?K1($,0,t,jb(t)):$[1];return J1($,2,e)?K1($,2,e,i(Db,{className:\"ms-2\",children:e})):$[3]}if(t===\"upgrade\")return J0($,4)?K0($,4,i(\"span\",{\"data-inline-badge\":\"\",className:\"contents\",children:i(Uc,{className:\"ms-auto me-0.5\"})})):$[4];let n=J1($,5,t)?K1($,5,t,jb(t)):$[6];return J1($,7,n)?K1($,7,n,n===null?null:i(O,{variant:\"neutral\",size:\"xs\",className:\"ms-2\",children:n})):$[8]}"
   ]
  },
  "previous": {
   "Mb": "shared-21-R7LldJ05.js#OQ"
  }
 },
 {
  "target": "sidebar-running-mark.mjs",
  "source": "shared-57-grpFrBWt.js",
  "exports": {
   "Y_": "SidebarRowMarkSlot",
   "Z_": "SidebarRunningMark"
  },
  "aliases": {
   "Y_": null,
   "Z_": null
  },
  "features": {
   "Y_": [
    "function Y_(e){let $=J9(6),{label:t,placement:n,children:r}=e,a=n===void 0?\"inline\":n,o=J1($,0,t)?K1($,0,t,t===null?{\"aria-hidden\":!0}:{role:\"img\",\"aria-label\":t}):$[1],s=a===\"decoration\"?\"flex size-[var(--df-row-ctl)] shrink-0 items-center justify-center\":\"ms-auto me-[calc((var(--df-row-h)-var(--df-row-ctl))/2-var(--df-row-px))] flex size-[var(--df-row-ctl)] shrink-0 items-center justify-center\";return J3($,2,r,o,s)?K3($,2,r,o,s,i(\"span\",{...o,className:s,children:r})):$[5]}"
   ],
   "Z_": [
    "function Z_(e){let $=J9(3),{label:t}=e,n=J0($,0)?K0($,0,i(uo,{kind:\"running\"})):$[0];return J1($,1,t)?K1($,1,t,i(Y_,{label:t,children:n})):$[2]}"
   ]
  },
  "previous": {
   "Y_": "shared-21-R7LldJ05.js#UY",
   "Z_": "shared-21-R7LldJ05.js#GY"
  }
 },
 {
  "target": "sidebar-group-options.mjs",
  "source": "shared-57-grpFrBWt.js",
  "exports": {
   "a_": "useSidebarGroupByOptions"
  },
  "aliases": {
   "a_": "br"
  },
  "features": {
   "a_": [
    "function a_(){let $=J9(29),e=tl(),t=Bt(),n=il(),r=J1($,0,e)?K1($,0,e,e.formatMessage({defaultMessage:\"Date\",id:\"P7PLVjLe4f\"})):$[1],i=J1($,2,r)?K1($,2,r,[\"date\",r]):$[3],a=J2($,4,e,t)?K2($,4,e,t,t?[[\"state\",e.formatMessage({defaultMessage:\"Status\",id:\"tzMNF3jWoU\"})]]:[]):$[6],o=J1($,7,e)?K1($,7,e,e.formatMessage({defaultMessage:\"Folder\",id:\"ukQpDs7M+0\"})):$[8],s=J1($,9,o)?K1($,9,o,[\"project\",o]):$[10],c=J1($,11,e)?K1($,11,e,e.formatMessage({defaultMessage:\"Environment\",id:\"bYA6fPCd5A\"})):$[12],l=J1($,13,c)?K1($,13,c,[\"environment\",c]):$[14],u=J2($,15,n,e)?K2($,15,n,e,n?[]:[[\"custom\",e.formatMessage({defaultMessage:\"Custom\",id:\"Sjo1P44FYy\"})]]):$[17],d=J1($,18,e)?K1($,18,e,e.formatMessage({defaultMessage:\"None\",id:\"9/SKZH+1jy\"})):$[19],f=J1($,20,d)?K1($,20,d,[\"none\",d]):$[21];return J5($,22,i,a,s,l,u,f)?K5($,22,i,a,s,l,u,f,[i,...a,s,l,...u,f]):$[28]}"
   ]
  },
  "adapters": {
   "shared-55-BRv2XBP7.js": {
    "at": {
     "name": "useStatusGrouping",
     "module": "../../source-sidebar-sections-adapters.jsx",
     "features": [
      "function pB(){let e=ht(\"claudeai_session_state\"),{account:t}=dn(),n=t?.settings?.ccr_session_state_buckets??!0;return e&&n}"
     ]
    }
   },
   "shared-140-DfG6VwpK.js": {
    "Ft": {
     "name": "useSidebarOverlayGate",
     "module": "../../source-sidebar-sections-adapters.jsx",
     "features": [
      "function Qf(){return $f().overlayEnabled}"
     ]
    }
   }
  },
  "previous": {
   "a_": "shared-21-R7LldJ05.js#GJ"
  }
 },
 {
  "target": "nested-session-separator.mjs",
  "source": "shared-57-grpFrBWt.js",
  "exports": {
   "iA": "NestedStatusSeparator"
  },
  "aliases": {
   "iA": null
  },
  "features": {
   "iA": [
    "function iA(e){let $=J9(3),{children:t}=e,n=J0($,0)?K0($,0,i(\"span\",{\"aria-hidden\":!0,className:\"px-1.5 text-muted\",children:\"\\u00B7\"})):$[0];return J1($,1,t)?K1($,1,t,o(\"span\",{className:\"flex shrink-0 items-center\",children:[n,t]})):$[2]}"
   ]
  },
  "previous": {
   "iA": "shared-21-R7LldJ05.js#z7"
  }
 },
 {
  "target": "environment-common-copy.mjs",
  "source": "shared-62-DoCqVpIq.js",
  "exports": {
   "fI": "environmentCommonMessages"
  },
  "aliases": {
   "fI": "Vc"
  },
  "features": {
   "fI": [
    "fI=dI({close:{defaultMessage:\"Close\",id:\"rbrahOGMC3\"},dismiss:{defaultMessage:\"Dismiss\",id:\"TDaF6JVgG6\"},clear:{defaultMessage:\"Clear\",id:\"/GCoTAAjMN\"},clearSelection:{defaultMessage:\"Clear selection\",id:\"EYIw2MRv0g\"},removeItem:{defaultMessage:\"Remove {item}\",id:\"GHRzoS0vqm\"},selectAllRows:{defaultMessage:\"Select all rows\",id:\"8BaLs0ay0E\"},selectRow:{defaultMessage:\"Select {name}\",id:\"G65XMEd2UY\"},selectAll:{",
    ",id:\"tMD3zeSdk9\"},commentFrom:{defaultMessage:\"Comment from {name}\",id:\"OrfonIfPJg\"},unreadCommentFrom:{defaultMessage:\"Unread comment from {name}\",id:\"PP0GexRDYJ\"},commentClaudeWorking:{defaultMessage:\"{label}, Claude is working\",id:\"UfwBap60nm\"},commentResolved:{defaultMessage:\"{label}, resolved\",id:\"m0n/+8TowC\"}})"
   ]
  },
  "previous": {
   "fI": "shared-78-D5Fw2h0a.js#QW"
  }
 },
 {
  "target": "terminal-title-runs.mjs",
  "source": "shared-62-DoCqVpIq.js",
  "exports": {
   "TF": "capBlankRuns",
   "gF": "blankRunClass"
  },
  "aliases": {
   "TF": "Qc",
   "gF": "Zc"
  },
  "features": {
   "TF": [
    "function TF(e,t=jF(),n=DF){return e.replace(t,(e,t,r)=>{let i=t===0||r[t-1]===`\n`?n:32,a=0,o=\"\";for(let t of e){if(o.length+t.length>2*i)break;let e=AF(t);if(a+e>i)break;a+=e,o+=t}return o})}"
   ],
   "gF": [
    "gF=\"(?:[^\\\\S\\\\n]|[\\\\p{Mn}\\\\p{Me}\\\\u034F\\\\u115F\\\\u1160\\\\u17B4\\\\u17B5\\\\u180B-\\\\u180F\\\\u200C\\\\u200D\\\\u2800\\\\u3164\\\\uFE00-\\\\uFE0F\\\\uFFA0\\\\uFFFC\\\\u{1D159}\\\\u{13441}\\\\u{13442}\\\\u{16910}\\\\u{E0000}-\\\\u{E01EF}])\""
   ]
  },
  "previous": {
   "TF": "shared-52-uHFNjl7C.js#kB",
   "gF": "shared-52-uHFNjl7C.js#bB"
  }
 },
 {
  "target": "sidebar-session-state.mjs",
  "source": "shared-8-BqfCbkJd.js",
  "exports": {
   "kS": "resolveSessionDisplayState",
   "jS": "sessionNeedsAttention"
  },
  "aliases": {
   "kS": "Wl",
   "jS": "Ul"
  },
  "features": {
   "kS": [
    "function kS(e,t){let{state:n}=As(e);if(e.isArchived||n!==\"ready\"&&n!==\"idle\")return n;let r=e.kind===\"code\"&&e.prState!==\"none\",i=r&&(e.prState===\"merged\"||e.prState===\"closed\"),a=n===\"ready\";return a&&e.explicitUnread?\"ready\":r&&(i||t?.readyAfterPr)?\"pr\":a?\"ready\":r?\"pr\":\"idle\"}"
   ],
   "jS": [
    "function jS(e){if(e.isArchived)return!!(e.hasCompleted&&e.isUnread);let t=e.kind===\"code\"&&(e.prState===\"merged\"||e.prState===\"closed\")&&!e.explicitUnread;return e.hasError||e.liveStatus!==\"idle\"||!t&&e.hasCompleted&&e.isUnread}"
   ]
  },
  "previous": {
   "kS": "shared-8-Db1QN4mf.js#pb",
   "jS": "shared-8-Db1QN4mf.js#hb"
  }
 },
 {
  "target": "sessions-page-live-status.mjs",
  "source": "shared-8-BqfCbkJd.js",
  "exports": {
   "AS": "sessionPageLiveStatus"
  },
  "aliases": {
   "AS": "Hl"
  },
  "features": {
   "AS": [
    "function AS(e){return e.liveStatus===\"awaiting\"?\"awaiting\":e.liveStatus===\"running\"?\"running\":e.isUnread?\"ready\":\"idle\"}"
   ]
  },
  "previous": {
   "AS": "shared-8-Db1QN4mf.js#mb"
  }
 },
 {
  "target": "session-cycle-claims.mjs",
  "source": "shared-9-BgdM6Y1f.js",
  "exports": {
   "Hv": "claimComposerArrowKeys",
   "Uv": "composerClaimsArrowKeys"
  },
  "aliases": {
   "Hv": "Dt",
   "Uv": "Et"
  },
  "features": {
   "Hv": [
    "function Hv(e,t){let n=Vv.get(e);return n||(n=new Set,Vv.set(e,n)),n.add(t),()=>{n.delete(t)}}"
   ],
   "Uv": [
    "function Uv(e){let t=Vv.get(e);if(!t)return!1;for(let e of t)if(e())return!0;return!1}"
   ]
  },
  "previous": {
   "Hv": "shared-9-CM21XrJw.js#By",
   "Uv": "shared-9-CM21XrJw.js#Vy"
  }
 },
 {
  "target": "sidebar-environment-copy.mjs",
  "source": "shared-92-BOgyxePb.js",
  "exports": {
   "MI": "sidebarEnvironmentMessages"
  },
  "aliases": {
   "MI": "Rc"
  },
  "features": {
   "MI": [
    "MI=bo({local:{defaultMessage:\"Local\",id:\"MpsZ34EpZH\"},remote:{defaultMessage:\"Cloud\",id:\"fiPvwYljok\"},bridge:{defaultMessage:\"Remote Control\",id:\"4mv6Z9Tv+V\"},ssh:{defaultMessage:\"SSH\",id:\"waUHa40VD6\"},slack:{defaultMessage:\"Slack\",id:\"sjzDbuQbES\"}})"
   ]
  },
  "previous": {
   "MI": "shared-78-D5Fw2h0a.js#vQ"
  }
 },
 {
  "target": "electron-environment-basename.mjs",
  "source": "shared-92-BOgyxePb.js",
  "electron": "electron/generated/environment-basename.mjs",
  "exports": {
   "pk": "environmentBasename"
  },
  "aliases": {
   "pk": "vp"
  },
  "features": {
   "pk": [
    "function pk(e){let t=e.replace(/[\\\\/]$/,\"\"),n=Math.max(t.lastIndexOf(\"/\"),t.lastIndexOf(\"\\\\\"));return n===-1?t:t.slice(n+1)}"
   ]
  },
  "previous": {
   "pk": "shared-52-uHFNjl7C.js#nk"
  }
 },
 {
  "target": "environment-wsl-unc.mjs",
  "source": "shared-92-BOgyxePb.js",
  "exports": {
   "WI": "wslUncPath"
  },
  "aliases": {
   "WI": "$c"
  },
  "features": {
   "WI": [
    "function WI(e){let t=/^[\\\\/]{2}(?:wsl\\$|wsl\\.localhost)[\\\\/]+([^\\\\/]+)([\\\\/].*)?$/i.exec(e);if(!t)return null;let n=(t[2]??\"/\").replace(/[\\\\]+/g,\"/\").replace(/\\/+/g,\"/\");return{distro:t[1],posixPath:n===\"\"?\"/\":n}}"
   ]
  },
  "previous": {
   "WI": "shared-78-D5Fw2h0a.js#AQ"
  }
 },
 {
  "target": "terminal-title-text.mjs",
  "source": "shared-92-BOgyxePb.js",
  "exports": {
   "eN": "visibleTitleText",
   "$M": "sanitizeTitleText",
   "aN": "limitCodePoints"
  },
  "aliases": {
   "eN": "Ad",
   "$M": "Fd",
   "aN": "Vd"
  },
  "features": {
   "eN": [
    "function eN(e){return $M(e).replace(/[\\u200C\\u200D]/g,\"\").trim()}"
   ],
   "$M": [
    "function $M(e){return iN(e,ZM)}"
   ],
   "aN": [
    "function aN(e,t){return Array.from(e.replace(/\\p{Cs}/gu,\"\")).slice(0,t).join(\"\")}"
   ]
  },
  "readBy": {
   "$M": "eN"
  },
  "previous": {
   "eN": "shared-78-D5Fw2h0a.js#bj",
   "$M": "shared-78-D5Fw2h0a.js#yj",
   "aN": "shared-78-D5Fw2h0a.js#Tj"
  }
 },
 {
  "target": "button-press.mjs",
  "source": "shared-frame-CJdE5Ria.js",
  "exports": {
   "Go": "buttonPressScale",
   "Ko": "writeButtonPressScale",
   "Fu": "buttonPressInset"
  },
  "aliases": {
   "Go": null,
   "Ko": null,
   "Fu": null
  },
  "features": {
   "Go": [
    "function Go(e,t,n){return e<=0||t<=0?null:{sx:Math.max(Wo,1-2*n/e),sy:Math.max(Wo,1-2*n/t)}}"
   ],
   "Ko": [
    "function Ko(e,t,n,r){let i=Go(e.offsetWidth,e.offsetHeight,t);i!==null&&(e.style.setProperty(n,String(i.sx)),e.style.setProperty(r,String(i.sy)))}"
   ],
   "Fu": [
    "function Fu(e){return Math.min(Pu,Math.max(Nu,e*Mu))}"
   ]
  },
  "previous": {
   "Go": "shared-frame-6jtSkIit.js#Us",
   "Ko": "shared-frame-6jtSkIit.js#Ws",
   "Fu": "shared-frame-6jtSkIit.js#ku"
  }
 },
 {
  "target": "dom-owner.mjs",
  "source": "shared-frame-CJdE5Ria.js",
  "exports": {
   "ma": "ownerViewOf"
  },
  "aliases": {
   "ma": "Xf"
  },
  "features": {
   "ma": [
    "function ma(e){return e?.ownerDocument.defaultView??globalThis.window}"
   ]
  },
  "reexports": {
   "elementOrNull": {
    "cds": "asElementNode",
    "binding": "shared-frame-CJdE5Ria.js#Pt"
   }
  },
  "previous": {
   "ma": "shared-frame-6jtSkIit.js#aa"
  }
 },
 {
  "target": "display-text.mjs",
  "source": "shared-frame-CJdE5Ria.js",
  "exports": {
   "Hm": "displayText",
   "Km": "displayTitle"
  },
  "aliases": {
   "Hm": "Wu",
   "Km": "Hu"
  },
  "features": {
   "Hm": [
    "function Hm(e){return e.replace(Bm(),Vm)}"
   ],
   "Km": [
    "test(e)))return t}"
   ]
  },
  "previous": {
   "Hm": "shared-frame-6jtSkIit.js#hn",
   "Km": "shared-frame-6jtSkIit.js#yn"
  }
 },
 {
  "target": "environment-select-parts.mjs",
  "source": "shared-frame-CJdE5Ria.js",
  "exports": {
   "tL": "selectTriggerClassName",
   "nL": "selectTriggerVariantClassNames",
   "rL": "selectTriggerModeClassNames",
   "oL": "selectTriggerButtonClassName",
   "qI": "selectEmptyTextClassName",
   "DL": "selectEmptyClassName",
   "OL": "selectFooterDividerClassName",
   "kL": "selectFooterClassName",
   "vL": "selectPopupSearchClassName",
   "RL": "selectSearchText",
   "zL": "selectItemMatches",
   "zR": "SelectFooterAction"
  },
  "aliases": {
   "tL": null,
   "nL": null,
   "rL": null,
   "oL": null,
   "qI": null,
   "DL": null,
   "OL": null,
   "kL": null,
   "vL": null,
   "RL": null,
   "zL": "qi",
   "zR": null
  },
  "features": {
   "tL": [
    "tL=`group/cbx ${fw}`"
   ],
   "nL": [
    "nL={outline:pw,ghost:\"bg-transparent hover:bg-fill-ghost-hover has-[[aria-haspopup][aria-expanded=true]]:bg-fill-ghost-hover aria-expanded:bg-fill-ghost-hover\"}"
   ],
   "rL": [
    "rL={select:`ps-0 ${dw} data-[disabled]:cursor-default`,input:`ps-sm cursor-text ${dw} data-[disabled]:cursor-default`}"
   ],
   "oL": [
    "oL=\"cds-reset flex min-w-0 flex-1 items-center gap-1.5 self-stretch ps-sm text-start border-0 bg-transparent p-0 outline-none focus-visible:outline-hidden\""
   ],
   "qI": [
    "qI=\"px-md py-1.5 text-body text-muted select-none\""
   ],
   "DL": [
    "DL=`empty:hidden ${qI}`"
   ],
   "OL": [
    "OL=\"mx-pad-md mt-1 h-px shrink-0 bg-border\""
   ],
   "kL": [
    "kL=\"shrink-0 pt-1\""
   ],
   "vL": [
    "vL=\"-mx-[var(--cds-menu-gutter,0.25rem)] -mt-[var(--cds-menu-gutter,0.25rem)] mb-1 block w-[calc(100%+2*var(--cds-menu-gutter,0.25rem))] shrink-0 cds-reset bg-transparent border-0 border-b border-b-[var(--cds-border)] outline-none focus-visible:outline-hidden px-[calc(var(--cds-pad-md)+var(--cds-menu-gutter,0.25rem))] py-2 text-body font-normal text-primary placeholder:text-muted\""
   ],
   "RL": [
    "RL=e=>e.normalize(\"NFD\").replace(/\\p{Diacritic}/gu,\"\").toLowerCase()"
   ],
   "zL": [
    "function zL(e,t){let n=RL(t);return RL(e.label).includes(n)||RL(e.value).includes(n)}"
   ],
   "zR": [
    "zR=J((e,t)=>{let $=J9(15),n,r,i,a;J1($,0,e)?({icon:i,children:n,className:r,...a}=e,K4($,0,e,n,r,i,a)):(n=$[1],r=$[2],i=$[3],a=$[4]);let o=J1($,5,r)?K1($,5,r,Q(\"cds-reset flex w-full items-center gap-2 min-h-control px-md rounded\",\"text-body font-normal font-control text-primary select-none outline-none focus-visible:outline-hidden\",\"hover:bg-fill-ghost-hover focus-visible:bg-fill-ghost-hover\",r)):$[6],s=J1($,7,i)?K1($,7,i,i&&v(qs,{icon:v(Bs,{name:i,size:\"auto\",className:\"text-muted\"})})):$[8];return J5($,9,n,t,a,o,s)?K5($,9,n,t,a,o,s,A(\"button\",{ref:t,type:\"button\",...a,className:o,children:[s,n]})):$[14]})"
   ]
  },
  "previous": {
   "tL": "shared-frame-6jtSkIit.js#vM",
   "nL": "shared-frame-6jtSkIit.js#yM",
   "rL": "shared-frame-6jtSkIit.js#bM",
   "oL": "shared-frame-6jtSkIit.js#CM",
   "qI": "shared-frame-6jtSkIit.js#uM",
   "DL": "shared-frame-6jtSkIit.js#WM",
   "OL": "shared-frame-6jtSkIit.js#GM",
   "kL": "shared-frame-6jtSkIit.js#KM",
   "vL": "shared-frame-6jtSkIit.js#FM",
   "RL": "shared-frame-6jtSkIit.js#tN",
   "zL": "shared-frame-6jtSkIit.js#nN",
   "zR": "shared-frame-6jtSkIit.js#QN"
  }
 },
 {
  "target": "surface-chord-platform.mjs",
  "reexports": {
   "isMacUserAgent": {
    "cds": "isMacUserAgent"
   }
  }
 },
 {
  "target": "environment-checkbox.mjs",
  "reexports": {
   "EnvironmentCheckbox": {
    "cds": "CdsCheckbox"
   }
  }
 },
 {
  "target": "lazy-init.mjs",
  "reexports": {
   "lazyInit": {
    "linked": "shared-0-CnnWnVrT.js#Tl"
   }
  }
 },
 {
  "target": "composer-focus-capability.mjs",
  "reexports": {
   "canFocusComposerOnClick": {
    "cds": "state_sharedframe_an",
    "binding": "shared-frame-CJdE5Ria.js#an"
   }
  }
 },
 {
  "target": "environment-field-controls.mjs",
  "reexports": {
   "EnvironmentTextInput": {
    "cds": "CdsTextInput",
    "binding": "shared-frame-CJdE5Ria.js#ww"
   },
   "EnvironmentFieldError": {
    "cds": "CdsFieldError",
    "binding": "shared-frame-CJdE5Ria.js#NI"
   },
   "EnvironmentLabel": {
    "cds": "CdsFieldLabel",
    "binding": "shared-frame-CJdE5Ria.js#kI"
   },
   "EnvironmentField": {
    "cds": "CdsField",
    "binding": "shared-frame-CJdE5Ria.js#OI"
   }
  }
 },
 {
  "target": "tooltip-structure.mjs",
  "reexports": {
   "tooltipContentKey": {
    "cds": "cdsElementTypeKey",
    "binding": "shared-frame-CJdE5Ria.js#Ol"
   }
  }
 }
];

const DROPPED = [
 {
  "module": "sidebar-details-model.mjs",
  "export": "sidebarBranch",
  "previous": "shared-20-mUr7IqZY.js#MD",
  "reason": "4.16336.0 sidebar details no longer derive a separate branch label; the declaration is gone"
 },
 {
  "module": "session-cycle-rows.mjs",
  "export": "cycleExpandsGroupAttribute",
  "previous": "shared-16-ByfgAyLr.js#Vg",
  "reason": "4.16336.0 cycling no longer expands collapsed groups through a data attribute (the attribute string is gone)"
 },
 {
  "module": "session-cycle-rows.mjs",
  "export": "expandCycleGroup",
  "previous": "shared-16-ByfgAyLr.js#Wg",
  "reason": "4.16336.0 cycling no longer expands collapsed groups (declaration gone with the attribute)"
 },
 {
  "module": "session-cycle-step.mjs",
  "export": "sessionCycleStep",
  "previous": "shared-16-ByfgAyLr.js#Pg",
  "reason": "3.6556.2 selected local m of Pg; 4.16336.0 inlines that arrow into the keydown handler Zp, no expression of the same shape is left to select"
 },
 {
  "module": "titlebar-lead-classes.mjs",
  "export": "titleLeadGapClass",
  "previous": "shared-6-sd9jbJqs.js#Kh",
  "reason": "4.16336.0 titlebar lead has no separate gap class (class string gone)"
 },
 {
  "module": "titlebar-panels-scope.mjs",
  "export": "TitlebarPanelsScope",
  "previous": "shared-15-BvlV43cI.js#_n",
  "reason": "4.16336.0 replaced the panels-scope context by a GrowthBook gate read in useTitlebarPanelsScope"
 },
 {
  "module": "pane-layout-icons.mjs",
  "export": "paneLayoutSplitOtherPane",
  "previous": "c4db265df-fNhlkQCj.js#at",
  "reason": "4.16336.0 names CDS icons per split layout (new export paneLayoutSplitIcons) instead of a separate other-pane icon"
 },
 {
  "module": "environment-picker-keys.mjs",
  "export": "thisComputerLabel",
  "previous": "shared-46-BIbZBGFq.js#zL",
  "reason": "4.16336.0 inlines the \"this computer\" label into the picker row"
 },
 {
  "module": "breadcrumb-paths.mjs",
  "export": "folderLabel",
  "previous": "cd2efac6e-Be7wcc4w.js#Kl",
  "reason": "4.16336.0 breadcrumbs inline the folder label"
 }
];

// Declarations answered by a host adapter (file#local -> host export; features on the original declaration). Every entry is
// the host answer another 4.16336.0 area already gives the same original binding (logs/v4-adapter-index.json), or the
// 3.6556.2 sessions stand-in for the GrowthBook bulk menu (cbd6c85c8 Wf, old jd).
const LOCAL_ADAPTERS = {
 "shared-7-D2e77H6v.js#zg": {
  "name": "useHomeEffectiveErrorCategory",
  "module": "../../source-home-v4-adapters.jsx",
  "features": [
   "function zg(e){let $=J9(5),t=e===\"auth_error\",n=Lg(J1($,0,t)?K1($,0,t,{enabled:t,recheck:!1}):$[1]),r=Rg(),i=e===\"auth_error\"&&n?\"subscription_past_due\":e;return J2($,2,r,i)?K2($,2,r,i,{effectiveCategory:i,billingNotSelfManageable"
  ]
 },
 "shared-140-DfG6VwpK.js#pd": {
  "name": "EmojiShortcodeField",
  "module": "../../source-routines-shared-adapters.jsx",
  "features": [
   "function pd(e){let $=J9(4),{inputRef:t,onValueChange:n}=e,r=dd(),i=fd.Component;return J3($,0,r,t,n)?K3($,0,r,t,n,r?a(i,{inputRef:t,onValueChange:n}):null):$[3]}"
  ]
 },
 "shared-123-1Hc1RTKl.js#W$": {
  "name": "defineLazyEntry",
  "module": "../../source-home-v4-adapters.jsx",
  "features": [
   "function W$(e){let t=Wo(e.entry),{pick:n}=e,r=e=>n===void 0?e:n(e),i=e.options.suspense===!0?void 0:e.options.loading,a=i===void 0?\"caller\":z$(i)?\"none\":\"placeholder\",o=uC(a,z$(i)?i.reason:void 0,e.overlayHost),s=e.settles"
  ]
 },
 "shared-123-1Hc1RTKl.js#EV": {
  "name": "useFrameMode",
  "module": "../../frame-sidebar-adapter.mjs",
  "features": [
   "function EV(){return OV(\"live\")}"
  ]
 },
 "shared-123-1Hc1RTKl.js#v$": {
  "name": "useDialogPreloadProps",
  "module": "../../source-r3b-transcript-adapters.jsx",
  "features": [
   "function v$(e){let $=J9(2),t;if(J1($,0,e)){let n=()=>{e?.preload(\"intent\")};t={onPointerEnter:n,onFocus:n,onPointerDown:n},K1($,0,e,t)}else t=$[1];return t}"
  ]
 },
 "shared-0-CnnWnVrT.js#qB": {
  "name": "reportRenderError",
  "module": "../../source-r3b-transcript-adapters.jsx",
  "features": [
   "qB=P(JB,N.O11Y_INTERNALS)"
  ]
 },
 "shared-0-CnnWnVrT.js#FH": {
  "name": "useIsDesktopApp",
  "module": "../../frame-sidebar-adapter.mjs",
  "features": [
   "function FH(e){let $=J9(12),{version:t,platform:n}=J1($,0,e)?K1($,0,e,e===void 0?{}:e):$[1],r=NH();if(typeof window>\"u\")return J3($,2,n,r,t)?K3($,2,n,r,t,!!r&&wI(r,{version:t,platform:n})):$[5];let i=`${t??\"\"}\\0${n??\"\"}`"
  ]
 },
 "shared-0-CnnWnVrT.js#D0": {
  "name": "useManagedConfig",
  "module": "../../settings-nav-adapter.mjs",
  "features": [
   "D0=()=>{let $=J9(2),e=A(S0,A0);return J1($,0,e)?K1($,0,e,{data:e}):$[1]}"
  ]
 },
 "shared-0-CnnWnVrT.js#y4": {
  "name": "useConfiguration",
  "module": "../../settings-nav-adapter.mjs",
  "features": [
   "y4=()=>{let e=v(h4);if(!e)throw c(Error(\"useConfiguration must be called from within ConfigurationProvider\"),\"useConfiguration must be called from within ConfigurationProvider\",\"literal\");return e}"
  ]
 },
 "shared-0-CnnWnVrT.js#Ku": {
  "name": "growthBookValue",
  "module": "../../frame-sidebar-adapter.mjs",
  "features": [
   "function Ku(e,t){let n=ju();return n?n.evalFeature(yu(e)).value??t:t}"
  ]
 },
 "shared-0-CnnWnVrT.js#uO": {
  "name": "WindowState",
  "module": "../../frame-sidebar-adapter.mjs",
  "features": [
   "uO=globalThis[\"claude.web\"]?.WindowState"
  ]
 },
 "shared-92-BOgyxePb.js#zu": {
  "name": "setGreetingTelemetry",
  "module": "../../source-home-v4-adapters.jsx",
  "features": [
   "function zu(e,t){Iu?.has(e)?Lu.set(e,t):tt.setGlobalContextProperty(e,t)}"
  ]
 },
 "shared-92-BOgyxePb.js#Y": {
  "name": "frameStore",
  "module": "../../frame-sidebar-adapter.mjs",
  "features": [
   "Y=vo()(go((e,t)=>({collapsed:!1,sidebarWidth:xx,lastKnownMode:\"chat\",pinnedOrder:[],homeProjectsPinnedOrder:[],groupByByMode:{},sortByByMode:{},recentsTypeFilter:\"all\",recentsStatusFilter:\"active\",coworkActivityDays:0,recentsOwnerPick"
  ]
 },
 "shared-25-D-aF0gt9.js#ko": {
  "name": "useFeatureIsOn",
  "module": "../../source-routines-shared-adapters.jsx",
  "features": [
   "function ko(e){let $=J9(2);return go(J1($,0,e)?K1($,0,e,H(e)):$[1]).on}"
  ]
 },
 "shared-25-D-aF0gt9.js#go": {
  "name": "useGrowthBookFeature",
  "module": "../../frame-sidebar-adapter.mjs",
  "features": [
   "function go(e){return ho(ro(),e)}"
  ]
 },
 "shared-25-D-aF0gt9.js#Mo": {
  "name": "useGrowthBookFlagWhen",
  "module": "../../source-home-v4-adapters.jsx",
  "features": [
   "function Mo(e,t){let $=J9(3),n=ro();return!t||!n?.growthbook?!1:(J2($,0,n,e)?K2($,0,n,e,io(n,H(e))):$[2]).on}"
  ]
 },
 "shared-25-D-aF0gt9.js#Jo": {
  "name": "useGrowthBookFeatureOn",
  "module": "../../settings-nav-adapter.mjs",
  "features": [
   "function Jo(e){let $=J9(3),t=_(Jr);return(J2($,0,e,t)?K2($,0,e,t,es(t,e)):$[2]).on}"
  ]
 },
 "shared-25-D-aF0gt9.js#ro": {
  "name": "useGrowthBookClient",
  "module": "../../source-routines-shared-adapters.jsx",
  "features": [
   "function ro(){let e=_(to),t=_(e===void 0?Jr:no);return e===void 0?t:e}"
  ]
 },
 "shared-25-D-aF0gt9.js#Z": {
  "name": "useCurrentAccount",
  "module": "../../source-routines-shared-adapters.jsx",
  "features": [
   "Z=()=>{let e=_(Dz);if(!e)throw o(Error(\"Must call inside CurrentAccountProvider\"),\"Must call inside CurrentAccountProvider\",\"literal\");return e}"
  ]
 },
 "shared-25-D-aF0gt9.js#VB": {
  "name": "useOptionalCurrentAccount",
  "module": "../../settings-nav-adapter.mjs",
  "features": [
   "VB=()=>_(Dz)"
  ]
 },
 "shared-62-DoCqVpIq.js#OT": {
  "name": "useAnalytics",
  "module": "../../source-routines-shared-adapters.jsx",
  "features": [
   "function OT(){return ZS}"
  ]
 },
 "shared-62-DoCqVpIq.js#rP": {
  "name": "useErrors",
  "module": "../../source-routines-shared-adapters.jsx",
  "features": [
   "function rP(){let e=k(qN);if(!e)throw m(Error(\"Must be called within ErrorsProvider\"),\"Must be called within ErrorsProvider\",\"literal\");return e}"
  ]
 },
 "shared-2-CsjIBQD8.js#WH": {
  "name": "markHomeSessionUnread",
  "module": "../../source-home-v4-adapters.jsx",
  "features": [
   "function WH(e){let{readState:t}=wH.getState();if(!t)return;let n={...t,sessions:{...t.sessions,[e]:0},explicitUnread:{...t.explicitUnread,[e]:!0}};wH.setState({readState:n}),AH(n)}"
  ]
 },
 "vendor-query-Bl2Kfzgk.js#J": {
  "name": "useQueryClient",
  "module": "../../source-routines-shared-adapters.jsx",
  "features": [
   "J=e=>{let t=s(q);if(e)return e;if(!t)throw Error(\"No QueryClient set, use QueryClientProvider to set one\");return t}"
  ]
 },
 "cbd6c85c8-CxDdK_2w.js#Wf": {
  "name": "SessionsBulkMenuUnavailable",
  "module": "../../source-sessions-adapters.jsx",
  "features": [
   "function Wf(e){let $=J9(3),t=wf(e);return J2($,0,e,t)?K2($,0,e,t,a(Gf,{...e,rowActions:t})):$[2]}"
  ]
 },
 "c3f9f1667-Bbz13IQQ.js#F": {
  "name": "localEnvironmentRevision",
  "module": "../../source-environment-menu-adapters.jsx",
  "features": [
   "F=x(e=>({revision:0,bump:()=>e(e=>({revision:e.revision+1}))}))"
  ]
 },
 "c03935b01-BylKMWqe.js#Ri": {
  "name": "btwComposerRegistry",
  "module": "../../btw-composer-registry.mjs",
  "features": [
   "Ri=new Map"
  ]
 }
};

// Roots kept out of this staged graph until a host adapter exists (report.json blocked; patches/ holds the host change).
const BLOCKED = [
 {
  "module": "titlebar-fold-measure.mjs",
  "export": "useTitlebarFold",
  "previous": "cd54a5401-wFztHb-d.js#nn",
  "reason": "cd54a5401 dn reports its first fold through shared-0 H (the O11Y internals logger, P(Zw, N.O11Y_INTERNALS), whose closure is the datadog client with dynamic imports); no host module answers it",
  "hostAdaptersNeeded": {
   "shared-0-CnnWnVrT.js#H": "reportO11yEvent"
  }
 },
 {
  "module": "mention-output-files.mjs",
  "export": "mergeOutputFileOptions",
  "previous": "c227f4d5e-B-FYKrwT.js#WO",
  "reason": "c227f4d5e ZW loads the resident FileIndex through shared-92 sK (a dynamic import of the wasm index chunk) and reports failures through c68c4283d t (product telemetry); no host module answers either (3.6556.2 stood them in by hand, which the 4.16336.0 rules forbid)",
  "hostAdaptersNeeded": {
   "shared-92-BOgyxePb.js#sK": "loadResidentFileIndex",
   "c68c4283d-FxwfdZSA.js#t": "reportComposerFailure"
  }
 }
];

// d1/wave5-candidates.json (cds-core fifth wave): module state held here only until cds-core publishes it.
const D1_WAVE5 = [{"binding":"shared-1-D1bGaTaN.js#vI","kind":"collection","action":"wave5-new-root","suggestedName":"modifierKeys"},{"binding":"shared-frame-CJdE5Ria.js#zm","kind":"reassigned","action":"wave5-new-root","suggestedName":"provisionalSharedFramezmState"},{"binding":"shared-frame-CJdE5Ria.js#Bm","kind":"state-writer","action":"wave5-new-root","suggestedName":"sanitizeLabelTextWriter"},{"binding":"shared-0-CnnWnVrT.js#hu","kind":"collection","action":"wave5-new-root","suggestedName":"provisionalShared0huSet"},{"binding":"shared-0-CnnWnVrT.js#ku","kind":"reassigned","action":"wave5-new-root","suggestedName":"provisionalShared0kuState"},{"binding":"shared-62-DoCqVpIq.js#OF","kind":"collection","action":"wave5-new-root","suggestedName":"provisionalShared62OFRegistry"},{"binding":"shared-0-CnnWnVrT.js#Oc","kind":"mutable-array","action":"wave5-new-root","suggestedName":"provisionalShared0OcStack"},{"binding":"shared-0-CnnWnVrT.js#Ac","kind":"state-writer","action":"wave5-new-root","suggestedName":"loggerWriter_Ac"},{"binding":"shared-0-CnnWnVrT.js#jc","kind":"state-writer","action":"wave5-new-root","suggestedName":"loggerWriter_jc"},{"binding":"shared-0-CnnWnVrT.js#Pc","kind":"collection","action":"wave5-new-root","suggestedName":"loggerSet"},{"binding":"shared-0-CnnWnVrT.js#SI","kind":"collection","action":"wave5-new-root","suggestedName":"provisionalShared0SIRegistry"},{"binding":"shared-123-1Hc1RTKl.js#Yu","kind":"context","action":"wave5-new-root","suggestedName":"CdsProvisionalShared123YuContext"},{"binding":"shared-123-1Hc1RTKl.js#Zu","kind":"reassigned","action":"wave5-new-root","suggestedName":"provisionalShared123ZuState"},{"binding":"shared-0-CnnWnVrT.js#N6","kind":"collection","action":"wave5-new-root","suggestedName":"provisionalShared0N6Set"},{"binding":"shared-62-DoCqVpIq.js#pN","kind":"collection","action":"wave5-new-root","suggestedName":"provisionalShared62pNSet"},{"binding":"shared-62-DoCqVpIq.js#mN","kind":"collection","action":"wave5-new-root","suggestedName":"provisionalShared62mNRegistry"},{"binding":"shared-62-DoCqVpIq.js#oL","kind":"collection","action":"wave5-new-root","suggestedName":"sanitizeTextSet"},{"binding":"shared-183-B2N6Zy4J.js#$q","kind":"closure-store","action":"wave5-new-root","suggestedName":"provisionalShared183SqStore"},{"binding":"shared-60-DmOyT7JJ.js#Bt","kind":"collection","action":"wave5-new-root","suggestedName":"provisionalShared60BtSet"},{"binding":"shared-60-DmOyT7JJ.js#_n","kind":"collection","action":"wave5-new-root","suggestedName":"describeStartFailureRegistry__n"},{"binding":"shared-60-DmOyT7JJ.js#vn","kind":"collection","action":"wave5-new-root","suggestedName":"describeStartFailureRegistry_vn"},{"binding":"shared-60-DmOyT7JJ.js#yn","kind":"collection","action":"wave5-new-root","suggestedName":"describeStartFailureRegistry_yn"},{"binding":"shared-62-DoCqVpIq.js#af","kind":"reassigned","action":"wave5-new-root","suggestedName":"markPageUnloadingState"},{"binding":"shared-0-CnnWnVrT.js#xV","kind":"collection","action":"wave5-new-root","suggestedName":"provisionalShared0xVSet"},{"binding":"shared-62-DoCqVpIq.js#kI","kind":"collection","action":"wave5-new-root","suggestedName":"provisionalShared62kISet"}];

const ADAPTER_MODULES = [...new Set([...Object.values(LOCAL_ADAPTERS), ...MODULES.flatMap(m => Object.values(m.adapters ?? {}).flatMap(Object.values))].map(a => a.module.replace('../../', 'src/')))].sort();
export const contract = { ...HAND, localAdapters: LOCAL_ADAPTERS, adapterModules: ADAPTER_MODULES, modules: MODULES, dropped: DROPPED, blocked: BLOCKED, d1Wave5: D1_WAVE5 };
