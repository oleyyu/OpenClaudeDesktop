import test from 'node:test';
import assert from 'node:assert/strict';
import { createSideChatGeometryStore, SIDE_CHAT_GEOMETRY_KEY } from '../src/side-chat-geometry-store.mjs';
import { sideChatRect } from '../src/side-chat-geometry.mjs';
const rectangle={left:700,top:300,width:400,height:340,viewport:{width:1200,height:820}};
function memoryStorage(){const data=new Map();return {getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,value)};}
test('source key persists geometry alone and restores it for a fresh store/viewport',()=>{
  const storage=memoryStorage(),first=createSideChatGeometryStore({storage});assert.equal(first.get(),null);
  first.set({...rectangle,secret:'not geometry'});assert.deepEqual(JSON.parse(storage.getItem(SIDE_CHAT_GEOMETRY_KEY)),rectangle);
  const restored=createSideChatGeometryStore({storage});assert.deepEqual(restored.get(),rectangle);
  assert.deepEqual(sideChatRect({saved:restored.get(),viewport:{width:1000,height:720}}),{left:500,top:200,width:400,height:340});
});
test('source parser rejects malformed/nonfinite rectangle and strips invalid optional viewport',()=>{
  const storage=memoryStorage();for(const value of ['no json','null','[]','{"left":1,"top":2,"width":"400","height":340}']){
    storage.setItem(SIDE_CHAT_GEOMETRY_KEY,value);assert.equal(createSideChatGeometryStore({storage}).get(),null);
  }
  storage.setItem(SIDE_CHAT_GEOMETRY_KEY,JSON.stringify({...rectangle,viewport:{width:'bad',height:820}}));
  const {viewport,...expected}=rectangle;assert.deepEqual(createSideChatGeometryStore({storage}).get(),expected);
});
test('unavailable storage retains current in-memory rectangle without breaking drag completion',()=>{
  const store=createSideChatGeometryStore({storage:{getItem(){throw Error('blocked');},setItem(){throw Error('full');}}});
  assert.equal(store.get(),null);store.set(rectangle);assert.deepEqual(store.get(),rectangle);
});
