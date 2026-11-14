import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { appearancePreferences, fastTierForModel, settingsPatch, validateServiceTier, DEFAULT_THEME, themePreference, savedPermission } from '../electron/preferences.mjs';
const models=[{model:'a',isDefault:true,serviceTiers:[{id:'priority',name:'Fast',description:'More usage'}]},{model:'b',additionalSpeedTiers:['fast'],serviceTiers:[]}];
test('Fast is discovered from the current catalog name and ID, not legacy flags',()=>{
  assert.equal(fastTierForModel(models[0]).id,'priority');assert.equal(fastTierForModel(models[1]),null);
  assert.equal(fastTierForModel({serviceTiers:[{id:'future-fast',name:'FAST'}]}).id,'future-fast');
});
test('settings atomically reject invalid values and unsupported Fast mode',()=>{
  const previous={model:'a',fastMode:false,theme:'light'};
  assert.throws(()=>settingsPatch(previous,{theme:'dark',fastMode:'yes'},models));assert.equal(previous.theme,'light');
  assert.throws(()=>settingsPatch(previous,{model:'b',fastMode:true},models),/not available/);
  assert.equal(settingsPatch({model:'a',fastMode:true},{model:'b'},models).fastMode,false);
  assert.equal(settingsPatch(previous,{fastMode:true},models).fastMode,true);
});
test('explicit standard speed clears inherited Fast and arbitrary tiers are rejected',()=>{
  assert.equal(validateServiceTier(models,'a','priority'),'priority');
  assert.equal(validateServiceTier(models,'a','default'),'default');
  assert.throws(()=>validateServiceTier(models,'b','priority'));
  assert.throws(()=>validateServiceTier(models,'unknown','priority'));
});
test('appearance config normalizes legacy and invalid data, validates font names',()=>{
  assert.deepEqual(appearancePreferences({motion:'oops',transcriptSize:'l'}),{motion:'system',interfaceFont:'anthropic',codeFont:'',transcriptSize:'l',transcriptWidth:'s',codeThemeLight:'claude-light',codeThemeDark:'claude-dark',transcriptView:'normal'});
  assert.equal(appearancePreferences({interfaceFont:'dyslexic'}).interfaceFont,'dyslexic');
  assert.equal(settingsPatch({}, {interfaceFont:'dyslexic'}).interfaceFont,'dyslexic');
  assert.throws(()=>settingsPatch({}, {interfaceFont:'comic'}));
  assert.equal(settingsPatch({}, {codeFont:'JetBrains Mono'}).codeFont,'JetBrains Mono');
  assert.throws(()=>settingsPatch({}, {codeFont:'x; color:red'}));
  assert.throws(()=>settingsPatch({}, {codeFont:'x\nfont'}));
  assert.throws(()=>settingsPatch({}, {transcriptWidth:'xxl'}));
});
test('code themes validate against the catalog and their column mode; transcript view has three values',()=>{
  assert.equal(settingsPatch({}, {codeThemeDark:'github-dark'}).codeThemeDark,'github-dark');
  assert.equal(settingsPatch({}, {codeThemeLight:'github-light'}).codeThemeLight,'github-light');
  assert.throws(()=>settingsPatch({}, {codeThemeDark:'github-light'}),/codeThemeDark/);
  assert.throws(()=>settingsPatch({}, {codeThemeLight:'nope'}),/codeThemeLight/);
  assert.throws(()=>settingsPatch({}, {codeThemeLight:'pierre-light'}),/codeThemeLight/);
  const normalized=appearancePreferences({codeThemeLight:'github-dark',codeThemeDark:'dracula'});
  assert.equal(normalized.codeThemeLight,'claude-light');assert.equal(normalized.codeThemeDark,'dracula');
  assert.equal(settingsPatch({}, {transcriptView:'verbose'}).transcriptView,'verbose');
  assert.throws(()=>settingsPatch({}, {transcriptView:'all'}));
  assert.equal(appearancePreferences({transcriptView:'thinking'}).transcriptView,'thinking');
  assert.equal(appearancePreferences({transcriptView:'x'}).transcriptView,'normal');
});
test('the theme defaults to system (shared-7 xh bi("userThemeMode","auto")) and only light/dark/system are kept',()=>{
  assert.equal(DEFAULT_THEME,'system');
  for(const value of ['light','dark','system'])assert.equal(themePreference(value),value);
  for(const value of [undefined,null,'auto','sepia',1])assert.equal(themePreference(value),'system');
  assert.equal(settingsPatch({theme:'light'},{theme:'system'}).theme,'system');
  assert.throws(()=>settingsPatch({},{theme:'auto'}),/theme/);
  // main.cjs seeds new profiles with DEFAULT_THEME, not a hard-coded light.
  const main=readFileSync(new URL('../electron/main.cjs',import.meta.url),'utf8');
  assert.match(main,/theme: DEFAULT_THEME,/);assert.doesNotMatch(main,/theme: "light"/);
});
// coreModels belongs to the main process (prefs/core-model.mjs): a renderer value is ignored, the saved one survives patches.
test('settingsPatch ignores a sent coreModels and keeps the saved one through a model patch',()=>{
  const saved={model:'a',effort:'low',coreModels:{codex:{model:'a',effort:'low'}}};
  const next=settingsPatch(saved,{model:'b',coreModels:{codex:{model:'evil',effort:'x'}}},models);
  assert.equal(next.model,'b');
  assert.deepEqual(next.coreModels,{codex:{model:'a',effort:'low'}});
  assert.equal('coreModels' in settingsPatch({model:'a'},{coreModels:{codex:{model:'b',effort:'low'}}},models),false);
});

test('Bypass can be the remembered mode only while its opt-in is on, and opting out drops it to Auto',()=>{
  assert.throws(()=>settingsPatch({permission:'auto'},{permission:'bypass'}),/Allow bypass permissions mode/);
  const on=settingsPatch({allowBypassPermissions:true,permission:'auto'},{permission:'bypass'});
  assert.equal(on.permission,'bypass');
  assert.equal(settingsPatch(on,{allowBypassPermissions:false}).permission,'auto');
  assert.equal(settingsPatch({},{allowBypassPermissions:true,permission:'bypass'}).permission,'bypass','opt-in and mode in one patch');
  assert.equal(savedPermission({permission:'bypass',allowBypassPermissions:true}),'bypass');
  assert.equal(savedPermission({permission:'bypass'}),'auto','a stale Bypass without the opt-in reads as Auto');
  assert.equal(savedPermission({permission:'nope'}),'auto');
  assert.equal(savedPermission({permission:'plan'}),'plan');
});

test('speeds: every faster tier a model lists, chosen by name, with fastMode kept as the on/off alias', async () => {
  const { speedTiersForModel, tierForSpeed, savedSpeed } = await import('../electron/preferences.mjs');
  const catalog = [
    { model: 'sol', isDefault: true, serviceTiers: [{ id: 'priority', name: 'Fast', description: '2x' }, { id: 'ultrafast', name: 'Ultrafast', description: '4x' }, { id: 'x', name: '' }, { id: 'priority', name: 'fast' }] },
    { model: 'terra', serviceTiers: [{ id: 'priority', name: 'Fast' }] },
    { model: 'flash', serviceTiers: [] },
  ];
  assert.deepEqual(speedTiersForModel(catalog[0]).map(tier => [tier.key, tier.id, tier.name]), [['fast', 'priority', 'Fast'], ['ultrafast', 'ultrafast', 'Ultrafast']], 'unnamed and repeated tiers are dropped');
  assert.equal(tierForSpeed(catalog[0], 'ultrafast').id, 'ultrafast');
  assert.equal(tierForSpeed(catalog[1], 'ultrafast'), null);
  // A Fast mode saved before speeds existed reads as Fast.
  assert.deepEqual([savedSpeed({}), savedSpeed({ fastMode: true }), savedSpeed({ fastMode: true, speed: 'ultrafast' })], ['standard', 'fast', 'ultrafast']);
  let config = settingsPatch({ model: 'sol' }, { speed: 'ultrafast' }, catalog);
  assert.deepEqual([config.speed, config.fastMode], ['ultrafast', true]);
  // fastMode on keeps a faster speed already chosen; off is Standard; on again from Standard is Fast.
  assert.equal(settingsPatch(config, { fastMode: true }, catalog).speed, 'ultrafast');
  config = settingsPatch(config, { fastMode: false }, catalog);
  assert.deepEqual([config.speed, config.fastMode], ['standard', false]);
  assert.equal(settingsPatch(config, { fastMode: true }, catalog).speed, 'fast');
  // A model without the chosen tier drops to Standard; one with it keeps it.
  config = settingsPatch({ model: 'sol', speed: 'ultrafast', fastMode: true }, { model: 'terra' }, catalog);
  assert.deepEqual([config.speed, config.fastMode], ['standard', false]);
  assert.equal(settingsPatch({ model: 'sol', speed: 'fast', fastMode: true }, { model: 'terra' }, catalog).speed, 'fast');
  assert.throws(() => settingsPatch({ model: 'terra' }, { speed: 'ultrafast' }, catalog), /This speed is not available/);
  assert.throws(() => settingsPatch({ model: 'flash' }, { fastMode: true }, catalog), /Fast mode is not available/);
  assert.throws(() => settingsPatch({ model: 'sol' }, { speed: 'Bad Speed!' }, catalog), /Invalid speed/);
  // The turn sends the chosen tier's id, which validateServiceTier accepts for that model only.
  assert.equal(validateServiceTier(catalog, 'sol', 'ultrafast'), 'ultrafast');
  assert.throws(() => validateServiceTier(catalog, 'terra', 'ultrafast'), /not available/);
});
test('a model without reasoning levels clears the saved effort instead of failing',()=>{
  const next=settingsPatch({model:'deepseek-v4-pro',effort:'high'},{model:'glm-5.3',effort:null});
  assert.equal(next.model,'glm-5.3');
  assert.equal('effort' in next,false);
  assert.throws(()=>settingsPatch({}, {effort:5}),/Invalid effort setting/);
});
// c71860c77-DzP8HoeV cr: Settings › Code › Sessions › Prompt suggestions saves config.promptSuggestions (unset reads as on).
test('promptSuggestions is a saved boolean; anything else is refused',()=>{
  assert.equal(settingsPatch({},{promptSuggestions:false}).promptSuggestions,false);
  assert.equal(settingsPatch({promptSuggestions:false},{promptSuggestions:true}).promptSuggestions,true);
  assert.equal('promptSuggestions' in settingsPatch({},{theme:'dark'}),false,'untouched when not sent');
  assert.throws(()=>settingsPatch({},{promptSuggestions:'off'}),/Invalid promptSuggestions setting/);
});
