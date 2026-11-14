import React,{useEffect,useId,useLayoutEffect,useRef,useState} from 'react';
import {settingsPatch} from '../electron/preferences.mjs';
import {createManualTextSave} from './manual-text-save.mjs';
import {SourceSettingsButton} from './source-settings-button.jsx';
import {t} from '../electron/i18n/index.mjs';
import './source-profile-setting.css';

// Local display name uses Av's below slot and Bh/Lv primitives. The official
// remote profile has no active name editor in this build.
export function SourceProfileSetting({value,onSave}) {
  const [draft,setDraft]=useState(value),[status,setStatus]=useState({saving:false,error:''});
  const latest=useRef({value,onSave}),edited=useRef(false),owner=useRef(null),input=useRef(null),composing=useRef(false);
  const errorId=useId();latest.current={value,onSave};
  useLayoutEffect(()=>{
    const controller=createManualTextSave({save:text=>latest.current.onSave(text),validate:text=>{settingsPatch({}, {displayName:text});},onState:setStatus});
    owner.current=controller;return()=>{controller.dispose();owner.current=null;};
  },[]);
  useEffect(()=>{setDraft(current=>{if(!edited.current)return value;if(current===value)edited.current=false;return current;});},[value]);
  const dirty=draft!==value;
  return <form className="ss-profile-setting" onSubmit={event=>{event.preventDefault();event.stopPropagation();if(!composing.current&&dirty)void owner.current?.submit(draft);}}>
    <input ref={input} data-cds="TextInput" className="cds-input cds-reset" aria-label={t('Display name')} value={draft} maxLength={120}
      aria-invalid={status.error?true:undefined} data-invalid={status.error?'':undefined} aria-describedby={status.error?errorId:undefined}
      onChange={event=>{edited.current=status.saving||event.currentTarget.value!==latest.current.value;setDraft(event.currentTarget.value);owner.current?.edit();}}
      onCompositionStart={()=>{composing.current=true;}} onCompositionEnd={()=>{composing.current=false;}}
      onKeyDown={event=>{if((composing.current||event.nativeEvent.isComposing||event.nativeEvent.keyCode===229)&&(event.key==='Enter'||event.key==='Escape')){event.preventDefault();event.stopPropagation();}}}/>
    {status.error&&<span id={errorId} className="ss-error" role="alert">{status.error}</span>}
    {dirty&&<div className="ss-profile-actions" data-size="sm">
      <SourceSettingsButton type="submit" variant="primary" size="sm" busy={status.saving}>{t('Save changes')}</SourceSettingsButton>
      <SourceSettingsButton variant="ghost" size="sm" disabled={status.saving} onClick={()=>{owner.current?.edit();edited.current=false;setDraft(latest.current.value);input.current?.focus();}}>{t('Discard')}</SourceSettingsButton>
    </div>}
  </form>;
}
