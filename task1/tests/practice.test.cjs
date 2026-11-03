const {test}=require('node:test');const assert=require('node:assert/strict');const vm=require('node:vm');const fs=require('node:fs');const path=require('node:path');
const api=require('../practice.js');const context={window:{}};vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../data/poems.js'),'utf8'),context);const poems=context.window.POEMS,bank=api.createBank(poems);
function memory(){const m=new Map();return {getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,v)};}
test('All 75 poems have previous/next/blank questions with valid source answers and unique IDs',()=>{
 assert.equal(new Set(bank.map(q=>q.id)).size,bank.length);
 for(const p of poems)for(const type of ['previous','next','blank'])assert.ok(bank.some(q=>q.poemId===p.id&&q.type===type),p.title+' '+type);
 for(const q of bank){const p=poems.find(p=>p.id===q.poemId);if(q.type==='blank'){assert.equal(q.before+q.answer+q.after,p.lines[q.lineIndex].text);assert.match(q.answer,/^\p{Script=Han}{1,2}$/u);}else{assert.equal(q.answer,p.lines[q.answerIndex].text);assert.equal(q.answerIndex,q.lineIndex+(q.type==='next'?1:-1));const options=api.choices(q,poems);assert.equal(options.length,4);assert.equal(new Set(options.map(api.normalize)).size,4);assert.equal(options.filter(o=>api.normalize(o)===api.normalize(q.answer)).length,1);}}
});
test('Practice selection obeys poem, type, pending IDs and round size',()=>{
 const selected=api.select(bank,{poemId:'poem-17',type:'blank'});assert.equal(selected.length,4);assert.ok(selected.every(q=>q.poemId==='poem-17'&&q.type==='blank'));
 const ids=bank.slice(0,3).map(q=>q.id);assert.equal(api.select(bank,{ids}).length,3);assert.equal(api.select(bank,{ids:[]}).length,0);assert.equal(api.select(bank).length,5);
});
test('Empty answers do not count, wrong answers create mistakes, corrections persist and stars are unique per question',()=>{
 let now='2026-11-02T15:00:00.000Z';const storage=memory(),s=api.createStore(bank,storage,()=>now),q=bank[0];
 assert.equal(s.submit(q.id,' ， ').empty,true);assert.equal(s.summary().attempts,0);
 s.submit(q.id,'答错了');assert.equal(s.summary().pendingPoems,1);assert.equal(s.summary().stars,0);assert.equal(s.mistakes()[0].lastWrongAnswer,'答错了');assert.equal(s.mistakes()[0].lastWrongAt,now);
 now='2026-11-02T15:05:00.000Z';let result=s.submit(q.id,' '+api.normalize(q.answer)+' ');assert.equal(result.correct,true);assert.equal(result.reward,1);assert.equal(s.summary().pending,0);assert.equal(s.mistakes()[0].correctedAt,now);assert.equal(s.mistakes()[0].lastWrongAnswer,'答错了');
 assert.equal(s.submit(q.id,q.answer).reward,0);const loaded=api.createStore(bank,storage);assert.equal(loaded.summary().stars,1);assert.equal(loaded.mistakes().length,1);
 loaded.submit(q.id,'又错了');assert.equal(loaded.summary().pending,1);assert.equal(loaded.mistakes()[0].correctedAt,null);assert.equal(loaded.submit(q.id,q.answer).reward,0);
});
test('A poem stays pending until every erroneous question is corrected',()=>{
 const s=api.createStore(bank,memory()),qs=bank.filter(q=>q.poemId==='poem-17').slice(0,2);
 qs.forEach(q=>s.submit(q.id,'错'));assert.equal(s.summary().pendingPoems,1);assert.equal(s.summary().pending,2);
 s.submit(qs[0].id,qs[0].answer);assert.equal(s.summary().pendingPoems,1);assert.equal(s.summary().pending,1);
 s.submit(qs[1].id,qs[1].answer);assert.equal(s.summary().pendingPoems,0);assert.equal(s.summary().mistakePoems,1);
});
test('Separate tabs cannot award another star for an already rewarded question',()=>{
 const storage=memory(),a=api.createStore(bank,storage),b=api.createStore(bank,storage),q=bank[0];assert.equal(a.submit(q.id,q.answer).reward,1);assert.equal(b.submit(q.id,q.answer).reward,0);a.reload();assert.equal(a.summary().stars,1);
});
test('Corrupt/blocked storage and unknown question IDs are handled',()=>{
 const storage=memory();storage.setItem(api.KEY,'broken');const s=api.createStore(bank,storage);assert.ok(s.warning);s.submit(bank[0].id,'错');assert.equal(s.warning,'');
 const b=api.createStore(bank,{getItem:()=>null,setItem:()=>{throw Error('blocked');}});b.submit(bank[0].id,'错');assert.ok(b.warning);b.submit(bank[1].id,bank[1].answer);assert.equal(b.summary().pending,1);assert.throws(()=>b.submit('fake','hi'));
});
