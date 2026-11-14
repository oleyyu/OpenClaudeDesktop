// Real PTY mouse consumer: no external service or application configuration.
process.stdin.setRawMode(true);
process.stdin.resume();
process.stdout.write('\x1b[?1000h\x1b[?1006h\r\nMOUSE_READY\r\n');
process.stdin.on('data',data=>{
 if(data.includes(113)||data.includes(3)){
  process.stdout.write('\x1b[?1000l\x1b[?1006l\r\nMOUSE_DONE\r\n');
  process.stdin.setRawMode(false);process.exit(0);
 }
 process.stdout.write('MOUSE_INPUT '+JSON.stringify(data.toString())+'\r\n');
});
