// Query actual xterm colors through a real PTY, attempt OSC writes, then query again.
process.stdin.setRawMode(true);process.stdin.resume();
let incoming='',pending=null;
process.stdin.on('data',data=>{
 incoming+=data.toString();let match;
 while((match=/\x1b\]([^\x1b]*)\x1b\\/.exec(incoming))){
  incoming=incoming.slice(match.index+match[0].length);
  if(pending){pending.values.push(match[1]);if(pending.values.length===4){const p=pending;pending=null;clearTimeout(p.timer);p.resolve(p.values);}}
 }
});
const osc=(code,data='')=>'\x1b]'+code+';'+data+'\x1b\\';
const query=()=>new Promise((resolve,reject)=>{
 pending={values:[],resolve,timer:setTimeout(()=>reject(Error('color query timeout')),4000)};
 process.stdout.write(osc(4,'1;?')+osc(10,'?')+osc(11,'?')+osc(12,'?'));
});
(async()=>{
 const before=await query();
 process.stdout.write(osc(4,'1;#102030')+osc(10,'#234567')+osc(11,'#345678')+osc(12,'#456789'));
 const afterSet=await query();
 process.stdout.write(osc(104)+osc(110)+osc(111)+osc(112));
 const afterReset=await query();
 process.stdout.write('\r\nCOLOR_POLICY '+JSON.stringify({before,afterSet,afterReset})+'\r\n');
 process.stdin.setRawMode(false);process.exit(0);
})().catch(error=>{process.stdout.write('\r\nCOLOR_ERROR '+error.message+'\r\n');process.stdin.setRawMode(false);process.exit(1);});
