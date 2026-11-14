// One explicit save at a time. Edits invalidate error ownership, not the
// outstanding request: a pending save must remain busy until it settles.
export function createManualTextSave({save,validate=()=>{},onState}) {
  let active=true,revision=0,pending=null;
  const publish=(saving,error='')=>{if(active)onState({saving,error});};
  return {
    edit(){revision++;publish(!!pending);},
    submit(value){
      if(!active)return Promise.resolve();
      if(pending)return pending;
      const mine=revision;
      try{validate(value);}catch(error){publish(false,error.message||'Couldn’t save changes. Try again.');return Promise.resolve();}
      // Defer execution so reentrant submit and synchronous throws use the
      // same lock and settlement path as IPC promises.
      pending=Promise.resolve().then(()=>save(value)).then(
        ()=>{pending=null;publish(false);},
        error=>{pending=null;publish(false,mine===revision?(error?.message||'Couldn’t save changes. Try again.'):'');},
      );
      publish(true);return pending;
    },
    dispose(){active=false;revision++;},
  };
}
