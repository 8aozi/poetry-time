const {test} = require('node:test');
const assert = require('node:assert/strict');
const {KEY, createStore} = require('../learning-store.js');
function memory(){const values=new Map();return {getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v)};}
const ids=Array.from({length:75},(_,i)=>`poem-${String(i+1).padStart(2,'0')}`);
test('Favorites persist independently of learning progress',()=>{
 const storage=memory();const store=createStore(ids,storage,()=> '2026-11-02T14:00:00.000Z');
 store.change('poem-01','favorite');assert.equal(store.summary().favorites,1);assert.equal(store.summary().learned,0);
 const reloaded=createStore(ids,storage);assert.equal(reloaded.get('poem-01').favorite,true);assert.equal(reloaded.get('poem-01').favoriteAt,'2026-11-02T14:00:00.000Z');
 reloaded.change('poem-01','favorite');assert.equal(reloaded.summary().favorites,0);assert.equal(reloaded.get('poem-01').favoriteAt,null);
});
test('Learning transitions record actual times, remain idempotent, and allow correction',()=>{
 let stamp='2026-11-02T14:00:00.000Z';const store=createStore(ids,memory(),()=>stamp);
 store.change('poem-01','status','learning');const start=store.get('poem-01').startedAt;
 assert.equal(store.summary().learning,1);assert.equal(store.summary().learned,0);
 stamp='2026-11-02T14:05:00.000Z';store.change('poem-01','status','learned');
 assert.equal(store.summary().learning,0);assert.equal(store.summary().learned,1);assert.equal(store.get('poem-01').learnedAt,stamp);
 stamp='2026-11-02T14:10:00.000Z';assert.equal(store.change('poem-01','status','learned').changed,false);
 assert.equal(store.get('poem-01').learnedAt,'2026-11-02T14:05:00.000Z');
 store.change('poem-01','status','learning');assert.equal(store.summary().learned,0);assert.equal(store.get('poem-01').startedAt,start);
 store.change('poem-01','status','unstarted');assert.equal(store.summary().learning,0);assert.equal(store.get('poem-01').changedAt,stamp);
 assert.equal(store.get('poem-01').learnedAt,'2026-11-02T14:05:00.000Z');
});
test('Marking learned directly and completing 75 poems never inflates total',()=>{
 const store=createStore(ids,memory());for(const id of ids){store.change(id,'status','learned');store.change(id,'status','learned');}
 assert.equal(store.summary().learned,75);assert.equal(store.summary().total,75);assert.ok(store.get('poem-01').startedAt);
 store.change('poem-75','status','unstarted');assert.equal(store.summary().learned,74);
});
test('Two tabs preserve unrelated records and explicitly reload external changes',()=>{
 const storage=memory(), a=createStore(ids,storage), b=createStore(ids,storage);
 a.change('poem-01','favorite');b.change('poem-02','status','learned');a.reload();
 assert.equal(a.summary().favorites,1);assert.equal(a.summary().learned,1);
});
test('Malformed records and blocked storage do not break reading or silently promise persistence',()=>{
 const bad=memory();bad.setItem(KEY,'{broken');const store=createStore(ids,bad);
 assert.ok(store.warning);assert.equal(store.summary().learned,0);store.change('poem-01','favorite');assert.equal(store.warning,'');
 const blocked=createStore(ids,{getItem:()=>null,setItem:()=>{throw new Error('QuotaExceededError');}});
 blocked.change('poem-01','status','learned');assert.equal(blocked.summary().learned,1);assert.ok(blocked.warning);
 blocked.change('poem-02','favorite');assert.equal(blocked.summary().learned,1);
 const absent=createStore(ids,null);absent.change('poem-01','favorite');assert.ok(absent.warning);
});
test('Unrecognized poems, statuses and invalid dates are excluded from persisted input',()=>{
 const storage=memory();storage.setItem(KEY,JSON.stringify({version:1,records:{'poem-01':{favorite:'yes',status:'wrong',startedAt:'<script>'},'poem-99':{status:'learned'}}}));
 const store=createStore(ids,storage);assert.deepEqual(store.get('poem-01'),{favorite:false,favoriteAt:null,status:'unstarted',startedAt:null,learnedAt:null,changedAt:null});
 assert.equal(store.summary().learned,0);assert.throws(()=>store.change('poem-99','status','learned'));assert.throws(()=>store.change('poem-01','status','other'));
});
