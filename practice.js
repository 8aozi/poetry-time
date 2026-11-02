/* Local question bank and practice records, usable in browsers and Node tests. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.PoetryPractice=api;})(typeof window!=='undefined'?window:globalThis,function(){
  'use strict';
  const KEY='poetry-practice-v1';
  const normalize=value=>String(value).normalize('NFKC').replace(/[\s\p{P}]/gu,'');
  const han=char=>/\p{Script=Han}/u.test(char);
  const shuffle=(items,random=Math.random)=>{const out=[...items];for(let i=out.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[out[i],out[j]]=[out[j],out[i]];}return out;};
  function createBank(poems){
    const bank=[];
    const familiarWords=['明月','故乡','春风','白日','黄河','江南','白云','青山','千里','万里','儿童','桃花','莲叶','白毛','红掌','绿水','清波','二月','杨柳','春眠','啼鸟','风雨','花落','葡萄','美酒','琵琶','沙场','玉壶','青苔','阳关','兄弟','白玉','银河','轻舟','长江','两岸','黄鹂','白鹭','西岭','东吴','江山','燕子','鸳鸯','春雨','江水','枫林','牧童','杏花','慈母','游子','三春','白兔','桂树','桑阴','梅子','杏子','蜻蜓','荷花','西湖','东风','春色','秋风','小草','白莲','浮萍','云深','北风','雪花','万紫','千红','清白','苍苔','春烟','纸鸢','草长','莺飞'];
    for(const poem of poems){
      poem.lines.forEach((line,index)=>{
        for(const type of ['next','previous']){
          const answerIndex=index+(type==='next'?1:-1);
          if(!poem.lines[answerIndex])continue;
          bank.push({id:`${poem.id}:${type}:${index}`,poemId:poem.id,type,lineIndex:index,answerIndex,prompt:line.text,answer:poem.lines[answerIndex].text,translation:poem.lines[answerIndex].translation});
        }
        const chars=Array.from(line.text), positions=chars.map((c,i)=>han(c)?i:-1).filter(i=>i>=0);
        if(positions.length<2)return;
        const words=[...(poem.notes||[]).map(n=>n.word),...familiarWords].filter(w=>Array.from(w).length===2&&Array.from(w).every(han)&&line.text.includes(w));
        const word=words.length?words[index%words.length]:null;
        // Prefer real two-character words; otherwise blank one character, never an arbitrary cross-word pair.
        const size=word?2:1;
        const start=word?Array.from(line.text.slice(0,line.text.indexOf(word))).length:positions[Math.floor(positions.length/2)];
        const end=start+size;
        if(!chars.slice(start,end).every(han))return;
        const answer=chars.slice(start,end).join('');
        bank.push({id:`${poem.id}:blank:${index}:${start}:${size}`,poemId:poem.id,type:'blank',lineIndex:index,answerIndex:index,prompt:line.text,answer,translation:line.translation,before:chars.slice(0,start).join(''),after:chars.slice(end).join(''),size});
      });
    }
    return bank;
  }
  function choices(question,poems,random=Math.random){
    if(question.type==='blank')return [];
    const correct=normalize(question.answer), used=new Set([correct]), candidates=[];
    const lines=shuffle(poems.flatMap(p=>p.lines.map(l=>l.text)),random);
    // Similar-length real verses make plausible choices without inventing poetry.
    lines.sort((a,b)=>Math.abs(normalize(a).length-correct.length)-Math.abs(normalize(b).length-correct.length));
    for(const text of lines){const key=normalize(text);if(!used.has(key)){used.add(key);candidates.push(text);}if(candidates.length===3)break;}
    return shuffle([question.answer,...candidates],random);
  }
  function select(bank,{poemId=null,type='mixed',ids=null,limit=5,random=Math.random}={}){
    const allowed=ids?new Set(ids):null;
    return shuffle(bank.filter(q=>(!poemId||q.poemId===poemId)&&(type==='mixed'||q.type===type)&&(!allowed||allowed.has(q.id))),random).slice(0,limit);
  }
  function createStore(bank,storage,now=()=>new Date().toISOString()){
    const questions=new Map(bank.map(q=>[q.id,q]));
    let records={},failed=false,warning='';
    const count=v=>Number.isSafeInteger(v)&&v>=0?v:0;
    const date=v=>typeof v==='string'&&Number.isFinite(Date.parse(v))?new Date(v).toISOString():null;
    function read(){
      if(!storage)throw Error('Storage unavailable');
      const raw=storage.getItem(KEY);if(!raw)return {};
      const data=JSON.parse(raw);
      if(!data||data.version!==1||!data.records||typeof data.records!=='object'||Array.isArray(data.records))throw Error('Invalid records');
      const clean={};
      for(const [id,r] of Object.entries(data.records)){
        if(!questions.has(id)||!r||typeof r!=='object')continue;
        clean[id]={attempts:count(r.attempts),wrongCount:count(r.wrongCount),earned:r.earned===true,
          pending:r.pending===true&&count(r.wrongCount)>0,lastAnswer:typeof r.lastAnswer==='string'?r.lastAnswer.slice(0,200):'',
          lastWrongAnswer:typeof r.lastWrongAnswer==='string'?r.lastWrongAnswer.slice(0,200):'',
          firstWrongAt:date(r.firstWrongAt),lastWrongAt:date(r.lastWrongAt),correctedAt:date(r.correctedAt),lastAttemptAt:date(r.lastAttemptAt)};
      }
      return clean;
    }
    function reload(){try{records=read();warning='';failed=false;}catch{warning='暂时无法读取练习记录；本次仍可练习，记录可能无法保留。';failed=true;}}
    function save(){try{if(!storage)throw Error('Storage unavailable');storage.setItem(KEY,JSON.stringify({version:1,records}));warning='';failed=false;}catch{warning='练习记录暂时只保留在本次页面中，刷新后可能丢失。';failed=true;}}
    function get(id){return records[id]?{...records[id]}:null;}
    function submit(id,answer){
      const q=questions.get(id);if(!q)throw Error('Unknown question');
      const text=String(answer).trim().slice(0,200);
      if(!normalize(text))return {empty:true};
      if(!failed){try{records=read();}catch{failed=true;}}
      const r=get(id)||{attempts:0,wrongCount:0,earned:false,pending:false,lastAnswer:'',lastWrongAnswer:'',firstWrongAt:null,lastWrongAt:null,correctedAt:null,lastAttemptAt:null};
      const correct=normalize(text)===normalize(q.answer),reward=correct&&!r.earned?1:0;
      const stamp=now();r.attempts++;r.lastAnswer=text;r.lastAttemptAt=stamp;
      if(correct){r.earned=true;r.pending=false;if(r.wrongCount)r.correctedAt=stamp;}
      else{r.wrongCount++;r.pending=true;r.lastWrongAnswer=text;r.firstWrongAt=r.firstWrongAt||stamp;r.lastWrongAt=stamp;r.correctedAt=null;}
      records[id]=r;save();return {correct,reward,record:{...r}};
    }
    function mistakes(){return Object.entries(records).filter(([,r])=>r.wrongCount>0).map(([id,r])=>({question:questions.get(id),...r})).sort((a,b)=>Number(b.pending)-Number(a.pending)||(b.lastWrongAt||'').localeCompare(a.lastWrongAt||''));}
    function summary(){const errors=mistakes();return {stars:Object.values(records).filter(r=>r.earned).length,attempts:Object.values(records).reduce((n,r)=>n+r.attempts,0),pending:errors.filter(r=>r.pending).length,pendingPoems:new Set(errors.filter(r=>r.pending).map(r=>r.question.poemId)).size,mistakePoems:new Set(errors.map(r=>r.question.poemId)).size};}
    reload();return {get,submit,reload,mistakes,summary,get warning(){return warning;}};
  }
  return {KEY,normalize,shuffle,createBank,choices,select,createStore};
});
