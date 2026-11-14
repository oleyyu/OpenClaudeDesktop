// Opt-in account protocol fixture. Never reads credentials or starts OAuth.
const fs=require('node:fs'),path=require('node:path');
exports.createAccountFixture=function({profile,send,notify}){
 let marker;try{marker=fs.readFileSync(path.join(profile,'account-fixture.marker'),'utf8');}catch{return null;}
 if(marker!=='isolated-account-test\n')throw Error('Invalid account fixture marker');
 const file=name=>path.join(profile,name),atomic=(name,data)=>{const target=file(name),temp=target+'.'+process.pid+'.tmp';fs.writeFileSync(temp,JSON.stringify(data));fs.renameSync(temp,target);};
 const read=name=>{try{return JSON.parse(fs.readFileSync(file(name),'utf8'));}catch(error){if(error.code==='ENOENT')return null;throw error;}};
 const log=(name,data)=>fs.appendFileSync(file(name),JSON.stringify({...data,pid:process.pid,at:Date.now()})+'\n');
 const seen=new Set();
 setInterval(()=>{
  for(const event of read('fixture-account-events.json')||[]){
   if(seen.has(event.id))continue;seen.add(event.id);
   if(!['account/login/completed','account/updated'].includes(event.method))throw Error('Unsupported account fixture notification');
   notify(event.method,event.params);log('fixture-account-sent.jsonl',event);
  }
 },20);
 return message=>{
  if(!['account/read','account/login/start','account/login/cancel','account/logout'].includes(message.method))return false;
  const response=read('fixture-account.json')?.[message.method];
  log('fixture-account-requests.jsonl',{method:message.method,params:message.params||{},requestId:message.id});
  if(!response){send({id:message.id,error:{code:-32601,message:'Missing isolated account response'}});return true;}
  const reply={id:message.id,...(response.error?{error:response.error}:{result:response.result})};
  if(response.hold){
   if(!/^[a-z0-9-]+$/.test(response.hold))throw Error('Invalid account release gate');
   atomic('fixture-account-'+response.hold+'-held.json',{method:message.method,requestId:message.id});
   const timer=setInterval(()=>{
    try{fs.unlinkSync(file('fixture-account-'+response.hold+'-release'));}catch(error){if(error.code==='ENOENT')return;throw error;}
    clearInterval(timer);send(reply);atomic('fixture-account-'+response.hold+'-sent.json',{requestId:message.id});
   },20);
  }else send(reply);
  return true;
 };
};
