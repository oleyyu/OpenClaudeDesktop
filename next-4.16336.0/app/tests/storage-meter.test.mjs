import test from 'node:test';
import assert from 'node:assert/strict';
import {storageReadout,storageMeterGeometry,storagePercent,storageKinds,KIND_OPACITY_RAMP} from '../src/storage-meter-model.mjs';
const format=value=>`${value} B`;
test('storage readouts retain all categories and actual proportions including empty/unavailable sizes',()=>{
 const data=storageReadout([{id:'app',label:'App',bytes:25},{id:'code',label:'Code',bytes:75},{id:'zero',label:'Empty',bytes:0}],format,'en-US');
 assert.deepEqual(data.map(x=>x.readout),['App: 25 B, 25%','Code: 75 B, 75%','Empty: 0 B, 0%']);
 assert.deepEqual(storageReadout([NaN,Infinity,-5].map((bytes,i)=>({id:i,label:String(i),bytes})),format,'en-US').map(x=>[x.amount,x.share]),[[0,0],[0,0],[0,0]]);
 assert.equal(storageReadout([{label:'a',bytes:1},{label:'b',bytes:2}],format,'en-US')[0].readout,'a: 1 B, 33%');
 assert.equal(storagePercent(1/3),33.333);
});
test('meter geometry preserves tiny shares without giving them misleading minimum widths',()=>{
 const entries=[.0001,.5,.0001,.4998].map(share=>({share}));
 const wide=storageMeterGeometry(entries,100);
 assert.equal(wide.kind,'segments');assert.deepEqual(wide.segments.map(x=>x.index),[1,3]);
 assert.equal(wide.segments[0].start,.0001);assert.equal(wide.segments[1].start,.5002);
 assert.equal(wide.segments[1].seam,1);assert.equal(wide.segments[0].startRadius,4);assert.equal(wide.segments[0].endRadius,2);assert.equal(wide.segments[1].endRadius,4);
 assert.equal(storageMeterGeometry(entries,4).kind,'dot');assert.equal(storageMeterGeometry(entries,4).index,1);
 assert.equal(storageMeterGeometry([{share:0}],100).kind,'empty');
 assert.equal(storageMeterGeometry([{share:1}],8).kind,'segments');
});
test('meter allocation across widths never overlaps, exceeds the actual category share, or changes the largest dot category',()=>{
 const entries=[.01,.09,.2,.7].map(share=>({share}));
 for(const width of [0,1,4,8,20,100,400,720]){
  const result=storageMeterGeometry(entries,width);
  if(result.kind==='dot'){assert.equal(result.index,3);continue;}
  let end=0;
  for(const segment of result.segments){const start=segment.start*width+segment.seam,length=segment.share*width-segment.seam;assert.ok(start>=end);assert.ok(length>=1);assert.ok(length<=entries[segment.index].share*width);end=start+length;}
  assert.ok(end<=width+1e-9);
 }
});

// Fidelity F14: c71860c77-B72Ova_w X with et=[1,.72,.5,.32,.2].
test('kind bars paint counted kinds on the opacity ramp, muted and outside kinds in the muted colour, and keep outside kinds out of the bar',()=>{
 assert.deepEqual(KIND_OPACITY_RAMP,[1,.72,.5,.32,.2]);
 const items=[{id:'history',bytes:30},{id:'empty',bytes:0},{id:'worktrees',bytes:10},{id:'other',bytes:5,muted:true},{id:'a',bytes:1},{id:'b',bytes:1},{id:'c',bytes:1},{id:'d',bytes:1},{id:'outside',bytes:18,outside:true}];
 const result=storageKinds(items,{color:'C',mutedColor:'M'});
 assert.deepEqual(result.items.map(item=>[item.id,item.paint.backgroundColor,item.paint.opacity]),[['history','C',1],['worktrees','C',.72],['other','M',1],['a','C',.5],['b','C',.32],['c','C',.2],['d','C',.2],['outside','M',1]]);
 assert.equal(result.total,49,'the outside kind is not counted');
 assert.deepEqual(result.bar.map(item=>item.id),['history','worktrees','other','a','b','c','d']);
 assert.ok(Math.abs(result.bar.reduce((sum,item)=>sum+item.width,0)-100)<1e-9);assert.ok(Math.abs(result.bar[0].width-30/49*100)<1e-9);
 const outsideOnly=storageKinds([{id:'h',bytes:0},{id:'o',bytes:18,outside:true}],{color:'C',mutedColor:'M'});
 assert.equal(outsideOnly.total,0);assert.deepEqual(outsideOnly.bar,[]);assert.deepEqual(outsideOnly.items.map(item=>item.id),['o']);
 assert.deepEqual(storageKinds([{id:'h',bytes:0}],{color:'C',mutedColor:'M'}),{items:[],bar:[],total:0});
});
