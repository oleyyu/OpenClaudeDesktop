// Local visual fixture, never the production app or an official account session.
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { createServer } from 'vite';
import { prepareDesignV4, defaultDesignStage } from './prepare-design-v4.mjs';
const app = path.resolve(import.meta.dirname, '..');
const project = path.dirname(app);
const directory = path.join(project, 'analysis/claude-4.16336.0-migrate-20261104/visual-fixture');
const core = path.join(directory, '../cds-pilot/staging/src/generated/cds-core/shared-frame.mjs');
await fs.access(core);
const design = await prepareDesignV4();
await fs.mkdir(directory, { recursive: true });
const attributes = Object.entries(design.rootAttributes).map(([name, value]) => `${name}="${value}"`).join(' ');
const sheets = design.entryStylesheets.map(name => `<link rel="stylesheet" href="/assets/v1/${name}">`).join('\n');
await fs.writeFile(path.join(directory, 'index.html'), `<!doctype html><html lang="en" class="cds-root" ${attributes}><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Claude 4.16336.0 · isolated controls</title>${sheets}<style>body{margin:0;padding:40px;background:var(--cds-surface-1);color:var(--cds-text-primary)}main{max-width:960px;margin:auto}h1{font-size:24px;margin:8px 0}header{margin-bottom:36px}section{margin:24px 0;padding:24px;border:1px solid var(--cds-border-2,#ddd);border-radius:12px}h2{font-size:15px;margin:0 0 20px}.row{display:flex;align-items:center;flex-wrap:wrap;gap:16px}.sample{display:flex;flex-direction:column;align-items:center;gap:12px;min-width:72px}.caption{font-size:12px;opacity:.6}#status{margin-top:20px;font-size:14px}nav{display:flex;gap:12px;margin-top:20px}</style></head><body><div id="root"></div><script type="module" src="/fixture.mjs"></script></body></html>`);
await fs.writeFile(path.join(directory, 'fixture.mjs'), `import React from 'react';
import {createRoot} from 'react-dom/client';
import {CdsButton,CdsIcon,CdsSpinner,CdsBadge} from '../cds-pilot/staging/src/generated/cds-core/shared-frame.mjs';
const h=React.createElement;
function Fixture(){
 const [count,setCount]=React.useState(0);
 const [draft,setDraft]=React.useState(true);
 const button=(children,props={})=>h(CdsButton,{...props},children);
 return h('main',null,
  h('header',null,h('p',{className:'caption'},'ISOLATED SOURCE FIXTURE · 4.16336.0'),h('h1',null,'Official UI controls'),h('p',null,'Generated controls with the target CSS and font assets. This is a component fixture, not the migrated app.'),
   h('nav',null,button('Light',{onClick:()=>document.documentElement.setAttribute('data-mode','light')}),button('Dark',{onClick:()=>document.documentElement.setAttribute('data-mode','dark')}))),
  h('section',null,h('h2',null,'Buttons'),h('div',{className:'row'},
   button('Save',{variant:'primary',onClick:()=>setCount(n=>n+1),'data-testid':'save'}),
   button('Secondary',{variant:'secondary'}),button('Disabled',{disabled:true,'data-testid':'disabled'}),
   button('Working',{busy:true,busyLabel:'Working'}),button('Add',{icon:'Add'})),
   h('p',{id:'status',role:'status'},'Save clicks: '+count)),
  h('section',null,h('h2',null,'Spinner / Badge'),h('div',{className:'row', 'data-testid':'status-controls'},
   ...['sm','md','lg'].map(size=>h(CdsSpinner,{key:size,size,label:'Loading '+size,'data-testid':'spinner-'+size})),
   h(CdsBadge,{variant:'success',bold:true},'Ready'),h(CdsBadge,{variant:'danger'},'Failed'),
   draft?h(CdsBadge,{onRemove:()=>setDraft(false),removeLabel:'Remove draft','data-testid':'draft-badge'},'Draft'):h('span',{'data-testid':'draft-removed',role:'status'},'Draft removed'))),
  h('section',null,h('h2',null,'Icon optical sizes'),h('div',{className:'row'},...[12,16,18,20,24,28,32].map(size=>h('div',{className:'sample',key:size},h(CdsIcon,{name:'Add',customSize:size,alt:'Add '+size}),h('span',{className:'caption'},size+' px'))))),
  h('section',null,h('h2',null,'New glyphs and secondary layers'),h('div',{className:'row'},...['Reply','CaretDownSmall','AlignCenter','LetterSpacing','TableCellSplit'].map(name=>h('div',{className:'sample',key:name},h(CdsIcon,{name,customSize:24,alt:name}),h('span',{className:'caption'},name))))));
}
createRoot(document.getElementById('root')).render(h(Fixture));
`);
const require = createRequire(import.meta.url);
const ids = ['react', 'react/jsx-runtime', 'react/jsx-dev-runtime', 'react/compiler-runtime', 'react-dom', 'react-dom/client'];
const escape = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const server = await createServer({ configFile: false, root: directory, publicDir: defaultDesignStage,
  resolve: { alias: ids.map(id => ({ find: new RegExp(`^${escape(id)}$`), replacement: require.resolve(id) })), dedupe: ['react', 'react-dom'] },
  optimizeDeps: { include: ids }, server: { host: '127.0.0.1', port: 4336, strictPort: true, fs: { allow: [project] } } });
await server.listen();
server.printUrls();
